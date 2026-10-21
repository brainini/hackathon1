"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/lib/api-client";
import { PHASE_META } from "@/lib/constants";
import { PHASES, type Phase } from "@/lib/types";
import { cn, formatKstTime } from "@/lib/utils";
import type { AdminSectionProps } from "./admin-dashboard";
import { btn, Panel } from "./ui";

export function PhaseControl({ state, setState }: AdminSectionProps) {
  const [coverOpen, setCoverOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prevPhase, setPrevPhase] = useState(state.phase);
  if (prevPhase !== state.phase) {
    setPrevPhase(state.phase);
    setCoverOpen(false);
  }

  const idx = PHASES.indexOf(state.phase);
  const { candidateCount, ballotCount } = state.stats;
  const notEnough = candidateCount < 2;

  async function go(phase: Phase, message: string) {
    setBusy(true);
    try {
      setState(await api.admin.setPhase(phase));
      toast.success(message);
    } catch (err) {
      toastError(err, { title: "단계를 바꾸지 못했어요" });
    } finally {
      setBusy(false);
    }
  }

  function closeVoting() {
    const left = candidateCount - ballotCount;
    if (left > 0 && !window.confirm(`아직 ${left}명이 투표를 안 했어요 😳\n그래도 투표를 마감할까요?`)) return;
    void go("closed", "투표 마감! 🔒 이제 두구두구…");
  }

  function back() {
    if (idx <= 0) return;
    const prev = PHASES[idx - 1];
    const meta = PHASE_META[prev];
    if (!window.confirm(`'${meta.label}' 단계로 되돌릴까요?\n모든 참가자 화면이 바로 바뀌어요.`)) return;
    void go(prev, `${meta.emoji} ${meta.station} 단계로 되돌렸어요`);
  }

  return (
    <Panel
      title="진행 단계 🚦"
      right={
        <span className="text-sm text-muted">
          {PHASE_META[state.phase].emoji} {formatKstTime(state.phaseChangedAt)}부터 진행 중
        </span>
      }
    >
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {PHASES.map((p, i) => {
          const meta = PHASE_META[p];
          const current = i === idx;
          const done = i < idx;
          return (
            <li
              key={p}
              aria-current={current ? "step" : undefined}
              className={cn(
                "relative rounded-ticket border-2 px-1.5 py-2 text-center transition sm:px-3 sm:py-3",
                current && "-rotate-1 border-ink bg-ticket shadow-brutal",
                done && "border-ink bg-mint/40",
                !current && !done && "border-dashed border-ink/40 bg-paper text-muted",
              )}
            >
              <span className="block text-xl sm:text-2xl" aria-hidden>
                {done ? "✅" : meta.emoji}
              </span>
              <span className="block text-xs font-bold sm:text-base">{meta.station}</span>
              {current ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-pop px-1.5 text-[10px] font-bold text-white sm:text-xs">
                  NOW
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">{PHASE_META[state.phase].blurb}</p>

      <div className="mt-5 rounded-card border-2 border-dashed border-ink/50 bg-paper p-4 sm:p-5">
        {state.phase === "registration" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {!coverOpen ? (
              <button
                type="button"
                onClick={() => setCoverOpen(true)}
                className="stripes group w-full max-w-sm rounded-card border-[3px] border-ink bg-ticket px-6 py-6 font-display text-h3 shadow-brutal-md transition hover:-rotate-1"
              >
                <span className="inline-block rounded-field border-2 border-ink bg-card px-4 py-2">🔓 덮개 열기</span>
              </button>
            ) : (
              <div className="flex w-full max-w-sm animate-pop-in flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={busy || notEnough}
                  onClick={() => void go("voting", "투표 시작! 🚨 티켓이 날아다니기 시작했어요")}
                  className="aspect-square w-44 rounded-full border-4 border-ink bg-danger font-display text-h2 text-white shadow-brutal-lg transition hover:scale-[1.03] active:translate-y-1 active:shadow-brutal disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-52"
                >
                  {busy ? "…" : "투표 시작!"}
                </button>
                <button type="button" onClick={() => setCoverOpen(false)} className={btn("ghost", "sm")}>
                  🔒 덮개 닫기
                </button>
              </div>
            )}
            {notEnough ? (
              <p className="text-sm font-bold text-danger-ink">
                참가자가 2명 이상이어야 투표를 열 수 있어요 (지금 {candidateCount}명)
              </p>
            ) : (
              <p className="text-sm text-muted">누르는 순간 모든 화면이 투표 모드로 바뀌어요. 심호흡 한 번 🫁</p>
            )}
          </div>
        ) : null}

        {state.phase === "voting" ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <button type="button" disabled={busy} onClick={closeVoting} className={cn(btn("ink", "lg"), "w-full max-w-sm text-xl")}>
              투표 마감 🔒
            </button>
            <p className="text-sm text-muted">
              {ballotCount}/{candidateCount}명 투표 완료 · 마감하면 더 이상 표를 받지 않아요
            </p>
          </div>
        ) : null}

        {state.phase === "closed" ? (
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("결과를 모두의 화면에 공개할까요? 📢")) void go("revealed", "결과 공개! 📢 축하 파티 시작 🎉");
              }}
              className={cn(btn("pop", "lg"), "w-full max-w-xs text-xl")}
            >
              결과 공개 📢
            </button>
            <a href="/stage" target="_blank" rel="noopener noreferrer" className={cn(btn("primary", "lg"), "w-full max-w-xs text-xl")}>
              무대에서 발표하기 🎤
            </a>
          </div>
        ) : null}

        {state.phase === "revealed" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-display text-h2">끝! 🎉</p>
            <p className="text-muted">모두 수고했어요. 박수 👏👏👏</p>
            <a href="/stage" target="_blank" rel="noopener noreferrer" className={btn("primary")}>
              무대 화면 다시 보기 🎤
            </a>
          </div>
        ) : null}
      </div>

      {idx > 0 ? (
        <div className="mt-3 flex justify-end">
          <button type="button" disabled={busy} onClick={back} className={btn("ghost", "sm")}>
            ↩ 이전 단계로
          </button>
        </div>
      ) : null}
    </Panel>
  );
}
