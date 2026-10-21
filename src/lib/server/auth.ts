import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, COOKIE_VOTER } from "@/lib/constants";
import { adminPassword, isProduction, kvPrefix, redisEnv, sessionSecretFromEnv } from "./env";
import { Err } from "./errors";
import { isHttps } from "./http";
import { getStore } from "./store";
import { ID_RE } from "./text";

const VOTER_MAX_AGE_SEC = 60 * 60 * 24 * 14;
const ADMIN_MAX_AGE_SEC = 60 * 60 * 12;

/* ─────────────────────────────── signing key ─────────────────────────────── */

/**
 * Signing secret = SESSION_SECRET, or a random secret generated once and persisted in the store.
 * (Deliberately NOT derived from ADMIN_PASSWORD: changing the admin password mid-event must not
 * invalidate every student's PIN and login cookie.)
 */
function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`twopick:v1:${secret}`).digest();
}

function redisKeyCache(): Map<string, Buffer> {
  const g = globalThis as typeof globalThis & { __twopickKeys?: Map<string, Buffer> };
  g.__twopickKeys ??= new Map();
  return g.__twopickKeys;
}

async function signingKey(): Promise<Buffer> {
  const fromEnv = sessionSecretFromEnv();
  if (fromEnv) return deriveKey(fromEnv);
  const store = getStore();
  // File/memory: read every time (cheap, always consistent with the data). Redis: cache per instance.
  if (store.kind !== "redis") return deriveKey(await store.getSecret());
  const cacheKey = `${redisEnv()?.url ?? ""}|${kvPrefix()}`;
  const cache = redisKeyCache();
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const key = deriveKey(await store.getSecret());
  cache.set(cacheKey, key);
  return key;
}

async function sign(message: string): Promise<string> {
  return createHmac("sha256", await signingKey()).update(message).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/* ─────────────────────────────── cookies ─────────────────────────────── */

function cookieOptions(req: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Secure on HTTPS in production (a production build served over plain-HTTP LAN must still work).
    secure: isProduction() && isHttps(req),
    path: "/",
    maxAge,
  };
}

async function clearCookie(req: Request, name: string): Promise<void> {
  const jar = await cookies();
  jar.set(name, "", { ...cookieOptions(req, 0), expires: new Date(0) });
}

/** Voter cookie value: `<candidateId>.<hmac>`. */
export async function setVoterCookie(req: Request, candidateId: string): Promise<void> {
  const jar = await cookies();
  const value = `${candidateId}.${await sign(`voter:${candidateId}`)}`;
  jar.set(COOKIE_VOTER, value, cookieOptions(req, VOTER_MAX_AGE_SEC));
}

export function clearVoterCookie(req: Request): Promise<void> {
  return clearCookie(req, COOKIE_VOTER);
}

/** Candidate id from a valid voter cookie (the candidate may no longer exist — callers check). */
export async function readVoterId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_VOTER)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  if (!ID_RE.test(id)) return null;
  return safeEqual(raw.slice(dot + 1), await sign(`voter:${id}`)) ? id : null;
}

/* ─────────────────────────────── admin ─────────────────────────────── */

/** Binds admin sessions to the current password: changing ADMIN_PASSWORD logs every admin out. */
function passwordTag(password: string): string {
  return createHash("sha256").update(`pw:${password}`).digest("base64url").slice(0, 22);
}

/** Constant-time comparison (fixed-length digests, so length is not leaked either). */
export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Admin cookie value: `<issuedAt>.<hmac>`; valid for 12 hours. */
export async function setAdminCookie(req: Request, password: string): Promise<void> {
  const issuedAt = Date.now();
  const jar = await cookies();
  const value = `${issuedAt}.${await sign(`admin:${issuedAt}:${passwordTag(password)}`)}`;
  jar.set(COOKIE_ADMIN, value, cookieOptions(req, ADMIN_MAX_AGE_SEC));
}

export function clearAdminCookie(req: Request): Promise<void> {
  return clearCookie(req, COOKIE_ADMIN);
}

export async function isAdmin(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE_ADMIN)?.value;
  if (!raw) return false;
  const [issued, signature, extra] = raw.split(".");
  if (extra !== undefined || !issued || !signature || !/^\d{10,16}$/.test(issued)) return false;
  const issuedAt = Number(issued);
  const age = Date.now() - issuedAt;
  if (age < -60_000 || age > ADMIN_MAX_AGE_SEC * 1000) return false;
  return safeEqual(signature, await sign(`admin:${issuedAt}:${passwordTag(password)}`));
}

/** 503 ADMIN_NOT_CONFIGURED when production has no ADMIN_PASSWORD. */
export function assertAdminConfigured(): void {
  if (adminPassword() === null) throw Err.adminNotConfigured();
}

/** Throws 503 when no admin password is configured (production), 401 when not logged in. */
export async function requireAdmin(): Promise<void> {
  assertAdminConfigured();
  if (!(await isAdmin())) throw Err.adminRequired();
}

/* ─────────────────────────────── PINs ─────────────────────────────── */

export function hashPin(candidateId: string, pin: string): Promise<string> {
  return sign(`pin:${candidateId}:${pin}`);
}

export async function pinMatches(candidateId: string, pin: string, pinHash: string): Promise<boolean> {
  return safeEqual(await hashPin(candidateId, pin), pinHash);
}

export function randomPin(): string {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}
