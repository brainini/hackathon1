import "server-only";
import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { RedisEnv } from "../env";
import { nameKey } from "../text";
import {
  applyPatch,
  byEntryNo,
  defaultMeta,
  nonNull,
  parseBallot,
  parseCandidate,
  parseMeta,
  StoreConflict,
  type Meta,
  type Store,
} from "./types";

/**
 * Upstash Redis store (production). Layout (all keys `${prefix}:`):
 *   meta (JSON) · candidates (hash id → JSON) · ballots (hash voterId → JSON) · names (hash nameKey → "id:claimedAt")
 *   img:<id> (data URL) · version (INCR per mutation) · entrySeq (INCR, entry numbers) · secret · fail:<scope>:<key>
 * Values are JSON strings we (de)serialise ourselves — automaticDeserialization is OFF on purpose.
 */

/** A name claim whose candidate never appeared is considered abandoned after this long. */
const CLAIM_STALE_MS = 60_000;

function toStr(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function toNum(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** HGETALL → [field, value] pairs. Raw replies are flat arrays; objects are tolerated too. */
function hashValues(value: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i + 1 < value.length; i += 2) {
      const v = toStr(value[i + 1]);
      if (v !== null) out.push(v);
    }
  } else if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) out.push(typeof v === "string" ? v : JSON.stringify(v));
  }
  return out;
}

function parseClaim(raw: unknown): { id: string; at: number } | null {
  const s = toStr(raw);
  if (!s) return null;
  const sep = s.indexOf(":");
  return sep < 0 ? { id: s, at: 0 } : { id: s.slice(0, sep), at: Number(s.slice(sep + 1)) || 0 };
}

