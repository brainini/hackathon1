import { toast } from "sonner";
import type {
  AdminLoginInput,
  AdminState,
  AdminUpdateCandidateInput,
  ApiErrorBody,
  ErrorCode,
  LoginInput,
  MeResponse,
  OkResponse,
  Phase,
  RegisterInput,
  ResetInput,
  ResetPinResponse,
  SeedInput,
  SeedResponse,
  SetPhaseInput,
  StateResponse,
  UpdateMeInput,
  UpdateSettingsInput,
  VoteInput,
  VoteResponse,
} from "./types";

/* ══════════════════════════════════════════════════════════════════════════
   Typed client for our Route Handlers (SPEC §7). Every call resolves with the contract type
   or throws an ApiError — never a raw Response, never an untyped JSON blob.
   Owner: B. Client-side only (uses fetch + sonner).
   ══════════════════════════════════════════════════════════════════════════ */

export const NETWORK_ERROR_MESSAGE = "네트워크가 잠깐 삐끗했어요 📶 와이파이를 확인해 주세요";
export const TIMEOUT_ERROR_MESSAGE = "응답이 너무 늦어요 🐢 잠시 후 다시 시도해 주세요";
const BAD_RESPONSE_MESSAGE = "서버 응답을 이해하지 못했어요 🤔 잠시 후 다시 시도해 주세요";

interface ApiErrorInit {
  code: ErrorCode;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
  isNetworkError?: boolean;
}

/**
 * Error thrown by every `api.*` call.
 * - `code` / `status` / `message` (Korean, user-facing) / `fieldErrors` (VALIDATION: field → message)
 * - `isNetworkError` — no HTTP response at all (offline, timeout). `status` is 0 then.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly isNetworkError: boolean;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.isNetworkError = init.isNetworkError ?? false;
    if (init.fieldErrors && Object.keys(init.fieldErrors).length > 0) this.fieldErrors = init.fieldErrors;
  }
}

/** Type guard, optionally for specific codes: `isApiError(err, "WRONG_PIN", "RATE_LIMITED")`. */
export function isApiError(err: unknown, ...codes: ErrorCode[]): err is ApiError {
  return err instanceof ApiError && (codes.length === 0 || codes.includes(err.code));
}

/** Korean, user-facing message for anything thrown (ApiError, Error, string, unknown). */
export function getErrorMessage(err: unknown, fallback = "앗, 뭔가 꼬였어요 😵 잠시 후 다시 시도해 주세요"): string {
  if (err instanceof ApiError) return err.message;
  if (typeof err === "string" && err) return err;
  if (err instanceof Error && err.message && /[가-힣]/.test(err.message)) return err.message;
  return fallback;
}

/** `fieldErrors` of a VALIDATION error (or {}), e.g. `getFieldErrors(err).name`. */
export function getFieldErrors(err: unknown): Record<string, string> {
  return err instanceof ApiError && err.fieldErrors ? err.fieldErrors : {};
}

/**
 * Show an error as a brutal sonner toast. Network errors share one toast id (no stacking).
 * `toastError(err)` · `toastError(err, { title: "투표 실패" })` (message becomes the description).
 */
export function toastError(err: unknown, opts: { title?: string; fallback?: string; id?: string | number } = {}): void {
  const message = getErrorMessage(err, opts.fallback);
  const id = opts.id ?? (err instanceof ApiError && err.isNetworkError ? "tp-network-error" : undefined);
  if (opts.title) toast.error(opts.title, { description: message, id });
  else toast.error(message, { id });
}

/* ───────────────────────────── transport ───────────────────────────── */

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  /** Abort + friendly timeout error after this many ms (default 15s, uploads 30s). */
  timeoutMs?: number;
  signal?: AbortSignal;
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== "object" || data === null || !("error" in data)) return false;
  const e = (data as { error: unknown }).error;
  return typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string" && typeof (e as { message?: unknown }).message === "string";
}

/** When the server did not send our JSON error shape (proxy page, crash, missing route…). */
function fallbackError(status: number): ApiError {
  const map: Record<number, [ErrorCode, string]> = {
    400: ["BAD_REQUEST", "요청 형식이 이상해요 🤨 새로고침 후 다시 시도해 주세요"],
    401: ["UNAUTHORIZED", "누구신지 모르겠어요 🕵️ 다시 로그인해 주세요"],
    403: ["FORBIDDEN", "이 요청은 허용되지 않아요 🚫"],
    404: ["NOT_FOUND", "찾는 게 없어요 🫥 새로고침해 주세요"],
    413: ["PAYLOAD_TOO_LARGE", "요청이 너무 커요 🐘 이미지를 조금 더 작게 줄여주세요"],
    429: ["RATE_LIMITED", "잠깐 쉬었다 가요 ☕ 조금 뒤에 다시 시도해 주세요"],
  };
  const [code, message] = map[status] ?? ["INTERNAL", "서버가 잠깐 삐끗했어요 😵 잠시 후 다시 시도해 주세요"];
  return new ApiError({ code, status, message });
}

