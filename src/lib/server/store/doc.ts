import "server-only";
import { randomBytes } from "node:crypto";
import type { StorageKind } from "@/lib/types";
import { nameKey } from "../text";
import {
  applyPatch,
  byEntryNo,
  defaultMeta,
  parseBallot,
  parseCandidate,
  parseMeta,
  StoreConflict,
  type BallotRecord,
  type CandidateRecord,
  type ImageWrite,
  type Meta,
  type NewCandidate,
  type Snapshot,
  type Store,
} from "./types";

/**
 * Shared implementation of the "whole state in one document" stores (file + memory).
 * Every read and write runs through a promise-chain mutex, so check-then-write is atomic
 * within the process (name uniqueness, participant cap, entry numbers).
 */

export interface Doc {
  version: number;
  meta: Meta;
  entrySeq: number;
  candidates: Record<string, CandidateRecord>;
  ballots: Record<string, BallotRecord>;
  secret: string;
}

export interface DocBackend {
  readonly kind: Exclude<StorageKind, "redis">;
  /** The raw stored document, or null when nothing has been saved yet. */
  load(): Promise<unknown>;
  save(doc: Doc): Promise<void>;
  readImage(id: string): Promise<string | null>;
  writeImage(id: string, dataUrl: string): Promise<void>;
  deleteImage(id: string): Promise<void>;
  clearImages(): Promise<void>;
}

interface Shared {
  locks: Map<string, Promise<void>>;
  hits: Map<string, { count: number; resetAt: number }>;
}

/** Survives dev hot reloads (module re-evaluation) — one mutex per store location. */
function shared(): Shared {
  const g = globalThis as typeof globalThis & { __twopickDocShared?: Shared };
  g.__twopickDocShared ??= { locks: new Map(), hits: new Map() };
  return g.__twopickDocShared;
}

function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Null-prototype map: ids like "__proto__" / "constructor" can never hit Object.prototype. */
function emptyMap<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/** Own-property lookup (defence in depth on top of the null prototype). */
function own<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function normalizeDoc(raw: unknown, now: number): { doc: Doc; dirty: boolean } {
  if (!isObject(raw)) {
    return {
      doc: {
        version: 0,
        meta: defaultMeta(now),
        entrySeq: 0,
        candidates: emptyMap(),
        ballots: emptyMap(),
        secret: newSecret(),
      },
      dirty: true,
    };
  }
  const candidates = emptyMap<CandidateRecord>();
  for (const value of isObject(raw.candidates) ? Object.values(raw.candidates) : []) {
    const rec = parseCandidate(value);
    if (rec) candidates[rec.id] = rec;
  }
  const ballots = emptyMap<BallotRecord>();
  for (const value of isObject(raw.ballots) ? Object.values(raw.ballots) : []) {
    const ballot = parseBallot(value);
    if (ballot) ballots[ballot.voterId] = ballot;
  }
  const meta = parseMeta(raw.meta);
  const secret = typeof raw.secret === "string" && raw.secret.length >= 16 ? raw.secret : null;
  const maxEntry = Math.max(0, ...Object.values(candidates).map((c) => c.entryNo));
  const entrySeq = typeof raw.entrySeq === "number" && Number.isFinite(raw.entrySeq) ? raw.entrySeq : 0;
  return {
    doc: {
      version: typeof raw.version === "number" && Number.isFinite(raw.version) ? raw.version : 0,
      meta: meta ?? defaultMeta(now),
      entrySeq: Math.max(entrySeq, maxEntry),
      candidates,
      ballots,
      secret: secret ?? newSecret(),
    },
    dirty: !meta || !secret,
  };
}

interface TxResult<T> {
  value: T;
  write: boolean;
  /** Runs inside the lock after a successful save. */
  after?: () => Promise<void>;
}

