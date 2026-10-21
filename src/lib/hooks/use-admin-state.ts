"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { ApiError, api } from "@/lib/api-client";
import { POLL_MS } from "@/lib/constants";
import type { AdminState } from "@/lib/types";

export const ADMIN_STATE_KEY = "/api/admin/state";

export interface UseAdminStateOptions {
  /** Poll interval in ms (default POLL_MS.admin = 2500). */
  interval?: number;
  /** false → no requests at all (e.g. the stage only needs admin data in the closed phase). Default true. */
  enabled?: boolean;
}

export interface UseAdminStateResult {
  /** Full admin state. Hidden (undefined) while unauthorized, so stale data never leaks after logout. */
  state?: AdminState;
  error?: ApiError;
  /** 401 → show the login gate. Polling pauses until `refresh()` succeeds (e.g. after api.admin.login). */
  isUnauthorized: boolean;
  /** 503 ADMIN_NOT_CONFIGURED (production without ADMIN_PASSWORD). */
  isNotConfigured: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Apply a mutation response immediately: `setState(await api.admin.setPhase("voting"))`. */
  setState: (next: AdminState) => void;
}

const noRetryStatus = (err: Error) => !(err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 503));

/**
 * Live admin state (GET /api/admin/state).
 *   const { state, isUnauthorized, setState } = useAdminState();
 *   if (isUnauthorized) return <AdminGate onSuccess={refresh}/>;
 */
export function useAdminState(opts: UseAdminStateOptions = {}): UseAdminStateResult {
  const { interval = POLL_MS.admin, enabled = true } = opts;
  const { data, error, isLoading, mutate } = useSWR<AdminState, ApiError>(
    enabled ? ADMIN_STATE_KEY : null,
    () => api.admin.state(),
    {
      refreshInterval: interval,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      keepPreviousData: true,
      dedupingInterval: 1000,
      shouldRetryOnError: noRetryStatus,
      errorRetryInterval: 4000,
    },
  );

  const setState = useCallback(
    (next: AdminState) => {
      void mutate(next, { revalidate: false });
    },
    [mutate],
  );
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const isUnauthorized = enabled && error?.status === 401;
  const isNotConfigured = enabled && error?.code === "ADMIN_NOT_CONFIGURED";
  return {
    state: isUnauthorized || isNotConfigured || !enabled ? undefined : data,
    error,
    isUnauthorized,
    isNotConfigured,
    isLoading: enabled && isLoading,
    refresh,
    setState,
  };
}
