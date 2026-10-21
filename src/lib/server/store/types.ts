import "server-only";
import { DEFAULT_SETTINGS, LIMITS } from "@/lib/constants";
import { COLOR_KEYS, PHASES } from "@/lib/types";
import type { ColorKey, Phase, Settings, StorageKind } from "@/lib/types";

/** Global event state (Redis key `meta`). */
export interface Meta {
  phase: Phase;
  settings: Settings;
  phaseChangedAt: number;
  votingStartedAt: number | null;
  votingClosedAt: number | null;
}

/** Stored participant (contains secrets — never send as-is). */
export interface CandidateRecord {
  id: string;
  name: string;
  title: string;
  description: string;
  link: string | null;
  emoji: string;
  color: ColorKey;
  imageId: string | null;
  entryNo: number;
  pinHash: string;
  createdAt: number;
  updatedAt: number;
  /** Created by the admin seed tool. */
  demo?: boolean;
}

export type NewCandidate = Omit<CandidateRecord, "entryNo">;

/** Fields that can change after registration. Omitted fields stay as they are. */
export type CandidatePatch = Partial<
  Pick<
    CandidateRecord,
    "name" | "title" | "description" | "link" | "emoji" | "color" | "imageId" | "pinHash" | "updatedAt"
  >
>;

/** One ballot per voter (keyed by voterId — structurally one-per-person). */
export interface BallotRecord {
  voterId: string;
  picks: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Snapshot {
  version: number;
  meta: Meta;
  /** Sorted by entryNo asc. */
  candidates: CandidateRecord[];
  ballots: BallotRecord[];
}

/** A screenshot to store: data URL (already validated / generated). */
export interface ImageWrite {
  id: string;
  dataUrl: string;
}

/** Raised by stores for conflicts that must be decided atomically. */
export class StoreConflict extends Error {
  readonly reason: "name_taken" | "too_many";

  constructor(reason: "name_taken" | "too_many") {
    super(reason);
    this.name = "StoreConflict";
    this.reason = reason;
  }
}

/**
 * Storage backend. Every mutation bumps `version` (except getSecret/initialisation and rate-limit hits).
 * Name uniqueness and the participant cap are enforced atomically inside insert/update.
 */
export interface Store {
  readonly kind: StorageKind;
  getVersion(): Promise<number>;
  getSnapshot(): Promise<Snapshot>;
  /** Stored data URL or null. */
  getImage(id: string): Promise<string | null>;
  /** Random signing secret, created once and persisted. */
  getSecret(): Promise<string>;

  /** Claims the name, assigns the next entry number, stores record + image. */
  insertCandidate(rec: NewCandidate, image: ImageWrite | null, maxCandidates: number): Promise<CandidateRecord>;
  /** Applies `patch`; a changed imageId deletes the previous image. Null when the candidate is gone. */
  updateCandidate(id: string, patch: CandidatePatch, image?: ImageWrite | null): Promise<CandidateRecord | null>;
  /** Removes the candidate, their ballot, name claim and image. Null when it did not exist. */
  deleteCandidate(id: string): Promise<CandidateRecord | null>;
  /** Upserts ballots (keyed by voterId). */
  putBallots(ballots: BallotRecord[]): Promise<void>;
  setMeta(meta: Meta): Promise<void>;
  /** Drops every ballot and writes `meta`. */
  resetBallots(meta: Meta): Promise<void>;
  /** Wipes candidates, ballots, names, images and the entry counter; writes `meta`. */
  resetAll(meta: Meta): Promise<void>;

  /** Fixed-window failure counter: increments and returns the new count. */
  hit(key: string, windowSec: number): Promise<number>;
  peekHits(key: string): Promise<number>;
  clearHits(key: string): Promise<void>;
}

/* ───────────────────────── defensive parsing of stored data ───────────────────────── */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function defaultMeta(now: number): Meta {
  return {
    phase: "registration",
    settings: { ...DEFAULT_SETTINGS },
    phaseChangedAt: now,
    votingStartedAt: null,
    votingClosedAt: null,
  };
}

export function parseSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {};
  const votes = asNumber(s.votesPerVoter, DEFAULT_SETTINGS.votesPerVoter);
  return {
    eventTitle:
      typeof s.eventTitle === "string" && s.eventTitle.trim() ? s.eventTitle : DEFAULT_SETTINGS.eventTitle,
    votesPerVoter: Math.min(LIMITS.votesPerVoter.max, Math.max(LIMITS.votesPerVoter.min, Math.round(votes))),
    allowVoteChange:
      typeof s.allowVoteChange === "boolean" ? s.allowVoteChange : DEFAULT_SETTINGS.allowVoteChange,
    showFullRanking:
      typeof s.showFullRanking === "boolean" ? s.showFullRanking : DEFAULT_SETTINGS.showFullRanking,
  };
}

/** Null when missing/unreadable (callers initialise a default). */
export function parseMeta(raw: unknown): Meta | null {
  const m = parseMaybeJson(raw);
  if (!isObject(m)) return null;
  const phase = PHASES.find((p) => p === m.phase) ?? "registration";
  return {
    phase,
    settings: parseSettings(m.settings),
    phaseChangedAt: asNumber(m.phaseChangedAt),
    votingStartedAt: asNullableNumber(m.votingStartedAt),
    votingClosedAt: asNullableNumber(m.votingClosedAt),
  };
}

export function parseCandidate(raw: unknown): CandidateRecord | null {
  const c = parseMaybeJson(raw);
  if (!isObject(c) || typeof c.id !== "string" || typeof c.name !== "string") return null;
  const color = COLOR_KEYS.find((k) => k === c.color) ?? "yellow";
  return {
    id: c.id,
    name: c.name,
    title: asString(c.title),
    description: asString(c.description),
    link: typeof c.link === "string" && c.link ? c.link : null,
    emoji: asString(c.emoji, "🦊"),
    color,
    imageId: typeof c.imageId === "string" && c.imageId ? c.imageId : null,
    entryNo: asNumber(c.entryNo),
    pinHash: asString(c.pinHash),
    createdAt: asNumber(c.createdAt),
    updatedAt: asNumber(c.updatedAt),
    ...(c.demo === true ? { demo: true } : {}),
  };
}

export function parseBallot(raw: unknown): BallotRecord | null {
  const b = parseMaybeJson(raw);
  if (!isObject(b) || typeof b.voterId !== "string" || !Array.isArray(b.picks)) return null;
  return {
    voterId: b.voterId,
    picks: b.picks.filter((p): p is string => typeof p === "string"),
    createdAt: asNumber(b.createdAt),
    updatedAt: asNumber(b.updatedAt),
  };
}

/** `{ ...current, ...patch }` ignoring keys whose value is `undefined`. */
export function applyPatch(current: CandidateRecord, patch: CandidatePatch): CandidateRecord {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  return { ...current, ...(defined as CandidatePatch) };
}

export function byEntryNo(a: CandidateRecord, b: CandidateRecord): number {
  return a.entryNo - b.entryNo || a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

export function nonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
