import "server-only";
import { z } from "zod";
import { EMOJIS, LIMITS, RESET_CONFIRM_WORD } from "@/lib/constants";
import { COLOR_KEYS, PHASES } from "@/lib/types";
import { Err } from "./errors";
import { validationError } from "./http";
import { charCount, cleanLine, cleanMultiline } from "./text";

/* ─────────────────────────────── helpers ─────────────────────────────── */

/** Korean fallback for any issue without a field-specific message. */
const koreanFallback: z.core.$ZodErrorMap = (issue) => {
  const bound = (key: "minimum" | "maximum") => {
    const value = (issue as { minimum?: unknown; maximum?: unknown })[key];
    return typeof value === "number" || typeof value === "bigint" ? String(value) : "";
  };
  const origin = (issue as { origin?: unknown }).origin;
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined ? "필수 항목이에요 ✍️" : "형식이 올바르지 않아요 🤨";
    case "too_small":
      return origin === "array" ? `${bound("minimum")}개 이상 골라주세요` : `${bound("minimum")} 이상이어야 해요`;
    case "too_big":
      return origin === "array"
        ? `${bound("maximum")}개까지만 고를 수 있어요`
        : origin === "string"
          ? `${bound("maximum")}자까지 입력할 수 있어요`
          : `${bound("maximum")} 이하여야 해요`;
    case "invalid_value":
      return "주어진 선택지 중에서 골라주세요";
    case "not_multiple_of":
      return "정수로 입력해 주세요";
    default:
      return "입력값을 다시 확인해 주세요 ✍️";
  }
};

/** safeParse with Korean messages; failures become 400 VALIDATION with fieldErrors. */
export function parseBody<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data, { error: koreanFallback });
  if (!result.success) throw validationError(result.error);
  return result.data;
}

function lineText(max: number, emptyMsg: string, maxMsg: string) {
  return z
    .string({ error: emptyMsg })
    .overwrite(cleanLine)
    .refine((s) => s.length > 0, emptyMsg)
    .refine((s) => charCount(s) <= max, maxMsg);
}

/* ─────────────────────────────── fields ─────────────────────────────── */

const nameField = lineText(LIMITS.name.max, "이름을 입력해 주세요 ✍️", `이름은 ${LIMITS.name.max}자까지예요`);

const titleField = lineText(
  LIMITS.title.max,
  "프로젝트 이름을 입력해 주세요",
  `프로젝트 이름은 ${LIMITS.title.max}자까지예요 — 핵심만 짧게!`,
);

const DESCRIPTION_EMPTY = "소개를 한 줄이라도 적어주세요 ✍️";
const descriptionField = z
  .string({ error: DESCRIPTION_EMPTY })
  .overwrite(cleanMultiline)
  .refine((s) => s.length > 0, DESCRIPTION_EMPTY)
  .refine(
    (s) => charCount(s) <= LIMITS.description.max,
    `소개는 ${LIMITS.description.max}자까지예요. 나머지는 발표에서 🎤`,
  );

const LINK_MSG = "http:// 또는 https:// 로 시작하는 올바른 링크를 넣어주세요 🔗";

/** http(s) only, no credentials; a bare "example.com/x" gets https:// prepended. */
export function normalizeLink(raw: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password) return null;
  const out = url.toString();
  return out.length <= LIMITS.link.max ? out : null;
}

/** undefined → keep (PATCH), null/"" → no link, string → normalised URL. */
const linkField = z
  .union([z.string(), z.null()], { error: LINK_MSG })
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null) return value;
    const cleaned = cleanLine(value);
    if (!cleaned) return null;
    const url = normalizeLink(cleaned);
    if (!url) {
      ctx.addIssue({ code: "custom", message: LINK_MSG });
      return z.NEVER;
    }
    return url;
  });

const stripVariation = (s: string) => s.replace(/[︎️]/g, "");
const EMOJI_LOOKUP = new Map<string, string>(EMOJIS.map((e) => [stripVariation(e), e]));
const EMOJI_MSG = "아바타 이모지를 목록에서 골라주세요 🦊";

const emojiField = z.string({ error: EMOJI_MSG }).transform((value, ctx) => {
  const emoji = EMOJI_LOOKUP.get(stripVariation(value.trim()));
  if (!emoji) {
    ctx.addIssue({ code: "custom", message: EMOJI_MSG });
    return z.NEVER;
  }
  return emoji;
});

const colorField = z.enum(COLOR_KEYS, { error: "아바타 색상을 골라주세요 🎨" });

const PIN_MSG = `PIN은 숫자 ${LIMITS.pinLength}자리예요 🔢`;
const pinField = z
  .string({ error: PIN_MSG })
  .trim()
  .regex(new RegExp(`^[0-9]{${LIMITS.pinLength}}$`), PIN_MSG);

/** Data URL or null; content is checked separately by `parseImageDataUrl` (400 vs 413). */
const imageField = z.string({ error: "스크린샷 형식이 올바르지 않아요 🖼️" }).nullable();

/* ─────────────────────────────── request bodies ─────────────────────────────── */

export const registerSchema = z.object({
  name: nameField,
  title: titleField,
  description: descriptionField,
  link: linkField,
  emoji: emojiField,
  color: colorField,
  pin: pinField,
  image: imageField.optional(),
});

export const updateMeSchema = z.object({
  name: nameField.optional(),
  title: titleField.optional(),
  description: descriptionField.optional(),
  link: linkField,
  emoji: emojiField.optional(),
  color: colorField.optional(),
  image: imageField.optional(),
});

