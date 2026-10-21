import "server-only";
import type { z } from "zod";
import { LIMITS } from "@/lib/constants";
import type { MeResponse, StateResponse, VoteResponse } from "@/lib/types";
import { hashPin, pinMatches, readVoterId } from "./auth";
import { Err } from "./errors";
import { effectiveVotes, tallyBallots } from "./results";
import {
  getStore,
  StoreConflict,
  type CandidatePatch,
  type CandidateRecord,
  type ImageWrite,
  type Snapshot,
} from "./store";
import { nameKey, newId } from "./text";
import {
  decodeStoredImage,
  parseImageDataUrl,
  type loginSchema,
  type registerSchema,
  type updateMeSchema,
} from "./validation";
import { buildPublicState, meInfo, toPublicCandidate } from "./views";

/** Participant use-cases. Every mutation goes through the store (which bumps `version`). */

export const PIN_MAX_FAILS = 8;
export const FAIL_WINDOW_SEC = 600;

export type RegisterBody = z.output<typeof registerSchema>;
export type UpdateMeBody = z.output<typeof updateMeSchema>;
export type LoginBody = z.output<typeof loginSchema>;

/** Editable fields shared by PATCH /api/me and the admin edit. `image: string` = new upload. */
export interface CandidateEdit {
  name?: string;
  title?: string;
  description?: string;
  link?: string | null;
  emoji?: string;
  color?: CandidateRecord["color"];
  image?: string | null;
}

export function mapStoreConflict(err: unknown): never {
  if (err instanceof StoreConflict) {
    throw err.reason === "name_taken" ? Err.nameTaken() : Err.tooManyCandidates();
  }
  throw err;
}

function nameClash(snap: Snapshot, name: string, exceptId?: string): boolean {
  const key = nameKey(name);
  return snap.candidates.some((c) => c.id !== exceptId && nameKey(c.name) === key);
}

/** Diff an edit against the current record. `patch` is null when nothing changes. */
export function buildPatch(
  current: CandidateRecord,
  edit: CandidateEdit,
  snap: Snapshot,
): { patch: CandidatePatch | null; image: ImageWrite | null } {
  const patch: CandidatePatch = {};
  if (edit.name !== undefined && edit.name !== current.name) {
    if (nameClash(snap, edit.name, current.id)) throw Err.nameTaken();
    patch.name = edit.name;
  }
  if (edit.title !== undefined && edit.title !== current.title) patch.title = edit.title;
  if (edit.description !== undefined && edit.description !== current.description) {
    patch.description = edit.description;
  }
  if (edit.link !== undefined && edit.link !== current.link) patch.link = edit.link;
  if (edit.emoji !== undefined && edit.emoji !== current.emoji) patch.emoji = edit.emoji;
  if (edit.color !== undefined && edit.color !== current.color) patch.color = edit.color;

  let image: ImageWrite | null = null;
  if (edit.image === null || edit.image === "") {
    if (current.imageId) patch.imageId = null;
  } else if (typeof edit.image === "string") {
    // Every upload gets a fresh id: image URLs are cached forever (immutable).
    image = { id: newId(), dataUrl: parseImageDataUrl(edit.image).dataUrl };
    patch.imageId = image.id;
  }

  if (Object.keys(patch).length === 0) return { patch: null, image: null };
  patch.updatedAt = Date.now();
  return { patch, image };
}

/* ─────────────────────────────── queries ─────────────────────────────── */

/** GET /api/state — `since` equal to the current version costs a single read. */
export async function getPublicState(since: string | null): Promise<StateResponse> {
  const store = getStore();
  if (since !== null && /^\d{1,15}$/.test(since)) {
    const version = await store.getVersion();
    if (version === Number(since)) return { unchanged: true, version, serverTime: Date.now() };
  }
  const [snap, meId] = await Promise.all([store.getSnapshot(), readVoterId()]);
  return buildPublicState(snap, store.kind, meId, Date.now());
}

/** GET /api/images/[id] — stored screenshot as bytes, or null. */
export async function readImage(id: string): Promise<{ contentType: string; bytes: Buffer } | null> {
  const stored = await getStore().getImage(id);
  return stored ? decodeStoredImage(stored) : null;
}

/* ─────────────────────────────── mutations ─────────────────────────────── */

