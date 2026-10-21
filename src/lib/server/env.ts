import "server-only";
import path from "node:path";

/** Environment access lives here only. Values are read lazily (per request), never at import time. */

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export interface RedisEnv {
  url: string;
  token: string;
}

/** Upstash credentials: Vercel Marketplace names first, then Upstash's own names. Both halves required. */
export function redisEnv(): RedisEnv | null {
  const pairs: Array<[string | undefined, string | undefined]> = [
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
  ];
  for (const [rawUrl, rawToken] of pairs) {
    const url = clean(rawUrl);
    const token = clean(rawToken);
    if (url && token) return { url, token };
  }
  return null;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Every Redis key is `${prefix}:<name>`. */
export function kvPrefix(): string {
  return clean(process.env.KV_PREFIX) ?? "twopick";
}

/** Local JSON store directory (dev only): TWOPICK_DATA_DIR or <cwd>/.data. */
export function dataDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ clean(process.env.TWOPICK_DATA_DIR) ?? ".data");
}

export const DEV_ADMIN_PASSWORD = "admin";

/**
 * The admin password. Unset → "admin" in development, `null` (= not configured → 503) in production.
 */
export function adminPassword(): string | null {
  const configured = clean(process.env.ADMIN_PASSWORD);
  if (configured) return configured;
  return isProduction() ? null : DEV_ADMIN_PASSWORD;
}

/** Optional explicit signing secret. Without it a random secret is generated once and kept in the store. */
export function sessionSecretFromEnv(): string | undefined {
  return clean(process.env.SESSION_SECRET);
}
