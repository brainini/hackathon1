import "server-only";
import type { FunStats, RankedEntry, Results } from "@/lib/types";
import type { BallotRecord, CandidateRecord } from "./store/types";

/** Pure tallying / ranking. No I/O, no clock — everything is derived from the inputs. */

/** min(votesPerVoter, max(0, candidateCount − 1)) */
export function effectiveVotes(votesPerVoter: number, candidateCount: number): number {
  return Math.min(votesPerVoter, Math.max(0, candidateCount - 1));
}

export interface ValidBallot {
  ballot: BallotRecord;
  /** Deduplicated picks that still exist and are not the voter. */
  picks: string[];
}

export interface Tally {
  /** voterId → valid ballot. */
  valid: Map<string, ValidBallot>;
  /** candidateId → votes (every candidate present, 0 by default). */
  votes: Map<string, number>;
}

/**
 * A ballot is valid when its voter still exists and it has ≥ 1 pick that exists and is not the
 * voter (duplicates ignored). Each valid pick is one vote.
 */
export function tallyBallots(candidates: readonly CandidateRecord[], ballots: readonly BallotRecord[]): Tally {
  const ids = new Set(candidates.map((c) => c.id));
  const votes = new Map<string, number>(candidates.map((c) => [c.id, 0]));
  const valid = new Map<string, ValidBallot>();
  for (const ballot of ballots) {
    if (!ids.has(ballot.voterId) || valid.has(ballot.voterId)) continue;
    const picks = [...new Set(ballot.picks)].filter((id) => ids.has(id) && id !== ballot.voterId);
    if (picks.length === 0) continue;
    valid.set(ballot.voterId, { ballot, picks });
    for (const id of picks) votes.set(id, (votes.get(id) ?? 0) + 1);
  }
  return { valid, votes };
}

function compareNames(a: CandidateRecord, b: CandidateRecord): number {
  return a.name.localeCompare(b.name, "ko") || a.entryNo - b.entryNo || a.id.localeCompare(b.id);
}

/** Full results: every candidate, votes desc then name asc, competition ranking (1, 1, 3). */
export function computeResults(
  candidates: readonly CandidateRecord[],
  tally: Tally,
  votingStartedAt: number | null,
): Results {
  const votesOf = (c: CandidateRecord) => tally.votes.get(c.id) ?? 0;
  const totalBallots = tally.valid.size;
  let totalVotes = 0;
  for (const v of tally.valid.values()) totalVotes += v.picks.length;

  const sorted = [...candidates].sort((a, b) => votesOf(b) - votesOf(a) || compareNames(a, b));
  const ranking: RankedEntry[] = [];
  let rank = 0;
  let previous = Number.NaN;
  sorted.forEach((candidate, index) => {
    const votes = votesOf(candidate);
    if (votes !== previous) {
      rank = index + 1;
      previous = votes;
    }
    ranking.push({ candidateId: candidate.id, rank, votes, share: totalBallots > 0 ? votes / totalBallots : 0 });
  });

  return {
    totalBallots,
    totalVotes,
    ranking,
    isFullRanking: true,
    funStats: computeFunStats(candidates.length, tally, ranking, votingStartedAt),
  };
}

function computeFunStats(
  candidateCount: number,
  tally: Tally,
  ranking: readonly RankedEntry[],
  votingStartedAt: number | null,
): FunStats {
  const ordered = [...tally.valid.values()].sort(
    (a, b) => a.ballot.createdAt - b.ballot.createdAt || a.ballot.voterId.localeCompare(b.ballot.voterId),
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const start = votingStartedAt ?? first?.ballot.createdAt ?? 0;
  const secondsAfterStart = (t: number) => Math.max(0, Math.round((t - start) / 1000));

  const topVotes = ranking[0]?.votes ?? 0;
  const runnerUp = ranking.find((entry) => entry.votes < topVotes);

  return {
    fastestVoter: first
      ? { candidateId: first.ballot.voterId, secondsAfterStart: secondsAfterStart(first.ballot.createdAt) }
      : null,
    mostDeliberateVoter:
      ordered.length >= 2 && last
        ? { candidateId: last.ballot.voterId, secondsAfterStart: secondsAfterStart(last.ballot.createdAt) }
        : null,
    turnout: candidateCount > 0 ? Math.min(1, tally.valid.size / candidateCount) : 0,
    marginTop: topVotes > 0 && runnerUp ? topVotes - runnerUp.votes : null,
  };
}

/** Public view: when showFullRanking is off only the podium (rank ≤ 3 with votes > 0) is exposed. */
export function publicResults(full: Results, showFullRanking: boolean): Results {
  if (showFullRanking) return { ...full, isFullRanking: true };
  return {
    ...full,
    ranking: full.ranking.filter((entry) => entry.rank <= 3 && entry.votes > 0),
    isFullRanking: false,
  };
}