export async function registerCandidate(input: RegisterBody): Promise<MeResponse> {
  const store = getStore();
  const snap = await store.getSnapshot();
  if (snap.meta.phase !== "registration") throw Err.registrationClosed(snap.meta.phase);
  if (snap.candidates.length >= LIMITS.maxCandidates) throw Err.tooManyCandidates();
  if (nameClash(snap, input.name)) throw Err.nameTaken();

  const image: ImageWrite | null = input.image
    ? { id: newId(), dataUrl: parseImageDataUrl(input.image).dataUrl }
    : null;
  const id = newId();
  const now = Date.now();
  const rec = await store
    .insertCandidate(
      {
        id,
        name: input.name,
        title: input.title,
        description: input.description,
        link: input.link ?? null,
        emoji: input.emoji,
        color: input.color,
        imageId: image?.id ?? null,
        pinHash: await hashPin(id, input.pin),
        createdAt: now,
        updatedAt: now,
      },
      image,
      LIMITS.maxCandidates,
    )
    .catch(mapStoreConflict);

  return {
    me: { id: rec.id, name: rec.name, picks: null, votedAt: null },
    candidate: toPublicCandidate(rec, false),
  };
}

/** PATCH /api/me — own entry, registration phase only. */
export async function updateMe(voterId: string | null, edit: UpdateMeBody): Promise<MeResponse> {
  if (!voterId) throw Err.voterRequired();
  const store = getStore();
  const snap = await store.getSnapshot();
  const current = snap.candidates.find((c) => c.id === voterId);
  if (!current) throw Err.voterRequired();
  if (snap.meta.phase !== "registration") throw Err.editLocked();

  const tally = tallyBallots(snap.candidates, snap.ballots);
  const { patch, image } = buildPatch(current, edit, snap);
  const rec = patch
    ? await store.updateCandidate(current.id, patch, image).catch(mapStoreConflict)
    : current;
  if (!rec) throw Err.voterRequired();
  return { me: meInfo(rec, tally), candidate: toPublicCandidate(rec, tally.valid.has(rec.id)) };
}

/** POST /api/login — PIN check with a per-candidate failure limit (8 per 10 minutes). */
export async function login(input: LoginBody): Promise<MeResponse> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const rec = snap.candidates.find((c) => c.id === input.candidateId);
  if (!rec) throw Err.candidateNotFound();

  const failKey = `pin:${rec.id}`;
  const fails = await store.peekHits(failKey);
  if (fails >= PIN_MAX_FAILS) throw Err.pinLocked();
  if (!(await pinMatches(rec.id, input.pin, rec.pinHash))) {
    const remaining = PIN_MAX_FAILS - (await store.hit(failKey, FAIL_WINDOW_SEC));
    if (remaining <= 0) throw Err.pinLocked();
    throw Err.wrongPin(remaining);
  }
  if (fails > 0) await store.clearHits(failKey);

  const tally = tallyBallots(snap.candidates, snap.ballots);
  return { me: meInfo(rec, tally), candidate: toPublicCandidate(rec, tally.valid.has(rec.id)) };
}

/** POST /api/vote — exactly `effectiveVotes` distinct existing ids, never your own. */
export async function castVote(voterId: string | null, picks: string[]): Promise<VoteResponse> {
  if (!voterId) throw Err.voterRequired();
  const store = getStore();
  const snap = await store.getSnapshot();
  const me = snap.candidates.find((c) => c.id === voterId);
  if (!me) throw Err.voterRequired();
  if (snap.meta.phase !== "voting") throw Err.votingNotOpen(snap.meta.phase);

  const required = effectiveVotes(snap.meta.settings.votesPerVoter, snap.candidates.length);
  if (required === 0) throw Err.nothingToVoteFor();
  if (picks.includes(me.id)) throw Err.selfVote();
  if (new Set(picks).size !== picks.length) {
    throw Err.invalidPicks("같은 작품에 티켓 두 장은 안 돼요 🙅 서로 다른 작품을 골라주세요");
  }
  const ids = new Set(snap.candidates.map((c) => c.id));
  if (picks.some((id) => !ids.has(id))) {
    throw Err.invalidPicks("목록에 없는 작품이 섞여 있어요 🤔 새로고침 후 다시 골라주세요");
  }
  if (picks.length !== required) {
    throw Err.invalidPicks(`티켓 ${required}장을 모두 써주세요 🎟️ (지금 ${picks.length}장)`);
  }

  const previous = tallyBallots(snap.candidates, snap.ballots).valid.get(me.id);
  // Locked ballots stay locked — unless they lost tickets because a picked entry was deleted.
  if (previous && !snap.meta.settings.allowVoteChange && previous.picks.length >= required) {
    throw Err.alreadyVoted();
  }

  const now = Date.now();
  await store.putBallots([
    // createdAt survives re-votes: "⚡ fastest voter" is about who voted first.
    { voterId: me.id, picks, createdAt: previous?.ballot.createdAt ?? now, updatedAt: now },
  ]);
  return { me: { id: me.id, name: me.name, picks, votedAt: now } };
}
