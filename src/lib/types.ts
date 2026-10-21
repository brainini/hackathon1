/**
 * TWOPICK — shared contract between the server (route handlers) and the client (pages/hooks).
 * Every API request/response shape lives here. Do not duplicate these types elsewhere.
 */

/* ────────────────────────────── Domain ────────────────────────────── */

export const PHASES = ["registration", "voting", "closed", "revealed"] as const;
/** registration → voting → closed → revealed (admin can move freely between them) */
export type Phase = (typeof PHASES)[number];

export const COLOR_KEYS = [
  "yellow",
  "pink",
  "mint",
  "sky",
  "grape",
  "tangerine",
  "lime",
  "coral",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export interface Settings {
  /** Shown in the hero / stage. */
  eventTitle: string;
  /** Tickets per voter (default 2). Effective count is min(votesPerVoter, candidateCount - 1). */
  votesPerVoter: number;
  /** Voters may overwrite their ballot until voting closes. */
  allowVoteChange: boolean;
  /** When false, public results only expose the podium (rank ≤ 3 with votes > 0). */
  showFullRanking: boolean;
}

export type StorageKind = "redis" | "file" | "memory";

/** A participant = a candidate = a voter. Never contains secrets. */
export interface PublicCandidate {
  id: string;
  /** Student's name (unique, case-insensitive). */
  name: string;
  /** Project name. */
  title: string;
  /** Short pitch. */
  description: string;
  /** Optional demo URL (http/https only). */
  link: string | null;
  /** Avatar emoji (one of EMOJIS). */
  emoji: string;
  color: ColorKey;
  /** `/api/images/{imageId}` or null when no screenshot. */
  imageUrl: string | null;
  /** 1-based registration order ("참가번호 No.007"). Stable even if others are deleted. */
  entryNo: number;
  createdAt: number;
  updatedAt: number;
  /** Whether this participant has cast a (valid) ballot. */
  hasVoted: boolean;
}

/** The participant identified by the voter cookie. */
export interface MeInfo {
  id: string;
  name: string;
  /** Current ballot (candidate ids) or null if not voted yet. */
  picks: string[] | null;
  votedAt: number | null;
}

export interface RankedEntry {
  candidateId: string;
  /** Competition ranking: 1, 1, 3, 4 … */
  rank: number;
  votes: number;
  /** votes / totalBallots (0..1). 0 when no ballots. */
  share: number;
}

export interface FunStats {
  /** ⚡ First valid ballot after voting started. */
  fastestVoter: { candidateId: string; secondsAfterStart: number } | null;
  /** 🐢 Last valid ballot (most deliberate). Null when < 2 ballots. */
  mostDeliberateVoter: { candidateId: string; secondsAfterStart: number } | null;
  /** ballots / candidates (0..1). */
  turnout: number;
  /** Vote gap between rank-1 group and the next group, null if not applicable. */
  marginTop: number | null;
}

export interface Results {
  totalBallots: number;
  totalVotes: number;
  /**
   * Sorted by rank asc, then name asc.
   * isFullRanking=true  → every candidate (including 0 votes).
   * isFullRanking=false → only podium entries (rank ≤ 3 AND votes > 0).
   */
  ranking: RankedEntry[];
  isFullRanking: boolean;
  funStats: FunStats;
}

/* ───────────────────────────── GET /api/state ───────────────────────────── */

export interface PublicState {
  unchanged?: false;
  /** Monotonic counter, bumped on every mutation. */
  version: number;
  serverTime: number;
  phase: Phase;
  phaseChangedAt: number;
  votingStartedAt: number | null;
  settings: Settings;
  /** min(settings.votesPerVoter, max(0, candidateCount - 1)) */
  effectiveVotes: number;
  /** Sorted by entryNo asc. */
  candidates: PublicCandidate[];
  stats: { candidateCount: number; ballotCount: number };
  /** Null when the voter cookie is missing/invalid. */
  me: MeInfo | null;
  /** Non-null ONLY when phase === "revealed". */
  results: Results | null;
  storage: StorageKind;
}

/** Returned when `?since=<version>` equals the current version. */
export interface UnchangedState {
  unchanged: true;
  version: number;
  serverTime: number;
}

export type StateResponse = PublicState | UnchangedState;

/* ─────────────────────────── GET /api/admin/state ─────────────────────────── */

export interface AdminWarning {
  level: "info" | "warn" | "danger";
  message: string;
}

export interface AdminState {
  version: number;
  serverTime: number;
  phase: Phase;
  phaseChangedAt: number;
  votingStartedAt: number | null;
  votingClosedAt: number | null;
  settings: Settings;
  effectiveVotes: number;
  candidates: PublicCandidate[];
  stats: { candidateCount: number; ballotCount: number };
  /** Always the FULL live ranking, regardless of phase/settings. */
  results: Results;
  warnings: AdminWarning[];
  storage: StorageKind;
}

/* ─────────────────────────────── Requests ─────────────────────────────── */

export interface RegisterInput {
  name: string;
  title: string;
  description: string;
  link?: string | null;
  emoji: string;
  color: ColorKey;
  /** Exactly 4 digits. */
  pin: string;
  /** data:image/(png|jpeg|webp|gif);base64,... or null for no screenshot. */
  image: string | null;
}

/** PATCH /api/me — own entry, registration phase only. Omitted fields stay unchanged. */
export interface UpdateMeInput {
  name?: string;
  title?: string;
  description?: string;
  link?: string | null;
  emoji?: string;
  color?: ColorKey;
  /** data URL → replace, null → remove, undefined → keep. */
  image?: string | null;
}

export interface LoginInput {
  candidateId: string;
  pin: string;
}

export interface VoteInput {
  /** Exactly `effectiveVotes` distinct candidate ids, never your own. */
  picks: string[];
}

export interface AdminLoginInput {
  password: string;
}

export interface SetPhaseInput {
  phase: Phase;
}

export type UpdateSettingsInput = Partial<Settings>;

export interface AdminUpdateCandidateInput {
  name?: string;
  title?: string;
  description?: string;
  link?: string | null;
  emoji?: string;
  color?: ColorKey;
  /** null → remove screenshot. (Admins cannot upload images.) */
  image?: null;
}

export interface ResetInput {
  /** "ballots" clears votes only; "all" wipes everything (back to registration). */
  scope: "ballots" | "all";
  /** Must equal RESET_CONFIRM_WORD ("초기화"). */
  confirm: string;
}

export interface SeedInput {
  /** Demo participants to add (1..30, default 8). PIN for all demo users is "0000". */
  count?: number;
  /** Also cast random valid ballots for ~80% of all participants. */
  withBallots?: boolean;
}

/* ─────────────────────────────── Responses ─────────────────────────────── */

export interface OkResponse {
  ok: true;
}

/** POST /api/register, POST /api/login, PATCH /api/me */
export interface MeResponse {
  me: MeInfo;
  candidate: PublicCandidate;
}

/** POST /api/vote */
export interface VoteResponse {
  me: MeInfo;
}

/** POST /api/admin/candidates/[id]/reset-pin */
export interface ResetPinResponse {
  pin: string;
}

/** POST /api/admin/seed */
export interface SeedResponse {
  added: number;
  ballots: number;
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NAME_TAKEN"
  | "WRONG_PHASE"
  | "SELF_VOTE"
  | "INVALID_PICKS"
  | "ALREADY_VOTED"
  | "WRONG_PIN"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "TOO_MANY_CANDIDATES"
  | "NOT_ENOUGH_CANDIDATES"
  | "ADMIN_NOT_CONFIGURED"
  | "INTERNAL";

/** Every non-2xx JSON response has this shape. `message` is user-facing Korean. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** For VALIDATION: field name → Korean message. */
    fieldErrors?: Record<string, string>;
  };
}
