import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate, Results } from "@/lib/types";
import { cn, formatDuration, formatPercent } from "@/lib/utils";

export interface Award {
  key: string;
  emoji: string;
  title: string;
  note: string;
  candidate?: PublicCandidate;
  value: string;
  tone: string;
}

export function buildAwards(results: Results, candidates: readonly PublicCandidate[]): Award[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const { fastestVoter, mostDeliberateVoter, turnout } = results.funStats;
  const awards: Award[] = [];
  const fast = fastestVoter ? byId.get(fastestVoter.candidateId) : undefined;
  if (fastestVoter && fast) {
    awards.push({
      key: "fast",
      emoji: "⚡",
      title: "번개손 상",
      note: "가장 먼저 투표",
      candidate: fast,
      value: `시작 ${formatDuration(fastestVoter.secondsAfterStart)} 만에 투표!`,
      tone: "bg-ticket",
    });
  }
  const slow = mostDeliberateVoter ? byId.get(mostDeliberateVoter.candidateId) : undefined;
  if (mostDeliberateVoter && slow) {
    awards.push({
      key: "slow",
      emoji: "🐢",
      title: "신중함의 아이콘 상",
      note: "가장 오래 고민",
      candidate: slow,
      value: `${formatDuration(mostDeliberateVoter.secondsAfterStart)} 동안 고민했어요`,
      tone: "bg-mint",
    });
  }
  awards.push({
    key: "turnout",
    emoji: "🗳️",
    title: "투표율",
    note: `${candidates.length}명 중 ${results.totalBallots}명 참여`,
    value: formatPercent(turnout),
    tone: "bg-sky",
  });
  return awards;
}

/** ⚡ 번개손 상 · 🐢 신중함의 아이콘 상 · 🗳️ 투표율 */
export function FunStatsCards({
  results,
  candidates,
  className,
}: {
  results: Results;
  candidates: readonly PublicCandidate[];
  className?: string;
}) {
  const awards = buildAwards(results, candidates);
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {awards.map((a, i) => (
        <article
          key={a.key}
          className={cn(
            "animate-rise rounded-card border-[3px] border-ink bg-card p-4 text-ink shadow-brutal",
            i % 2 === 0 ? "-rotate-1" : "rotate-1",
          )}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="flex items-center gap-2">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink text-xl", a.tone)}>
              {a.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-tight">{a.title}</h3>
              <p className="text-xs text-muted">{a.note}</p>
            </div>
          </div>
          {a.candidate ? (
            <div className="mt-3 flex items-center gap-3">
              <Avatar emoji={a.candidate.emoji} color={a.candidate.color} size="md" />
              <div className="min-w-0">
                <p className="truncate font-bold">{a.candidate.name}</p>
                <p className="text-sm text-muted">{a.value}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 font-display text-4xl tabular-nums">{a.value}</p>
          )}
        </article>
      ))}
    </div>
  );
}
