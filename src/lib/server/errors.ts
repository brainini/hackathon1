import "server-only";
import { LIMITS } from "@/lib/constants";
import type { ErrorCode, Phase } from "@/lib/types";

/** A user-facing API error. `message` is Korean and shown to people as-is. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: ErrorCode, status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    if (fieldErrors && Object.keys(fieldErrors).length > 0) this.fieldErrors = fieldErrors;
  }
}

const imageMb = (LIMITS.imageMaxBytes / 1_000_000).toFixed(1);

/** Error factories — the instruction first, the joke second. */
export const Err = {
  badRequest: (message = "요청 형식이 이상해요 🤨 새로고침 후 다시 시도해 주세요") =>
    new AppError("BAD_REQUEST", 400, message),

  validation: (fieldErrors: Record<string, string>) =>
    new AppError(
      "VALIDATION",
      400,
      Object.values(fieldErrors)[0] ?? "입력값을 다시 확인해 주세요 ✍️",
      fieldErrors,
    ),

  bodyTooLarge: () =>
    new AppError("PAYLOAD_TOO_LARGE", 413, "요청이 너무 커요 🐘 이미지를 조금 더 작게 줄여서 다시 보내주세요"),

  imageTooLarge: () =>
    new AppError(
      "PAYLOAD_TOO_LARGE",
      413,
      `이미지가 너무 커요 🐘 ${imageMb}MB 이하로 줄여서 올려주세요`,
      { image: `이미지는 ${imageMb}MB까지 올릴 수 있어요` },
    ),

  voterRequired: () =>
    new AppError("UNAUTHORIZED", 401, "누구신지 모르겠어요 🕵️ 먼저 등록하거나 로그인해 주세요"),

  adminRequired: () =>
    new AppError("UNAUTHORIZED", 401, "관리자만 들어올 수 있어요. 학생이라면… 못 본 걸로 할게요 🙈"),

  wrongAdminPassword: (remaining: number) =>
    new AppError("UNAUTHORIZED", 401, `비밀번호가 달라요 🙅 (남은 기회 ${remaining}번)`, {
      password: "비밀번호가 달라요",
    }),

  adminLocked: () =>
    new AppError("RATE_LIMITED", 429, "비밀번호를 너무 많이 틀렸어요 🔒 10분 뒤에 다시 시도해 주세요"),

  adminNotConfigured: () =>
    new AppError(
      "ADMIN_NOT_CONFIGURED",
      503,
      "관리자 비밀번호가 아직 없어요 🔐 Vercel 환경변수에 ADMIN_PASSWORD를 설정해 주세요",
    ),

  crossSite: () => new AppError("FORBIDDEN", 403, "다른 사이트에서 보낸 요청은 받을 수 없어요 🚫"),

  candidateNotFound: () =>
    new AppError("NOT_FOUND", 404, "그런 참가자는 없어요 🫥 목록을 새로고침해 주세요"),

  imageNotFound: () => new AppError("NOT_FOUND", 404, "이미지를 찾을 수 없어요 🖼️"),

  nameTaken: () =>
    new AppError(
      "NAME_TAKEN",
      409,
      "이미 같은 이름으로 등록한 사람이 있어요 🙋 본인이라면 로그인하고, 동명이인이라면 이니셜을 붙여주세요 (예: 김코딩B)",
      { name: "이미 등록된 이름이에요" },
    ),

  registrationClosed: (phase: Phase) =>
    new AppError(
      "WRONG_PHASE",
      409,
      phase === "voting"
        ? "작품 접수가 끝나고 투표가 진행 중이에요 🎟️ 이미 등록했다면 로그인해 주세요"
        : "작품 접수가 마감됐어요 🔒 이미 등록했다면 로그인해 주세요",
    ),

  editLocked: () => new AppError("WRONG_PHASE", 409, "투표가 시작돼서 수정이 잠겼어요 🔒"),

  votingNotOpen: (phase: Phase) =>
    new AppError(
      "WRONG_PHASE",
      409,
      phase === "registration"
        ? "아직 투표 시간이 아니에요 ⏳ 관리자가 '투표 시작!'을 누르면 열려요"
        : "투표가 마감됐어요 🔒 결과 발표를 기다려 주세요 🥁",
    ),

  selfVote: () =>
    new AppError("SELF_VOTE", 422, "셀프 투표는 반칙이에요 🙅 다른 사람의 작품을 골라주세요", {
      picks: "내 작품에는 투표할 수 없어요",
    }),

  invalidPicks: (message: string) => new AppError("INVALID_PICKS", 422, message, { picks: message }),

  alreadyVoted: () =>
    new AppError("ALREADY_VOTED", 409, "이미 투표했어요 ✅ 이번 투표는 한 번 내면 바꿀 수 없어요"),

  wrongPin: (remaining: number) =>
    new AppError("WRONG_PIN", 401, `PIN이 달라요 🙅 남은 기회 ${remaining}번`, {
      pin: `PIN이 달라요 (남은 기회 ${remaining}번)`,
    }),

  pinLocked: () =>
    new AppError(
      "RATE_LIMITED",
      429,
      "PIN을 너무 많이 틀렸어요 🔒 10분 뒤에 다시 시도하거나, 관리자에게 조용히 손 들어 PIN 재설정을 부탁하세요 🙋",
    ),

  tooManyCandidates: () =>
    new AppError(
      "TOO_MANY_CANDIDATES",
      409,
      `참가자가 꽉 찼어요 🈵 (최대 ${LIMITS.maxCandidates}명) 관리자에게 문의해 주세요`,
    ),

  notEnoughCandidates: (count: number) =>
    new AppError(
      "NOT_ENOUGH_CANDIDATES",
      409,
      `투표를 시작하려면 최소 2명이 필요해요 👥 (지금 ${count}명)`,
    ),

  nothingToVoteFor: () =>
    new AppError(
      "NOT_ENOUGH_CANDIDATES",
      409,
      "투표할 수 있는 작품이 부족해요 🫠 관리자에게 알려주세요",
    ),

  internal: () =>
    new AppError("INTERNAL", 500, "서버가 잠깐 삐끗했어요 😵 잠시 후 다시 시도해 주세요"),
};
