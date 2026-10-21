import { PHASE_META } from "@/lib/constants";
import { PHASES, type Phase } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 접수 → 투표 → 마감 → 발표, the current station highlighted. */
export function PhaseStepper({ phase }: { phase: Phase }) {
  const current = PHASES.indexOf(phase);
  return (
    <section aria-label="진행 단계" className="rounded-sheet border-[3px] border-ink bg-card p-4 shadow-brutal-md sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-h3">
          지금은 <span className="marker">{PHASE_META[phase].label}</span> {PHASE_META[phase].emoji}
        </h2>
        <p className="text-sm font-semibold text-muted">{PHASE_META[phase].blurb}</p>
      </div>
      <ol className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-3">
        {PHASES.map((p, i) => {
          const meta = PHASE_META[p];
          const done = i < current;
          const active = i === current;
          return (
            <li key={p} className="relative flex flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[22px] right-1/2 -z-0 h-[3px] w-full -translate-y-1/2 sm:top-7",
                    i <= current ? "bg-ink" : "bg-ink/20",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-11 place-items-center rounded-full border-[3px] border-ink text-xl transition-transform sm:size-14 sm:text-2xl",
                  active && "scale-110 bg-ticket shadow-brutal-sm motion-safe:animate-pop-in",
                  done && "bg-mint",
                  !active && !done && "bg-paper-2 opacity-70",
                )}
              >
                {done ? "✓" : meta.emoji}
                {active && (
                  <span aria-hidden="true" className="absolute inset-0 rounded-full ring-4 ring-pop/50 motion-safe:animate-pulse-ring" />
                )}
              </span>
              <span className={cn("font-display text-base sm:text-lg", !active && !done && "text-muted")}>{meta.station}</span>
              {active && (
                <span className="-mt-1 rotate-[-4deg] font-hand text-sm text-pop-ink sm:text-base">지금 여기!</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