export function createDocStore(backend: DocBackend, lockId: string): Store {
  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const s = shared();
    const previous = s.locks.get(lockId) ?? Promise.resolve();
    const run = previous.then(fn);
    s.locks.set(
      lockId,
      run.then(
        () => undefined,
        () => undefined,
      ),
    );
    return run;
  }

  async function loadDoc(): Promise<Doc> {
    const { doc, dirty } = normalizeDoc(await backend.load(), Date.now());
    if (dirty) await backend.save(doc);
    return doc;
  }

  function read<T>(fn: (doc: Doc) => T): Promise<T> {
    return withLock(async () => fn(await loadDoc()));
  }

  function transact<T>(fn: (doc: Doc) => Promise<TxResult<T>> | TxResult<T>): Promise<T> {
    return withLock(async () => {
      const doc = await loadDoc();
      const result = await fn(doc);
      if (result.write) {
        doc.version += 1;
        await backend.save(doc);
        if (result.after) await result.after();
      }
      return result.value;
    });
  }

  function hitKey(key: string): string {
    return `${lockId}|${key}`;
  }

  return {
    kind: backend.kind,

    getVersion: () => read((doc) => doc.version),

    getSnapshot: () =>
      read(
        (doc): Snapshot => ({
          version: doc.version,
          meta: doc.meta,
          candidates: Object.values(doc.candidates).sort(byEntryNo),
          ballots: Object.values(doc.ballots),
        }),
      ),

    getImage: (id) => backend.readImage(id),

    getSecret: () => read((doc) => doc.secret),

    insertCandidate: (rec: NewCandidate, image: ImageWrite | null, maxCandidates: number) =>
      transact(async (doc) => {
        const all = Object.values(doc.candidates);
        if (all.length >= maxCandidates) throw new StoreConflict("too_many");
        const key = nameKey(rec.name);
        if (all.some((c) => nameKey(c.name) === key)) throw new StoreConflict("name_taken");
        if (image) await backend.writeImage(image.id, image.dataUrl);
        doc.entrySeq += 1;
        const full: CandidateRecord = { ...rec, entryNo: doc.entrySeq };
        doc.candidates[full.id] = full;
        return { value: full, write: true };
      }),

    async updateCandidate(id, patch, image) {
      const out = await transact(async (doc) => {
        const current = own(doc.candidates, id);
        if (!current) return { value: null, write: false };
        const next = applyPatch(current, patch);
        const key = nameKey(next.name);
        if (key !== nameKey(current.name)) {
          const clash = Object.values(doc.candidates).some((c) => c.id !== id && nameKey(c.name) === key);
          if (clash) throw new StoreConflict("name_taken");
        }
        if (image) await backend.writeImage(image.id, image.dataUrl);
        doc.candidates[id] = next;
        const oldImage = current.imageId && current.imageId !== next.imageId ? current.imageId : null;
        return { value: { next, oldImage }, write: true };
      });
      if (!out) return null;
      if (out.oldImage) await backend.deleteImage(out.oldImage).catch(() => undefined);
      return out.next;
    },

    async deleteCandidate(id) {
      const removed = await transact(async (doc) => {
        const current = own(doc.candidates, id);
        if (!current) return { value: null, write: false };
        delete doc.candidates[id];
        delete doc.ballots[id];
        return { value: current, write: true };
      });
      if (removed?.imageId) await backend.deleteImage(removed.imageId).catch(() => undefined);
      return removed;
    },

    putBallots: (ballots) =>
      transact(async (doc) => {
        for (const ballot of ballots) doc.ballots[ballot.voterId] = ballot;
        return { value: undefined, write: ballots.length > 0 };
      }),

    setMeta: (meta) =>
      transact(async (doc) => {
        doc.meta = meta;
        return { value: undefined, write: true };
      }),

    resetBallots: (meta) =>
      transact(async (doc) => {
        doc.ballots = emptyMap();
        doc.meta = meta;
        return { value: undefined, write: true };
      }),

    resetAll: (meta) =>
      transact(async (doc) => {
        doc.candidates = emptyMap();
        doc.ballots = emptyMap();
        doc.entrySeq = 0;
        doc.meta = meta;
        return { value: undefined, write: true, after: () => backend.clearImages() };
      }),

    async hit(key, windowSec) {
      const { hits } = shared();
      const now = Date.now();
      if (hits.size > 2000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      const current = hits.get(hitKey(key));
      const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowSec * 1000 };
      entry.count += 1;
      hits.set(hitKey(key), entry);
      return entry.count;
    },

    async peekHits(key) {
      const entry = shared().hits.get(hitKey(key));
      return entry && entry.resetAt > Date.now() ? entry.count : 0;
    },

    async clearHits(key) {
      shared().hits.delete(hitKey(key));
    },
  };
}