async function request<T>(method: Method, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? 15_000);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (opts.signal?.aborted) throw err; // caller cancelled on purpose: let them see the AbortError
    throw new ApiError({
      code: "INTERNAL",
      status: 0,
      message: timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
      isNetworkError: true,
    });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }

  const text = await res.text().catch(() => "");
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    if (isErrorBody(data)) {
      throw new ApiError({
        code: data.error.code,
        status: res.status,
        message: data.error.message,
        fieldErrors: data.error.fieldErrors,
      });
    }
    throw fallbackError(res.status);
  }
  if (data === undefined) {
    if (res.status === 204) return undefined as T;
    throw new ApiError({ code: "INTERNAL", status: res.status, message: BAD_RESPONSE_MESSAGE });
  }
  return data as T;
}

const UPLOAD_TIMEOUT = 30_000;
const enc = encodeURIComponent;

/* ───────────────────────────── endpoints ───────────────────────────── */

/**
 * Typed API. All methods throw `ApiError`.
 * After register / login / logout / vote call `refreshAppState()` (or `useAppState().refresh()`),
 * because `me` depends on the cookie, not on the state version.
 */
export const api = {
  /** GET /api/state — prefer `useAppState()`; `since` returns `{ unchanged: true }` when nothing changed. */
  state: (since?: number | null) =>
    request<StateResponse>("GET", since == null ? "/api/state" : `/api/state?since=${since}`),
  /** POST /api/register → 201 MeResponse + voter cookie (WRONG_PHASE, NAME_TAKEN, VALIDATION, PAYLOAD_TOO_LARGE). */
  register: (input: RegisterInput) => request<MeResponse>("POST", "/api/register", input, { timeoutMs: UPLOAD_TIMEOUT }),
  /** PATCH /api/me — own entry, registration phase only. image: data URL → replace, null → remove, undefined → keep. */
  updateMe: (input: UpdateMeInput) => request<MeResponse>("PATCH", "/api/me", input, { timeoutMs: UPLOAD_TIMEOUT }),
  /** POST /api/login (WRONG_PIN 401 — message has remaining tries, RATE_LIMITED 429). */
  login: (input: LoginInput) => request<MeResponse>("POST", "/api/login", input),
  /** POST /api/logout — clears the voter cookie. */
  logout: () => request<OkResponse>("POST", "/api/logout"),
  /** POST /api/vote — `api.vote(["id1", "id2"])` or `api.vote({ picks })`. */
  vote: (picks: VoteInput | readonly string[]) =>
    request<VoteResponse>("POST", "/api/vote", "picks" in picks ? picks : { picks: [...picks] }),

  admin: {
    /** GET /api/admin/state — prefer `useAdminState()`. 401 when not logged in. */
    state: () => request<AdminState>("GET", "/api/admin/state"),
    /** `api.admin.login("admin")` or `api.admin.login({ password })`. */
    login: (password: string | AdminLoginInput) =>
      request<OkResponse>("POST", "/api/admin/login", typeof password === "string" ? { password } : password),
    logout: () => request<OkResponse>("POST", "/api/admin/logout"),
    /** `api.admin.setPhase("voting")` → AdminState (NOT_ENOUGH_CANDIDATES when < 2). */
    setPhase: (phase: Phase | SetPhaseInput) =>
      request<AdminState>("POST", "/api/admin/phase", typeof phase === "string" ? { phase } : phase),
    updateSettings: (input: UpdateSettingsInput) => request<AdminState>("PATCH", "/api/admin/settings", input),
    updateCandidate: (id: string, input: AdminUpdateCandidateInput) =>
      request<AdminState>("PATCH", `/api/admin/candidates/${enc(id)}`, input),
    deleteCandidate: (id: string) => request<AdminState>("DELETE", `/api/admin/candidates/${enc(id)}`),
    /** → `{ pin }` (new random 4 digits — show it once). */
    resetPin: (id: string) => request<ResetPinResponse>("POST", `/api/admin/candidates/${enc(id)}/reset-pin`),
    /** `api.admin.reset({ scope: "ballots" | "all", confirm: RESET_CONFIRM_WORD })`. */
    reset: (input: ResetInput) => request<AdminState>("POST", "/api/admin/reset", input),
    /** Demo participants (PIN "0000"); `{ count: 8, withBallots: true }`. */
    seed: (input: SeedInput = {}) => request<SeedResponse>("POST", "/api/admin/seed", input),
  },
} as const;
