import "server-only";
import path from "node:path";
import type { AdminState, AdminWarning, MeInfo, PublicCandidate, PublicState, StorageKind } from "@/lib/types";
import { adminPassword, dataDir, DEV_ADMIN_PASSWORD } from "./env";
import { computeResults, effectiveVotes, publicResults, tallyBallots, type Tally } from "./results";
import type { CandidateRecord, Snapshot } from "./store/types";

/** Projections from stored records to the public contract (never leaks pinHash / ballots). */

export function toPublicCandidate(rec: CandidateRecord, hasVoted: boolean): PublicCandidate {
  return {
    id: rec.id,
    name: rec.name,
    title: rec.title,
    description: rec.description,
    link: rec.link,
    emoji: rec.emoji,
    color: rec.color,
    imageUrl: rec.imageId ? `/api/images/${rec.imageId}` : null,
    entryNo: rec.entryNo,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    hasVoted,
  };
}

export function meInfo(rec: CandidateRecord, tally: Tally): MeInfo {
  const ballot = tally.valid.get(rec.id);
  return {
    id: rec.id,
    name: rec.name,
    picks: ballot ? ballot.picks : null,
    votedAt: ballot ? ballot.ballot.updatedAt : null,
  };
}

function commonState(snap: Snapshot, tally: Tally) {
  return {
    version: snap.version,
    phase: snap.meta.phase,
    phaseChangedAt: snap.meta.phaseChangedAt,
    votingStartedAt: snap.meta.votingStartedAt,
    settings: snap.meta.settings,
    effectiveVotes: effectiveVotes(snap.meta.settings.votesPerVoter, snap.candidates.length),
    candidates: snap.candidates.map((c) => toPublicCandidate(c, tally.valid.has(c.id))),
    stats: { candidateCount: snap.candidates.length, ballotCount: tally.valid.size },
  };
}

export function buildPublicState(
  snap: Snapshot,
  storage: StorageKind,
  meId: string | null,
  now: number,
): PublicState {
  const tally = tallyBallots(snap.candidates, snap.ballots);
  const me = meId ? snap.candidates.find((c) => c.id === meId) : undefined;
  const revealed = snap.meta.phase === "revealed";
  return {
    unchanged: false,
    ...commonState(snap, tally),
    serverTime: now,
    me: me ? meInfo(me, tally) : null,
    results: revealed
      ? publicResults(
          computeResults(snap.candidates, tally, snap.meta.votingStartedAt),
          snap.meta.settings.showFullRanking,
        )
      : null,
    storage,
  };
}

export function buildAdminState(snap: Snapshot, storage: StorageKind, now: number): AdminState {
  const tally = tallyBallots(snap.candidates, snap.ballots);
  const common = commonState(snap, tally);
  return {
    ...common,
    serverTime: now,
    votingClosedAt: snap.meta.votingClosedAt,
    results: computeResults(snap.candidates, tally, snap.meta.votingStartedAt),
    warnings: buildWarnings(snap, storage, tally, common.effectiveVotes),
    storage,
  };
}

function buildWarnings(snap: Snapshot, storage: StorageKind, tally: Tally, effective: number): AdminWarning[] {
  const warnings: AdminWarning[] = [];
  const { phase, settings } = snap.meta;
  const count = snap.candidates.length;

  if (storage === "memory") {
    warnings.push({
      level: "danger",
      message:
        "Redis가 연결되지 않아 서버가 재시작되면 데이터가 사라져요. Vercel → Storage에서 Upstash Redis를 연결하세요",
    });
  } else if (storage === "file") {
    warnings.push({
      level: "info",
      message: `로컬 개발 모드: ${path.basename(dataDir())} 폴더에 저장 중이에요 💾`,
    });
  }

  if (adminPassword() === DEV_ADMIN_PASSWORD) {
    warnings.push({
      level: "warn",
      message: "관리자 비밀번호가 기본값(admin)이에요 🔐 배포 전에 ADMIN_PASSWORD 환경변수를 꼭 바꿔주세요",
    });
  }

  if (phase === "voting" && count < 2) {
    warnings.push({
      level: "danger",
      message: `투표 중인데 참가자가 ${count}명뿐이라 아무도 투표할 수 없어요 😶`,
    });
  } else if (count < settings.votesPerVoter + 1) {
    warnings.push({
      level: "info",
      message: `${settings.votesPerVoter}표 투표엔 최소 ${settings.votesPerVoter + 1}명이 필요해요 (지금 ${count}명) — 그 전까지 1인당 티켓은 ${effective}장이에요`,
    });
  }

  if (phase !== "registration") {
    let mismatched = 0;
    for (const v of tally.valid.values()) if (v.picks.length !== effective) mismatched += 1;
    if (mismatched > 0) {
      warnings.push({
        level: "info",
        message: `투표 도중 규칙이 바뀌었어요: 지금 규칙(티켓 ${effective}장)과 장수가 다른 표가 ${mismatched}장 있어요. 이미 낸 표는 그대로 집계돼요`,
      });
    }
  }

  const demo = snap.candidates.filter((c) => c.demo).length;
  if (demo > 0) {
    warnings.push({
      level: "warn",
      message: `🧪 데모 참가자 ${demo}명이 섞여 있어요. 진짜 투표 전에 삭제하거나 '전체 초기화'로 지워주세요`,
    });
  }

  return warnings;
}
