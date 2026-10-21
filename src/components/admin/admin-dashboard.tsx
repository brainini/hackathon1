"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/lib/api-client";
import type { AdminState, AdminWarning } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PhaseControl } from "./phase-control";
import { StatTiles, LiveTally } from "./stats";
import { Participants } from "./participants";
import { SettingsPanel } from "./settings-panel";
import { ToolsPanel } from "./tools-panel";
import { btn } from "./ui";

export interface AdminSectionProps {
  state: AdminState;
  setState: (next: AdminState) => void;
}

const STORAGE_LABEL: Record<AdminState["storage"], string> = {
  redis: "☁️ Redis",
  file: "💾 파일",
  memory: "🧠 메모리",
};

const WARN_STYLE: Record<AdminWarning["level"], { cls: string; icon: string }> = {
  info: { cls: "bg-sky/20 border-sky-ink", icon: "ℹ️" },
  warn: { cls: "bg-ticket-hi border-ink", icon: "⚠️" },
  danger: { cls: "bg-pop-soft border-danger-ink text-danger-ink", icon: "🚨" },
};

export function AdminDashboard({
  state,
  setState,
  refresh,
}: AdminSectionProps & { refresh: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await api.admin.logout();
      toast.success("관제탑에서 로그아웃했어요 👋");
      await refresh();
    } catch (err) {
      toastError(err, { title: "로그아웃 실패" });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">STAFF ONLY · 실시간 동기화 중</p>
          <h1 className="font-display text-h1">관제탑 🛰️</h1>
          <p className="truncate text-muted">{state.settings.eventTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-chip border-2 border-ink bg-paper-2 px-2.5 py-1 text-sm font-bold">
            {STORAGE_LABEL[state.storage]}
          </span>
          <button type="button" onClick={() => void logout()} disabled={leaving} className={btn("ghost", "sm")}>
            로그아웃 🚪
          </button>
        </div>
      </header>

      {state.warnings.length > 0 ? (
        <ul className="space-y-2" aria-label="경고">
          {state.warnings.map((w, i) => (
            <li
              key={`${w.level}-${i}`}
              className={cn("flex gap-2 rounded-field border-2 px-3 py-2 text-sm font-bold", WARN_STYLE[w.level].cls)}
            >
              <span aria-hidden>{WARN_STYLE[w.level].icon}</span>
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <PhaseControl state={state} setState={setState} />
      <StatTiles state={state} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-6">
          <LiveTally state={state} />
          <Participants state={state} setState={setState} />
        </div>
        <div className="min-w-0 space-y-6">
          <SettingsPanel state={state} setState={setState} />
          <ToolsPanel state={state} setState={setState} refresh={refresh} />
        </div>
      </div>
    </div>
  );
}
