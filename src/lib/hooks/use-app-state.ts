"use client";

import useSWR, { mutate as swrMutate } from "swr";
import { ApiError, api } from "@/lib/api-client";
import { POLL_MS } from "@/lib/constants";
import type { PublicState } from "@/lib/types";

/* ══════════════════════════════════════════════════════════════════════════
   useAppState — the ONE source of live public state (GET /api/state).
   - Polls with `?since=<version>`; on `{ unchanged: true }` it returns the very same object,
     so nothing re-renders and Upstash spends 1 command per poll.
   - One SWR key for the whole app: every component calling the hook shares one request.
   - No polling while the browser tab is hidden or while Activity hides the route.
   ══════════════════════════════════════════════════════════════════════════ */

export const APP_STATE_KEY = "/api/state";

/** Last FULL state we saw (module-level: survives route changes, shared by all hook instances). */
let lastState: PublicState | null = null;
/** Bumped by refreshAppState(); responses from older generations never overwrite the cache. */
let generation = 0;

async function fetchAppState(): Promise<PublicState> {
  const gen = generation;
  const known = lastState;
  const res = await api.state(known ? known.version : undefined);

  let full: PublicState;
  if (res.unchanged) {
    if (known && gen === generation && known.version === res.version) return known;
    const again = await api.state();
    if (again.unchanged) {
      throw new ApiError({ code: "INTERNAL", status: 500, message: "상태를 불러오지 못했어요 😵 새로고침해 주세요" });
    }
    full = again;
  } else {
    full = res;
  }
  if (gen === generation) lastState = full;
  return full;
}

/**
 * Force a FULL refetch (drops the since-version shortcut). Call after register / login / logout / vote:
 * `me` depends on the cookie, not on the version. Safe to call from any event handler.
 */
export async function refreshAppState(): Promise<void> {
  generation += 1;
  lastState = null;
  await swrMutate(APP_STATE_KEY);
}

/**
 * Optimistically patch the cached state (e.g. put the `me` from a VoteResponse in place right away),
 * then revalidate in the background.
 *   await patchAppState((s) => ({ ...s, me: res.me }));
 */
export async function patchAppState(update: (state: PublicState) => PublicState): Promise<void> {
  await swrMutate<PublicState>(
    APP_STATE_KEY,
    (current) => {
      if (!current) return current;
      const next = update(current);
      lastState = next;
      return next;
    },
    { revalidate: true },
  );
}

export interface UseAppStateOptions {
  /** Poll interval in ms (default POLL_MS.default = 3000; stage uses POLL_MS.stage). */
  interval?: number;
}

export interface UseAppStateResult {
  /** undefined until the first response (also in the prerendered HTML → render a skeleton). */
  state?: PublicState;
  /** Last error. `state` keeps the previous data when a poll fails → show ErrorState only if `!state`. */
  error?: ApiError;
  /** True only while the very first request is in flight (no data yet). */
  isLoading: boolean;
  /** Any request in flight (polls included). */
  isValidating: boolean;
  /** Full refetch (see refreshAppState). */
  refresh: () => Promise<void>;
}

/**
 * Live public state. Usage:
 *   const { state, error, isLoading, refresh } = useAppState();
 *   if (!state) return error ? <ErrorState error={error} onRetry={refresh}/> : <Skeleton …/>;
 */
export function useAppState(opts: UseAppStateOptions = {}): UseAppStateResult {
  const { data, error, isLoading, isValidating } = useSWR<PublicState, ApiError>(APP_STATE_KEY, fetchAppState, {
    refreshInterval: opts.interval ?? POLL_MS.default,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    dedupingInterval: 1500,
    focusThrottleInterval: 4000,
    errorRetryInterval: 4000,
  });
  return { state: data, error, isLoading, isValidating, refresh: refreshAppState };
}
