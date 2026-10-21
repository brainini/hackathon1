import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@/lib/types";
import { AppError, Err } from "./errors";
import { ID_RE } from "./text";

/** Hard cap for JSON request bodies (one ≤1.5 MB screenshot as base64 + text fits easily). */
export const MAX_BODY_BYTES = 3 * 1024 * 1024;

type HeaderMap = Record<string, string>;

/** JSON response; API JSON is never cacheable. */
export function json(data: unknown, init: { status?: number; headers?: HeaderMap } = {}): Response {
  return Response.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}

export function errorResponse(err: AppError): Response {
  const body: ApiErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    },
  };
  return json(body, { status: err.status });
}

/** ZodError → 400 VALIDATION with one Korean message per top-level field. */
export function validationError(err: ZodError): AppError {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return Err.validation(fieldErrors);
}

/**
 * Wraps a route body: maps AppError / ZodError / anything else to an ApiErrorBody response.
 * Mutating requests coming from another site (browser-reported `Sec-Fetch-Site: cross-site`) are refused.
 * GET handlers must call `await connection()` BEFORE this wrapper (outside the try/catch).
 */
export async function handle(req: Request, fn: () => Promise<Response>): Promise<Response> {
  try {
    if (req.method !== "GET" && req.method !== "HEAD" && req.headers.get("sec-fetch-site") === "cross-site") {
      throw Err.crossSite();
    }
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AppError) return errorResponse(err);
    if (err instanceof ZodError) return errorResponse(validationError(err));
    // The client went away mid-request (tab closed, network drop): nobody is listening, no noise.
    if (!req.signal.aborted) console.error("[twopick] unexpected API error:", err);
    return errorResponse(Err.internal());
  }
}

/**
 * Reads a JSON body with a size cap (413 above `maxBytes`, also for chunked bodies without
 * Content-Length). An empty body is `{}`; malformed JSON is 400 BAD_REQUEST.
 */
export async function readJson(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw Err.bodyTooLarge();
  if (!req.body) return {};

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw Err.bodyTooLarge();
    }
    chunks.push(value);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw Err.badRequest("요청 내용을 읽을 수 없어요 🤨 (JSON 형식이 아니에요)");
  }
}

/** Route context for `[id]` segments — typed explicitly (no generated RouteContext globals). */
export interface IdContext {
  params: Promise<{ id: string }>;
}

/** Awaits and validates an `[id]` param; malformed ids are treated as "not found". */
export async function idParam(ctx: IdContext, notFound: () => AppError): Promise<string> {
  const { id } = await ctx.params;
  if (typeof id !== "string" || !ID_RE.test(id)) throw notFound();
  return id;
}

/** Client IP for rate limiting: first hop of X-Forwarded-For (Vercel sets it), sanitised. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || req.headers.get("x-real-ip")?.trim() || "local";
  return raw.replace(/[^0-9A-Za-z:.]/g, "").slice(0, 64) || "local";
}

/** True when the original request was HTTPS (behind a proxy: X-Forwarded-Proto). */
export function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
