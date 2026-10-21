import type { PublicCandidate, RankedEntry } from "@/lib/types";

export interface RankedPerson {
  entry: RankedEntry;
  candidate: PublicCandidate;
}

export interface RankGroup {
  rank: number;
  votes: number;
  people: RankedPerson[];
}

/** Podium groups (rank 1–3, votes > 0), ascending by rank. Ties share one group. */
export function podiumGroups(ranking: readonly RankedEntry[], candidates: readonly PublicCandidate[]): RankGroup[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const groups = new Map<number, RankGroup>();
  for (const entry of ranking) {
    if (entry.rank > 3 || entry.votes <= 0) continue;
    const candidate = byId.get(entry.candidateId);
    if (!candidate) continue;
    const group = groups.get(entry.rank) ?? { rank: entry.rank, votes: entry.votes, people: [] };
    group.people.push({ entry, candidate });
    groups.set(entry.rank, group);
  }
  return [...groups.values()].sort((a, b) => a.rank - b.rank);
}

export function rankLabel(group: RankGroup): string {
  return group.people.length > 1 ? `공동 ${group.rank}위` : `${group.rank}위`;
}

export const RANK_STYLE: Record<number, { block: string; medal: string; height: string }> = {
  1: { block: "bg-gold", medal: "🥇", height: "h-44 sm:h-56" },
  2: { block: "bg-silver", medal: "🥈", height: "h-32 sm:h-40" },
  3: { block: "bg-bronze", medal: "🥉", height: "h-24 sm:h-28" },
};
