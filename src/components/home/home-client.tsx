"use client";

import { useAppState } from "@/lib/hooks/use-app-state";
import type { PublicCandidate } from "@/lib/types";
import { getErrorMessage } from "@/lib/api-client";
import { Gallery } from "./gallery";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { PhaseStepper } from "./phase-stepper";

function Ticker({ candidates }: { candidates: PublicCandidate[] }) {
  if (candidates.length === 0) return null;
  const items = [...candidates, ...candidates];
  return (
    <div className="mt-12 overflow-hidden py-2" aria-hidden="true">
      <div className="-rotate-1 overflow-hidden border-y-[3px] border-ink bg-ink py-3 text-ticket">
        <div className="flex w-max gap-8 font-display text-xl whitespace-nowrap motion-safe:animate-marquee">
          {items.map((c, i) => (
            <span key={`${c.id}-${i}`} className="flex items-center gap-3">
              <span>{c.emoji}</span>
              {c.title}
              <span className="text-pop">★</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="불러오는 중">
      <div className="h-8 w-40 rounded-full bg-ink/10" />
      <div className="mt-6 h-14 w-full max-w-xl rounded-card bg-ink/10" />
      <div className="mt-3 h-20 w-4/5 max-w-lg rounded-card bg-ink/10" />
      <div className="mt-8 h-16 w-60 rounded-full bg-ticket/60" />
      <div className="mt-12 h-36 rounded-sheet bg-ink/10" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 rounded-card bg-ink/10" />
        ))}
      </div>
      <p className="mt-6 text-center font-hand text-note text-muted">티켓 인쇄 중 🎟️</p>
    </div>
  );
}

export function HomeClient() {
  const { state, error, refresh } = useAppState();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-20 sm:px-6 lg:px-8">
      {!state ? (
        error ? (
          <div className="mx-auto mt-16 max-w-md rounded-sheet border-[3px] border-ink bg-card p-8 text-center shadow-brutal-lg">
            <p className="text-5xl" aria-hidden="true">
              📶
            </p>
            <p className="mt-4 font-display text-h3">{getErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-6 rounded-full border-[3px] border-ink bg-ticket px-6 py-3 font-display text-lg shadow-brutal transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              다시 시도 🔄
            </button>
          </div>
        ) : (
          <HomeSkeleton />
        )
      ) : (
        <>
          <Hero state={state} />
          <div className="mt-10">
            <PhaseStepper phase={state.phase} />
          </div>
          <Ticker candidates={state.candidates} />
          <Gallery state={state} />
          <HowItWorks />
        </>
      )}
    </div>
  );
}