export function createRedisStore(env: RedisEnv, prefix: string): Store {
  const redis = new Redis({
    url: env.url,
    token: env.token,
    automaticDeserialization: false,
    enableAutoPipelining: false,
    enableTelemetry: false,
  });

  const key = (name: string) => `${prefix}:${name}`;
  const K = {
    meta: key("meta"),
    candidates: key("candidates"),
    ballots: key("ballots"),
    names: key("names"),
    version: key("version"),
    entrySeq: key("entrySeq"),
    secret: key("secret"),
  };
  const imgKey = (id: string) => key(`img:${id}`);
  const failKey = (k: string) => key(`fail:${k}`);

  async function initMeta(): Promise<Meta> {
    const fresh = defaultMeta(Date.now());
    const p = redis.pipeline();
    p.set(K.meta, JSON.stringify(fresh), { nx: true });
    p.get(K.meta);
    const [, stored] = (await p.exec()) as unknown[];
    return parseMeta(stored) ?? fresh;
  }

  /**
   * Atomically claims a normalised name for `id` via HSETNX. A claim whose owner no longer exists
   * (and is older than CLAIM_STALE_MS) is taken over. Optionally enforces the participant cap.
   */
  async function claimName(nk: string, id: string, maxCandidates?: number): Promise<void> {
    const claim = `${id}:${Date.now()}`;
    const p = redis.pipeline();
    p.hsetnx(K.names, nk, claim);
    p.hget(K.names, nk);
    p.hlen(K.candidates);
    const [setRaw, ownerRaw, countRaw] = (await p.exec()) as unknown[];

    let claimed = toNum(setRaw) === 1;
    if (!claimed) {
      const owner = parseClaim(ownerRaw);
      if (owner && owner.id !== id) {
        const alive = toNum(await redis.hexists(K.candidates, owner.id)) === 1;
        if (alive || Date.now() - owner.at < CLAIM_STALE_MS) throw new StoreConflict("name_taken");
        await redis.hset(K.names, { [nk]: claim });
        claimed = true;
      }
    }
    if (maxCandidates !== undefined && toNum(countRaw) >= maxCandidates) {
      if (claimed) await releaseName(nk);
      throw new StoreConflict("too_many");
    }
  }

  async function releaseName(nk: string): Promise<void> {
    await redis.hdel(K.names, nk).catch(() => undefined);
  }

  return {
    kind: "redis",

    async getVersion() {
      return toNum(await redis.get(K.version));
    },

    async getSnapshot() {
      // One atomic round trip; version first so a reader can never pair new data with a newer version.
      const tx = redis.multi();
      tx.get(K.version);
      tx.get(K.meta);
      tx.hgetall(K.candidates);
      tx.hgetall(K.ballots);
      const [version, meta, candidates, ballots] = (await tx.exec()) as unknown[];
      return {
        version: toNum(version),
        meta: parseMeta(meta) ?? (await initMeta()),
        candidates: hashValues(candidates).map(parseCandidate).filter(nonNull).sort(byEntryNo),
        ballots: hashValues(ballots).map(parseBallot).filter(nonNull),
      };
    },

    async getImage(id) {
      return toStr(await redis.get(imgKey(id)));
    },

    async getSecret() {
      const p = redis.pipeline();
      p.set(K.secret, randomBytes(32).toString("base64url"), { nx: true });
      p.get(K.secret);
      const [, raw] = (await p.exec()) as unknown[];
      const secret = toStr(raw);
      if (!secret) throw new Error("[twopick] could not read the signing secret from Redis");
      return secret;
    },

    async insertCandidate(rec, image, maxCandidates) {
      const nk = nameKey(rec.name);
      await claimName(nk, rec.id, maxCandidates);
      try {
        const entryNo = toNum(await redis.incr(K.entrySeq));
        const full = { ...rec, entryNo };
        const tx = redis.multi();
        if (image) tx.set(imgKey(image.id), image.dataUrl);
        tx.hset(K.candidates, { [full.id]: JSON.stringify(full) });
        tx.incr(K.version);
        await tx.exec();
        return full;
      } catch (err) {
        await releaseName(nk);
        throw err;
      }
    },

    async updateCandidate(id, patch, image) {
      const current = parseCandidate(await redis.hget(K.candidates, id));
      if (!current) return null;
      const next = applyPatch(current, patch);
      const oldKey = nameKey(current.name);
      const newKey = nameKey(next.name);
      const renamed = oldKey !== newKey;
      if (renamed) await claimName(newKey, id);
      const oldImage = current.imageId && current.imageId !== next.imageId ? current.imageId : null;
      try {
        const tx = redis.multi();
        if (image) tx.set(imgKey(image.id), image.dataUrl);
        tx.hset(K.candidates, { [id]: JSON.stringify(next) });
        if (renamed) tx.hdel(K.names, oldKey);
        if (oldImage) tx.del(imgKey(oldImage));
        tx.incr(K.version);
        await tx.exec();
      } catch (err) {
        if (renamed) await releaseName(newKey);
        throw err;
      }
      return next;
    },

    async deleteCandidate(id) {
      const current = parseCandidate(await redis.hget(K.candidates, id));
      if (!current) return null;
      const tx = redis.multi();
      tx.hdel(K.candidates, id);
      tx.hdel(K.ballots, id);
      tx.hdel(K.names, nameKey(current.name));
      if (current.imageId) tx.del(imgKey(current.imageId));
      tx.incr(K.version);
      await tx.exec();
      return current;
    },

    async putBallots(ballots) {
      if (ballots.length === 0) return;
      const tx = redis.multi();
      tx.hset(K.ballots, Object.fromEntries(ballots.map((b) => [b.voterId, JSON.stringify(b)])));
      tx.incr(K.version);
      await tx.exec();
    },

    async setMeta(meta) {
      const tx = redis.multi();
      tx.set(K.meta, JSON.stringify(meta));
      tx.incr(K.version);
      await tx.exec();
    },

    async resetBallots(meta) {
      const tx = redis.multi();
      tx.del(K.ballots);
      tx.set(K.meta, JSON.stringify(meta));
      tx.incr(K.version);
      await tx.exec();
    },

    async resetAll(meta) {
      const candidates = hashValues(await redis.hgetall(K.candidates)).map(parseCandidate).filter(nonNull);
      const imageKeys = candidates.map((c) => c.imageId).filter(nonNull).map(imgKey);
      const tx = redis.multi();
      tx.del(K.candidates, K.ballots, K.names, K.entrySeq, ...imageKeys);
      tx.set(K.meta, JSON.stringify(meta));
      tx.incr(K.version);
      await tx.exec();
    },

    async hit(k, windowSec) {
      // Fixed window: create the counter with a TTL only if missing, then increment (TTL preserved).
      const tx = redis.multi();
      tx.set(failKey(k), 0, { ex: windowSec, nx: true });
      tx.incr(failKey(k));
      const [, count] = (await tx.exec()) as unknown[];
      return toNum(count);
    },

    async peekHits(k) {
      return toNum(await redis.get(failKey(k)));
    },

    async clearHits(k) {
      await redis.del(failKey(k));
    },
  };
}
