import "server-only";
import { dataDir, isVercel, kvPrefix, redisEnv } from "../env";
import { createFileStore } from "./file";
import { createMemoryStore } from "./memory";
import { createRedisStore } from "./redis";
import type { Store } from "./types";

export type { BallotRecord, CandidatePatch, CandidateRecord, ImageWrite, Meta, Snapshot, Store } from "./types";
export { defaultMeta, StoreConflict } from "./types";

/**
 * Picks the backend: Upstash Redis when credentials exist → "redis"; otherwise a JSON file store
 * when not on Vercel → "file"; otherwise in-memory → "memory" (admin gets a danger warning).
 *
 * The store object is cached per module instance and per configuration; its long-lived state
 * (mutex chain, memory document, counters) lives on globalThis, so hot reloads keep data and
 * always run the current code.
 */
let cached: { signature: string; store: Store } | undefined;

export function getStore(): Store {
  const redis = redisEnv();
  const signature = redis
    ? `redis|${redis.url}|${kvPrefix()}`
    : !isVercel()
      ? `file|${dataDir()}`
      : "memory";
  if (cached?.signature === signature) return cached.store;

  const store = redis
    ? createRedisStore(redis, kvPrefix())
    : !isVercel()
      ? createFileStore(dataDir())
      : createMemoryStore();
  cached = { signature, store };
  return store;
}
