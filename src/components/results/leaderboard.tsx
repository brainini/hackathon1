import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate, Results } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";
import { RANK_STYLE } from "./rank-utils";

/** Full ranking with vote bars (render only when results.isFullRanking). */
export function Leaderboard({ results, candidates }: { results: Results; candidates: readonly PublicCandidate[] }) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const max = Math.max(1, ...results.ranking.map((r) => r.votes));
  return (
    <ol className="space-y-2.5">
      {results.ranking.map((entry, i) => {
        const c = byId.get(entry.candidateId);
        if (!c) return null;
        const medal = entry.votes > 0 ? RANK_STYLE[entry.rank]?.block : undefined;
        return (
          <li
            key={entry.candidateId}
            className="flex items-center gap-3 rounded-card border-[3px] border-ink bg-card px-3 py-2.5 shadow-brutal-sm sm:px-4"
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink font-display text-lg",
                medal ?? "bg-paper-2",
              )}
            >
              {entry.rank}
            </span>
            <Avatar emoji={c.emoji} color={c.color} size="md" className="hidden sm:inline-grid" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate font-bold">
                  {c.name} <span className="font-normal text-muted">· {c.title}</span>
                </p>
                <span className="shrink-0 font-mono font-bold tabular-nums">
                  {entry.votes}표 <span className="text-sm font-normal text-muted">({formatPercent(entry.share)})</span>
                </span>
              </div>
              <div className="mt-1.5 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
                <div
                  className="h-full origin-left rounded-full bg-pop transition-transform duration-1000 ease-snap starting:scale-x-0"
                  style={{ width: `${(entry.votes / max) * 100}%`, transitionDelay: `${Math.min(i, 12) * 70}ms` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