export const adminUpdateCandidateSchema = updateMeSchema.extend({
  image: z.null({ error: "관리자는 스크린샷을 지우는 것만 할 수 있어요 (null)" }).optional(),
});

export const loginSchema = z.object({
  candidateId: z
    .string({ error: "누구인지 먼저 골라주세요 🕵️" })
    .trim()
    .min(1, "누구인지 먼저 골라주세요 🕵️")
    .max(64, "누구인지 먼저 골라주세요 🕵️"),
  pin: pinField,
});

const PICKS_MSG = "투표할 작품을 골라주세요 🎟️";
export const voteSchema = z.object({
  picks: z
    .array(z.string({ error: PICKS_MSG }).max(64, PICKS_MSG), { error: PICKS_MSG })
    .max(10, "티켓이 너무 많아요 🎟️"),
});

export const adminLoginSchema = z.object({
  password: z
    .string({ error: "비밀번호를 입력해 주세요 🔐" })
    .min(1, "비밀번호를 입력해 주세요 🔐")
    .max(200, "비밀번호가 너무 길어요"),
});

export const setPhaseSchema = z.object({
  phase: z.enum(PHASES, { error: "알 수 없는 단계예요 🤔" }),
});

const VOTES_MSG = `1인당 티켓은 ${LIMITS.votesPerVoter.min}~${LIMITS.votesPerVoter.max}장 사이로 정해주세요 🎟️`;
const TOGGLE_MSG = "켜기/끄기(true/false)로만 정할 수 있어요";
export const settingsSchema = z.object({
  eventTitle: lineText(
    LIMITS.eventTitle.max,
    "행사 이름을 입력해 주세요",
    `행사 이름은 ${LIMITS.eventTitle.max}자까지예요`,
  ).optional(),
  votesPerVoter: z
    .number({ error: VOTES_MSG })
    .int(VOTES_MSG)
    .min(LIMITS.votesPerVoter.min, VOTES_MSG)
    .max(LIMITS.votesPerVoter.max, VOTES_MSG)
    .optional(),
  allowVoteChange: z.boolean({ error: TOGGLE_MSG }).optional(),
  showFullRanking: z.boolean({ error: TOGGLE_MSG }).optional(),
});

const CONFIRM_MSG = `확인을 위해 '${RESET_CONFIRM_WORD}'라고 정확히 입력해 주세요`;
const resetSchema = z.object({
  scope: z.enum(["ballots", "all"], { error: "초기화 범위를 골라주세요 (ballots 또는 all)" }),
  confirm: z.string({ error: CONFIRM_MSG }),
});

export function parseReset(data: unknown): { scope: "ballots" | "all" } {
  const { scope, confirm } = parseBody(resetSchema, data);
  if (cleanLine(confirm) !== RESET_CONFIRM_WORD) throw Err.validation({ confirm: CONFIRM_MSG });
  return { scope };
}

const SEED_MSG = `데모 참가자는 1~${LIMITS.seedMax}명까지 넣을 수 있어요`;
export const seedSchema = z.object({
  count: z.number({ error: SEED_MSG }).int(SEED_MSG).min(1, SEED_MSG).max(LIMITS.seedMax, SEED_MSG).optional(),
  withBallots: z.boolean({ error: TOGGLE_MSG }).optional(),
});

/* ─────────────────────────────── images ─────────────────────────────── */

export type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

const IMAGE_HEAD = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
const MAX_BASE64_CHARS = Math.ceil(LIMITS.imageMaxBytes / 3) * 4;
const CORRUPT_MSG = "이미지 데이터가 손상됐어요 🫠 다른 파일로 다시 올려주세요";
const MIME_LABEL: Record<ImageMime, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
};

function sniffImage(bytes: Buffer): ImageMime | null {
  if (bytes.length < 24) return null;
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString("latin1");
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Validates a screenshot data URL: png/jpeg/webp/gif only (no SVG), strict base64, decoded size
 * ≤ LIMITS.imageMaxBytes (else 413) and magic bytes matching the declared type.
 */
export function parseImageDataUrl(input: string): { mime: ImageMime; dataUrl: string; bytes: number } {
  const head = IMAGE_HEAD.exec(input.slice(0, 40));
  if (!head) {
    throw Err.validation({
      image: /^data:image\/svg/i.test(input)
        ? "SVG는 올릴 수 없어요 🙅 PNG, JPG, WEBP, GIF 중 하나로 올려주세요"
        : "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있어요 🖼️",
    });
  }
  const sub = head[1].toLowerCase();
  const declared: ImageMime = sub === "jpg" || sub === "jpeg" ? "image/jpeg" : (`image/${sub}` as ImageMime);
  const base64 = input.slice(head[0].length).replace(/\s+/g, "");
  if (base64.length > MAX_BASE64_CHARS) throw Err.imageTooLarge();
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw Err.validation({ image: CORRUPT_MSG });
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > LIMITS.imageMaxBytes) throw Err.imageTooLarge();
  const actual = sniffImage(bytes);
  if (!actual) throw Err.validation({ image: CORRUPT_MSG });
  if (actual !== declared) {
    throw Err.validation({
      image: `파일 내용이 ${MIME_LABEL[declared]} 형식이 아니에요 🤔 다른 이미지로 다시 올려주세요`,
    });
  }
  return { mime: actual, dataUrl: `data:${actual};base64,${base64}`, bytes: bytes.length };
}

/** Stored image data URL → bytes + content type (also accepts the seed's SVGs). */
export function decodeStoredImage(dataUrl: string): { contentType: string; bytes: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,/.exec(dataUrl.slice(0, 40));
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(dataUrl.slice(match[0].length), "base64") };
}
