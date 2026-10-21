"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { ProjectImage } from "@/components/brand/project-image";
import { getErrorMessage } from "@/lib/api-client";
import { useAppState } from "@/lib/hooks/use-app-state";
import type { PublicCandidate, Results } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fireConfetti } from "./confetti";
import { FunStatsCards } from "./fun-stats";
import { Leaderboard } from "./leaderboard";
import { Podium } from "./podium";

export function ResultsClient() {
  const { state, error, refresh } = useAppState();

  if (!state) {
    return (
      <Shell>
        {error ? (
          <WaitingCard emoji="📶" title="결과를 못 불러왔어요" body={getErrorMessage(error)}>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-5 rounded-field border-[3px] border-ink bg-ticket px-5 py-2.5 font-bold shadow-brutal transition-transform active:translate-y-0.5"
            >
              다시 시도 🔄
            </button>
          </WaitingCard>
        ) : (
          <WaitingCard emoji="✉️" title="결과 봉투 여는 중…" body="티켓 인쇄 중 🎟️" pulse />
        )}
      </Shell>
    );
  }

  if (state.phase === "registration" || state.phase === "voting") {
    return (
      <Shell>
        <WaitingCard emoji="⏳" title="아직 결과가 없어요" body="투표가 끝나야 공개돼요. 그동안 마음속 원픽을 두 개로 줄여보세요 🤔" />
      </Shell>
    );
  }

  if (state.phase === "closed" || !state.results) {
    return (
      <Shell>
        <WaitingCard emoji="🥁" title="두구두구두구…" body="결과는 무대에서 공개됩니다 🎤 화면이 저절로 바뀌니 조금만 기다려요" drum />
      </Shell>
    );
  }

  return (
    <Shell>
      <RevealedResults results={state.results} candidates={state.candidates} />
    </Shell>
  );
}

function RevealedResults({ results, candidates }: { results: Results; candidates: PublicCandidate[] }) {
  const hasVotes = results.totalBallots > 0;
  const [visibleRank, setVisibleRank] = useState(hasVotes ? 4 : 1);
  const [playKey, setPlayKey] = useState(0);
  const celebrated = useRef(-1);

  useEffect(() => {
    if (!hasVotes) return;
    const timers = [
      window.setTimeout(() => setVisibleRank((v) => Math.min(v, 3)), 700),
      window.setTimeout(() => setVisibleRank((v) => Math.min(v, 2)), 1900),
      window.setTimeout(() => {
        setVisibleRank(1);
        if (celebrated.current !== playKey) {
          celebrated.current = playKey;
          void fireConfetti("big");
        }
      }, 3100),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [hasVotes, playKey]);

  const playing = visibleRank > 1;

  return (
    <div className="space-y-12">
      <header className="text-center">
        <p className="caption text-note text-ticket">오늘의 MVP 🏆</p>
        <h1 className="mt-3 font-display text-h1">투표 결과 발표</h1>
        <p className="mt-2 text-muted">모두 수고했어요. 오늘 만든 건 전부 진짜 서비스입니다 💪</p>
      </header>

      {hasVotes ? (
        <section aria-label="시상대" className="rounded-sheet border-[3px] border-ink bg-card px-3 pt-8 shadow-brutal-lg sm:px-8">
          <Podium ranking={results.ranking} candidates={candidates} visibleRank={visibleRank} />
          <div className="flex items-center justify-center gap-3 border-t-[3px] border-ink py-4">
            {playing ? (
              <button
                type="button"
                onClick={() => {
                  celebrated.current = playKey;
                  setVisibleRank(1);
                  void fireConfetti("burst");
                }}
                className="rounded-chip border-[3px] border-ink bg-paper-2 px-4 py-2 text-sm font-bold shadow-brutal-sm"
              >
                바로 보기 ⏩
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVisibleRank(4);
                  setPlayKey((k) => k + 1);
                }}
                className="rounded-chip border-[3px] border-ink bg-ticket px-4 py-2 text-sm font-bold shadow-brutal-sm"
              >
                다시 보기 🔁
              </button>
            )}
          </div>
        </section>
      ) : (
        <WaitingCard emoji="🦗" title="아무도 투표하지 않았어요…" body="귀뚜라미 소리만 들려요. 그래도 모두의 작품은 진짜였어요 👏" />
      )}

      {hasVotes && (
        <section aria-label="특별상">
          <h2 className="mb-4 font-display text-h2">특별상 🎁</h2>
          <FunStatsCards results={results} candidates={candidates} />
        </section>
      )}

      {results.isFullRanking ? (
        <section aria-label="전체 순위">
          <h2 className="mb-4 font-display text-h2">전체 순위 📊</h2>
          <Leaderboard results={results} candidates={candidates} />
        </section>
      ) : (
        <section aria-label="모든 참가자">
          <h2 className="mb-1 font-display text-h2">모든 참가자에게 박수 👏</h2>
          <p className="mb-5 text-muted">순위는 시상대까지만! 나머지는 전부 공동 MVP예요.</p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {candidates.map((c) => (
              <li key={c.id} className="overflow-hidden rounded-card border-[3px] border-ink bg-card shadow-brutal-sm">
                <ProjectImage candidate={c} className="border-b-[3px] border-ink" />
                <div className="flex items-center gap-2 p-3">
                  <Avatar emoji={c.emoji} color={c.color} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="truncate text-xs text-muted">{c.title}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">{children}</div>;
}

function WaitingCard({
  emoji,
  title,
  body,
  drum,
  pulse,
  children,
}: {
  emoji: string;
  title: string;
  body: string;
  drum?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-sheet border-[3px] border-ink bg-card px-6 py-12 text-center shadow-brutal-lg">
      <div
        aria-hidden
        className={cn("inline-block text-7xl", drum && "animate-drumroll", pulse && "animate-float")}
      >
        {emoji}
      </div>
      <h1 className="mt-4 font-display text-h2">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      {children}
    </div>
  );
}
