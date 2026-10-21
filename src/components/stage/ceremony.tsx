"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { fireConfetti } from "@/components/results/confetti";
import { buildAwards } from "@/components/results/fun-stats";
import { Podium } from "@/components/results/podium";
import { RANK_STYLE, podiumGroups, rankLabel, type RankGroup } from "@/components/results/rank-utils";
import type { PublicCandidate, Results } from "@/lib/types";
import { clamp, cn, formatPercent } from "@/lib/utils";

type Step = { kind: "intro" } | { kind: "awards" } | { kind: "rank"; group: RankGroup } | { kind: "podium" };

export function Ceremony({
  results,
  candidates,
  canPublish,
  onPublish,
}: {
  results: Results;
  candidates: PublicCandidate[];
  canPublish: boolean;
  onPublish: () => Promise<void>;
}) {
  const groups = podiumGroups(results.ranking, candidates);
  const awards = buildAwards(results, candidates).filter((a) => a.candidate);
  const steps: Step[] = [
    { kind: "intro" },
    ...(awards.length > 0 ? [{ kind: "awards" } as const] : []),
    ...[3, 2, 1].flatMap((r): Step[] => {
      const group = groups.find((g) => g.rank === r);
      return group ? [{ kind: "rank", group }] : [];
    }),
    ...(groups.length > 0 ? [{ kind: "podium" } as const] : []),
  ];

  const [rawStep, setStep] = useState(0);
  const [drumming, setDrumming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const step = clamp(rawStep, 0, steps.length - 1);
  const current = steps[step];
  const isTopReveal = current.kind === "rank" && current.group.rank === 1;
  const isLast = step === steps.length - 1;

  function go(delta: number) {
    const next = clamp(step + delta, 0, steps.length - 1);
    if (next === step) return;
    const target = steps[next];
    if (delta > 0 && target.kind === "rank" && target.group.rank === 1) setDrumming(true);
    if (delta > 0 && target.kind === "podium") void fireConfetti("burst");
    setStep(next);
  }

  // 1위 drumroll → reveal + confetti (setState only inside the timer callback)
  useEffect(() => {
    if (!isTopReveal || !drumming) return;
    const t = window.setTimeout(() => {
      setDrumming(false);
      void fireConfetti("big");
    }, 2200);
    return () => window.clearTimeout(t);
  }, [isTopReveal, drumming]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const onControl = e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select");
    if (onControl && (e.key === " " || e.key === "Enter")) return;
    if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter" || e.key === "PageDown") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      go(-1);
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function publish() {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-16 text-center">
        {current.kind === "intro" && (
          <div key="intro" className="flex animate-rise flex-col items-center gap-6">
            <p className="caption text-stage-h2 text-ticket">결과 발표 🎤</p>
            {results.totalBallots > 0 ? (
              <>
                <p className="font-display text-stage-mega">
                  총 <span className="text-ticket">{results.totalVotes}</span>표
                </p>
                <p className="text-stage-title text-muted-night">
                  {results.totalBallots}명이 투표했어요 · 투표율 {formatPercent(results.funStats.turnout)}
                </p>
              </>
            ) : (
              <p className="font-display text-stage-hero">아무도 투표하지 않았어요… 🦗</p>
            )}
          </div>
        )}

        {current.kind === "awards" && (
          <div key="awards" className="flex w-full animate-rise flex-col items-center gap-10">
            <p className="caption text-stage-h2 text-sky">특별상부터 갑니다 🎁</p>
            <div className="flex w-full justify-center gap-10">
              {awards.map((a, i) =>
                a.candidate ? (
                  <div
                    key={a.key}
                    className={cn(
                      "flex w-[40%] animate-pop-in flex-col items-center gap-4 rounded-sheet border-4 border-ink bg-card px-8 py-8 text-ink",
                      i % 2 === 0 ? "-rotate-2 shadow-stage-pop" : "rotate-2 shadow-stage-sky",
                    )}
                    style={{ animationDelay: `${i * 250}ms` }}
                  >
                    <p className="font-display text-stage-h2">
                      {a.emoji} {a.title}
                    </p>
                    <Avatar emoji={a.candidate.emoji} color={a.candidate.color} size="xl" className="size-28 text-[calc(var(--stage-u)*4.6)]" />
                    <p className="font-display text-stage-name">{a.candidate.name}</p>
                    <p className="text-stage-body text-muted">{a.value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}

        {current.kind === "rank" && (
          <RankReveal key={`rank-${current.group.rank}`} group={current.group} drumming={isTopReveal && drumming} />
        )}

        {current.kind === "podium" && (
          <div key="podium" className="flex w-full animate-rise flex-col items-center gap-6">
            <p className="caption text-stage-h2 text-ticket">오늘의 MVP 🏆</p>
            <Podium ranking={results.ranking} candidates={candidates} variant="stage" className="max-w-[80%]" />
            <p className="text-stage-body text-muted-night">모두 수고했어요. 오늘 만든 건 전부 진짜 서비스입니다 💪</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-6 border-t-4 border-ink bg-night-2/80 px-10 py-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={step === 0}
          className="rounded-chip border-4 border-ink bg-night-3 px-6 py-2.5 font-bold text-stage-body disabled:opacity-30"
        >
          ← 이전
        </button>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <span
                key={i}
                className={cn("size-3 rounded-full border-2 border-ink", i === step ? "bg-ticket" : i < step ? "bg-muted-night" : "bg-night-3")}
              />
            ))}
          </div>
          <span className="text-stage-min text-muted-night">Space · → 다음 / ← 이전</span>
          {isLast && canPublish && (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="animate-pulse-once rounded-chip border-4 border-ink bg-pop px-6 py-2.5 font-display text-stage-body text-white shadow-brutal disabled:opacity-60"
            >
              {publishing ? "공개하는 중…" : "📢 모두의 화면에 결과 공개"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isLast}
          className="rounded-chip border-4 border-ink bg-ticket px-6 py-2.5 font-bold text-ink text-stage-body disabled:opacity-30"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}

function RankReveal({ group, drumming }: { group: RankGroup; drumming: boolean }) {
  const style = RANK_STYLE[group.rank] ?? RANK_STYLE[3];
  const isFirst = group.rank === 1;
  return (
    <div className="flex w-full animate-rise flex-col items-center gap-8">
      <p className={cn("rounded-card border-4 border-ink px-10 py-2 font-display text-stage-rank text-ink shadow-brutal-lg", style.block)}>
        {style.medal} {rankLabel(group)}
      </p>
      {drumming ? (
        <div className="flex flex-col items-center gap-4">
          <span aria-hidden className="inline-block animate-drumroll text-stage-mega">
            🥁
          </span>
          <p className="font-display text-stage-hero">두구두구두구…</p>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-start justify-center gap-14">
          {group.people.map(({ candidate }, i) => (
            <div
              key={candidate.id}
              className="flex max-w-[34%] animate-stamp flex-col items-center gap-3"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              {isFirst && (
                <span aria-hidden className="inline-block animate-float text-stage-hero">
                  👑
                </span>
              )}
              <Avatar
                emoji={candidate.emoji}
                color={candidate.color}
                size="xl"
                className={cn(
                  isFirst ? "size-48 text-[calc(var(--stage-u)*8)] shadow-glow-ticket" : "size-40 text-[calc(var(--stage-u)*6.5)]",
                )}
              />
              <p className="font-display text-stage-hero">{candidate.name}</p>
              <p className="line-clamp-2 text-stage-title text-muted-night">{candidate.title}</p>
              <p className="lcd px-6 py-2 font-mono text-stage-h2">{group.votes}표</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
