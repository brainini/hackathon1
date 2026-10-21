"use client";

import { useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import type { AdminState } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";
import { btn, Panel } from "./ui";

export function StatTiles({ state }: { state: AdminState }) {
  const { candidateCount, ballotCount } = state.stats;
  const turnout = candidateCount > 0 ? ballotCount / candidateCount : 0;
  const tiles = [
    { label: "참가자", value: `${candidateCount}명`, emoji: "🙋", bg: "bg-ticket" },
    { label: "투표 완료", value: `${ballotCount}/${candidateCount}`, emoji: "🗳️", bg: "bg-mint" },
    { label: "투표율", value: formatPercent(turnout), emoji: "📈", bg: "bg-sky", bar: turnout },
    { label: "1인당 티켓", value: `${state.effectiveVotes}장`, emoji: "🎟️", bg: "bg-pop-soft" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((t) => (
        <div key={t.label} className={cn("rounded-card border-[3px] border-ink p-3 shadow-brutal sm:p-4", t.bg)}>
          <p className="flex items-center justify-between text-sm font-bold">
            {t.label} <span aria-hidden>{t.emoji}</span>
          </p>
          <p className="mt-1 font-display text-h2 tabular-nums">{t.value}</p>
          {t.bar !== undefined ? (
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card">
              <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${Math.round(t.bar * 100)}%` }} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function LiveTally({ state }: { state: AdminState }) {
  const [peek, setPeek] = useState(false);
  const byId = new Map(state.candidates.map((c) => [c.id, c]));
  const ranking = state.results.ranking;
  const max = ranking.reduce((m, r) => Math.max(m, r.votes), 0);

  return (
    <Panel
      title="실시간 집계 📊"
      right={
        peek ? (
          <button type="button" onClick={() => setPeek(false)} className={btn("ghost", "sm")}>
            다시 가리기 🙈
          </button>
        ) : (
          <span className="text-sm text-muted">총 {state.results.totalVotes}표</span>
        )
      }
    >
      <div className="relative">
        <ol
          className={cn("min-h-32 space-y-2 transition", !peek && "pointer-events-none select-none blur-md")}
          aria-hidden={!peek}
        >
          {ranking.length === 0 ? <li className="py-6 text-center text-muted">아직 참가자가 없어요 🦗</li> : null}
          {ranking.map((r) => {
            const c = byId.get(r.candidateId);
            if (!c) return null;
            return (
              <li key={r.candidateId} className="flex items-center gap-2 sm:gap-3">
                <span className="w-7 shrink-0 text-center font-display text-lg">{r.rank}</span>
                <Avatar emoji={c.emoji} color={c.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {c.name} <span className="font-normal text-muted">· {c.title}</span>
                  </p>
                  <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
                    <div
                      className={cn("h-full transition-[width] duration-500", r.rank === 1 && r.votes > 0 ? "bg-pop" : "bg-ticket")}
                      style={{ width: `${max > 0 ? Math.round((r.votes / max) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-sm font-bold tabular-nums">{r.votes}표</span>
              </li>
            );
          })}
        </ol>
        {!peek ? (
          <button
            type="button"
            onClick={() => setPeek(true)}
            className="absolute inset-0 grid place-items-center rounded-field"
          >
            <span className={cn(btn("primary"), "pointer-events-none")}>스포 방지 — 클릭해서 엿보기 👀</span>
          </button>
        ) : null}
      </div>
    </Panel>
  );
}
