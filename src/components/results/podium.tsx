import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate, RankedEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RANK_STYLE, podiumGroups, rankLabel, type RankGroup } from "./rank-utils";

type Variant = "site" | "stage";

const V = {
  site: {
    name: "font-display text-lg leading-tight sm:text-xl",
    title: "text-xs text-muted sm:text-sm",
    crown: "text-3xl sm:text-4xl",
    rank: "font-display text-5xl sm:text-6xl",
    votes: "text-sm sm:text-base",
    heights: { 1: "h-40 sm:h-52", 2: "h-28 sm:h-36", 3: "h-20 sm:h-28" } as Record<number, string>,
    person: "max-w-[9.5rem]",
    avatar1: "",
    avatar: "",
  },
  stage: {
    name: "font-display text-stage-name text-white",
    title: "text-stage-min text-muted-night",
    crown: "text-stage-h2",
    rank: "font-display text-stage-rank",
    votes: "text-stage-body",
    heights: { 1: "h-64", 2: "h-44", 3: "h-28" } as Record<number, string>,
    person: "max-w-60",
    avatar1: "size-32 text-[calc(var(--stage-u)*5.5)]",
    avatar: "size-24 text-[calc(var(--stage-u)*4)]",
  },
} as const;

/**
 * 2nd left · 1st centre (taller, 👑) · 3rd right. Ties share one step; only votes > 0.
 * `visibleRank`: ranks ≥ this are revealed, the rest show a drum (used by the reveal sequence).
 */
export function Podium({
  ranking,
  candidates,
  variant = "site",
  visibleRank = 1,
  className,
}: {
  ranking: readonly RankedEntry[];
  candidates: readonly PublicCandidate[];
  variant?: Variant;
  visibleRank?: number;
  className?: string;
}) {
  const groups = podiumGroups(ranking, candidates);
  const ordered = [2, 1, 3]
    .map((rank) => groups.find((g) => g.rank === rank))
    .filter((g): g is RankGroup => Boolean(g));
  if (ordered.length === 0) return null;

  return (
    <div className={cn("flex w-full items-end justify-center gap-2 sm:gap-4", className)}>
      {ordered.map((group) => (
        <PodiumStep key={group.rank} group={group} variant={variant} hidden={group.rank < visibleRank} />
      ))}
    </div>
  );
}

function PodiumStep({ group, variant, hidden }: { group: RankGroup; variant: Variant; hidden: boolean }) {
  const v = V[variant];
  const style = RANK_STYLE[group.rank] ?? RANK_STYLE[3];
  const isFirst = group.rank === 1;
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-end", isFirst ? "flex-[1.25]" : "flex-1")}>
      <div className="mb-3 flex min-h-24 flex-wrap items-end justify-center gap-x-3 gap-y-3">
        {hidden ? (
          <span className={cn("inline-block animate-drumroll", v.crown)} aria-label="공개 대기 중">
            🥁
          </span>
        ) : (
          group.people.map(({ candidate }) => (
            <div key={candidate.id} className={cn("flex animate-pop-in flex-col items-center text-center", v.person)}>
              {isFirst && (
                <span aria-hidden className={cn("mb-1 inline-block animate-float", v.crown)}>
                  👑
                </span>
              )}
              <Avatar
                emoji={candidate.emoji}
                color={candidate.color}
                size={isFirst ? "xl" : "lg"}
                className={cn("shadow-brutal", isFirst ? v.avatar1 : v.avatar, isFirst && "shadow-glow-ticket")}
              />
              <p className={cn("mt-2 w-full truncate", v.name)}>{candidate.name}</p>
              <p className={cn("line-clamp-2 w-full", v.title)}>{candidate.title}</p>
            </div>
          ))
        )}
      </div>
      <div
        className={cn(
          "relative flex w-full flex-col items-center justify-start gap-1 rounded-t-card border-[3px] border-ink pt-3 text-ink shadow-brutal-md",
          style.block,
          v.heights[group.rank] ?? v.heights[3],
        )}
      >
        <span className={cn("leading-none", v.rank)}>{group.rank}</span>
        <span className="text-xs font-bold sm:text-sm">{hidden ? "???" : rankLabel(group)}</span>
        {!hidden && <span className={cn("lcd mt-1 px-2.5 py-1 font-mono font-bold", v.votes)}>{group.votes}표</span>}
      </div>
    </div>
  );
}
