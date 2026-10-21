import type { ColorKey, Phase, Settings } from "./types";

/** Shared constants — safe to import from both server and client code. */

export const APP_NAME = "TWOPICK";
export const APP_TAGLINE = "원픽은 너무 가혹하니까, 두 개 고르세요";

export const LIMITS = {
  name: { min: 1, max: 20 },
  title: { min: 1, max: 40 },
  description: { min: 1, max: 280 },
  link: { max: 300 },
  eventTitle: { min: 1, max: 40 },
  pinLength: 4,
  votesPerVoter: { min: 1, max: 5 },
  maxCandidates: 100,
  /** Decoded bytes accepted by the server for one screenshot. */
  imageMaxBytes: 1_500_000,
  /** What the client compressor aims for (decoded bytes). */
  imageTargetBytes: 450_000,
  /** Longest edge after client-side resize. */
  imageMaxEdge: 1600,
  seedMax: 30,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  eventTitle: "1인 해커톤 데모데이",
  votesPerVoter: 2,
  allowVoteChange: true,
  showFullRanking: false,
};

/** Avatar emoji choices. The server rejects anything not in this list. */
export const EMOJIS = [
  "🦊", "🐼", "🐸", "🦄", "🐙", "🐯", "🐧", "🦖",
  "🐳", "🦉", "🐝", "🐰", "🐻", "🐱", "🐶", "🦁",
  "🐨", "🐵", "🦦", "🦔", "👾", "🤖", "🚀", "🔥",
  "🌈", "🍕", "🧃", "☕", "🎧", "🎮", "🛸", "🌵",
] as const;

/** Participant accent colours. Text on top of every one of these is ink (#141414). */
export const COLORS: Record<ColorKey, { hex: string; label: string }> = {
  yellow: { hex: "#FFD23F", label: "티켓 옐로" },
  pink: { hex: "#FF6FA8", label: "핫 핑크" },
  mint: { hex: "#3DDC97", label: "민트" },
  sky: { hex: "#4CC9F0", label: "스카이" },
  grape: { hex: "#B197FC", label: "그레이프" },
  tangerine: { hex: "#FF9F43", label: "귤" },
  lime: { hex: "#B8F35A", label: "라임" },
  coral: { hex: "#FF7F6E", label: "코랄" },
};

export const PHASE_META: Record<
  Phase,
  { label: string; emoji: string; station: string; blurb: string }
> = {
  registration: {
    label: "작품 접수",
    emoji: "📝",
    station: "접수",
    blurb: "내 작품을 등록하는 시간이에요.",
  },
  voting: {
    label: "투표 진행 중",
    emoji: "🎟️",
    station: "투표",
    blurb: "티켓을 마음에 드는 작품에 던져주세요.",
  },
  closed: {
    label: "투표 마감",
    emoji: "🔒",
    station: "마감",
    blurb: "두구두구… 집계 중이에요.",
  },
  revealed: {
    label: "결과 발표",
    emoji: "🏆",
    station: "발표",
    blurb: "오늘의 주인공이 공개됐어요!",
  },
};

/** Typed confirmation for destructive admin resets. */
export const RESET_CONFIRM_WORD = "초기화";

export const COOKIE_VOTER = "tp_voter";
export const COOKIE_ADMIN = "tp_admin";

/** Client polling intervals (ms). */
export const POLL_MS = {
  default: 3000,
  stage: 2000,
  admin: 2500,
} as const;
