import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* ══════════════════════════════════════════════════════════════════════════
   Shared client/server utilities (pure, deterministic, render-safe).
   Owner: B. Everything here is safe to call during render.
   ══════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────── class names ───────────────────────────── */

/**
 * tailwind-merge taught our custom @theme tokens, so `cn("text-ink", "text-h3")` keeps BOTH
 * (size + colour) and `cn("shadow-brutal", "shadow-brutal-lg")` keeps only the last one.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "hero", "hero-sm", "h1", "h2", "h3", "body", "body-lg", "note",
        "stage-mega", "stage-rank", "stage-hero", "stage-h2", "stage-name", "stage-title", "stage-body", "stage-min",
      ],
      shadow: [
        "brutal-sm", "brutal", "brutal-md", "brutal-lg", "brutal-pop-sm", "brutal-pop", "brutal-pop-lg",
        "sticker", "tray", "stage-pop", "stage-sky", "stage-tangerine", "glow-ticket", "glow-pop",
      ],
      radius: ["chip", "field", "card", "sheet", "ticket"],
      animate: [
        "stamp", "thunk", "wiggle", "shake", "float", "marquee", "pulse-ring", "shine", "pop-in", "blink", "chase",
        "drumroll", "shimmer", "rise", "print", "tear", "pulse-once", "screen-shake", "sweep", "stripes",
      ],
      ease: ["spring", "back", "snap"],
      "text-shadow": ["pop", "ink"],
      "drop-shadow": ["brutal"],
    },
  },
});

/** Compose class names: clsx semantics + Tailwind conflict resolution (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ───────────────────────────── numbers ───────────────────────────── */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** `await sleep(300)` — only in effects / handlers. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function noop(): void {}

/** [0, 1, …, n-1] */
export function range(n: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);
}

/** "1,234" (deterministic, no locale data needed). */
export function formatCount(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 0.923 → "92%" (digits = decimals). */
export function formatPercent(ratio: number, digits = 0): string {
  const v = Number.isFinite(ratio) ? ratio * 100 : 0;
  return `${v.toFixed(digits)}%`;
}

/** 7 → "No.007" — the ticket serial used everywhere. */
export function formatSerial(entryNo: number, digits = 3): string {
  return `No.${String(Math.max(0, Math.floor(entryNo))).padStart(digits, "0")}`;
}

/** 389_120 → "380KB", 1_240_000 → "1.2MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 37 → "37초", 125 → "2분 5초", 3720 → "1시간 2분". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest ? `${m}분 ${rest}초` : `${m}분`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}시간 ${mm}분` : `${h}시간`;
}

/* ───────────────────────────── time (KST) ───────────────────────────── */

const KST = "Asia/Seoul";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

let kstFormatter: Intl.DateTimeFormat | null = null;

interface KstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: (typeof WEEKDAYS)[number];
}

/**
 * Wall-clock parts in Korea time. Uses Intl with timeZone "Asia/Seoul" but only numeric parts,
 * assembled by hand → identical output on the server (Node ICU) and in every browser.
 */
export function kstParts(ts: number): KstParts {
  kstFormatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const map: Record<string, number> = {};
  for (const p of kstFormatter.formatToParts(new Date(ts))) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const year = map.year ?? 1970;
  const month = map.month ?? 1;
  const day = map.day ?? 1;
  // weekday from the KST calendar date (UTC math on the date itself is timezone-free)
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "일";
  return { year, month, day, hour: (map.hour ?? 0) % 24, minute: map.minute ?? 0, second: map.second ?? 0, weekday };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "14:05" */
export function formatKstTime(ts: number): string {
  const p = kstParts(ts);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "14:05:09" */
export function formatKstTimeSec(ts: number): string {
  const p = kstParts(ts);
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

/** "오후 2:05" */
export function formatKstClock(ts: number): string {
  const p = kstParts(ts);
  const ampm = p.hour < 12 ? "오전" : "오후";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${ampm} ${h12}:${pad2(p.minute)}`;
}

/** "2026.10.21 (수)" */
export function formatKstDate(ts: number): string {
  const p = kstParts(ts);
  return `${p.year}.${pad2(p.month)}.${pad2(p.day)} (${p.weekday})`;
}

/** "10.21 (수) 14:05" — compact, for tables and receipts. */
export function formatKstDateTime(ts: number): string {
  const p = kstParts(ts);
  return `${pad2(p.month)}.${pad2(p.day)} (${p.weekday}) ${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** "2026.10.21 (수) 오후 2시" / "… 오후 2시 30분" — the event date tag on home. */
export function formatKstEventDate(ts: number): string {
  const p = kstParts(ts);
  const ampm = p.hour < 12 ? "오전" : "오후";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${formatKstDate(ts)} ${ampm} ${h12}시${p.minute ? ` ${p.minute}분` : ""}`;
}

/**
 * "방금 전" / "12초 전" / "3분 전" / "2시간 전" / "10.21 (수) 14:05".
 * Pure: pass `now` from `useNow()` (never call Date.now() during render).
 */
export function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, Math.round((now - ts) / 1000));
  if (diff < 10) return "방금 전";
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return formatKstDateTime(ts);
}

/* ───────────────────────────── strings ───────────────────────────── */

/** "https://todo.vercel.app/" → "todo.vercel.app" (for link chips). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/** Only http(s) URLs are safe to put in href. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const JOSA_PAIRS = {
  "이/가": ["이", "가"],
  "을/를": ["을", "를"],
  "은/는": ["은", "는"],
  "과/와": ["과", "와"],
  "아/야": ["아", "야"],
  "이에요/예요": ["이에요", "예요"],
  "으로/로": ["으로", "로"],
  "이랑/랑": ["이랑", "랑"],
  "이나/나": ["이나", "나"],
} as const;
export type JosaPair = keyof typeof JOSA_PAIRS;

/** Does the word end with a final consonant (받침)? Latin/digits are approximated by pronunciation. */
export function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return "013678".includes(ch);
  return /[lmnr]/i.test(ch);
}

/**
 * Korean particle picker: josa("김코딩", "이/가") → "김코딩이", josa("최버그", "이/가") → "최버그가".
 * "으로/로" treats a ㄹ batchim as no batchim (서울로).
 */
export function josa(word: string, pair: JosaPair): string {
  const [withB, withoutB] = JOSA_PAIRS[pair];
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  const isRieul = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
  const useWith = pair === "으로/로" ? hasBatchim(word) && !isRieul : hasBatchim(word);
  return `${word}${useWith ? withB : withoutB}`;
}

/* ───────────────────────────── determinism ───────────────────────────── */

/** 32-bit FNV-1a hash → unsigned int. Stable across server/client. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // final avalanche (murmur3 fmix32) so similar ids spread well
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Deterministic per-viewer shuffle (render-safe): orders items by hash(seed:id).
 * Order-independent — adding/removing a candidate never reshuffles everyone else.
 * Vote page: `seededShuffle(others, me.id)`.
 */
export function seededShuffle<T extends { id: string }>(items: readonly T[], seed: string): T[] {
  return items
    .map((item) => ({ item, key: hashString(`${seed}:${item.id}`) }))
    .sort((a, b) => a.key - b.key || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0))
    .map((x) => x.item);
}

/** Deterministic pick from a list (e.g. a quip per candidate): pick(QUIPS, candidate.id). */
export function pick<T>(items: readonly T[], seed: string | number): T {
  if (items.length === 0) throw new Error("pick() needs a non-empty list");
  const idx = hashString(String(seed)) % items.length;
  return items[idx] as T;
}
