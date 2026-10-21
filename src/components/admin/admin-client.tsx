"use client";

import { useAdminState } from "@/lib/hooks/use-admin-state";
import { getErrorMessage } from "@/lib/api-client";
import { AdminLogin } from "./admin-login";
import { AdminDashboard } from "./admin-dashboard";
import { btn } from "./ui";

export function AdminClient() {
  const { state, isUnauthorized, isNotConfigured, isLoading, error, refresh, setState } = useAdminState();

  if (isUnauthorized || isNotConfigured) {
    return <AdminLogin onSuccess={refresh} notConfigured={isNotConfigured} />;
  }

  if (!state) {
    if (error && !isLoading) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-5xl">📡</p>
          <h1 className="mt-3 font-display text-h2">관제탑 신호가 끊겼어요</h1>
          <p className="mt-2 text-muted">{getErrorMessage(error)}</p>
          <button type="button" onClick={() => void refresh()} className={`${btn("primary")} mt-6`}>
            다시 연결하기 🔁
          </button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
        <div className="h-10 w-56 animate-shimmer rounded-field bg-paper-2" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-shimmer rounded-card border-2 border-ink/20 bg-paper-2" />
          ))}
        </div>
        <p className="mt-6 text-center text-muted">관제탑 전원 켜는 중… 🛰️</p>
      </div>
    );
  }

  return <AdminDashboard state={state} setState={setState} refresh={refresh} />;
}
