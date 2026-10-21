import "server-only";
import type { ShotLayout } from "./seed-data";

/**
 * Server-generated "fake app screenshots" for demo participants (16:10 SVG).
 * Self-contained (no external resources; served with a strict CSP). ALL text is XML-escaped.
 */

export interface FakeShotInput {
  title: string;
  tagline: string;
  emoji: string;
  /** Participant colour (hex). */
  color: string;
  /** Second colour for gradients/accents (hex). */
  accent: string;
  layout: ShotLayout;
  /** Short url-ish label shown in the address bar. */
  slug: string;
  seed: number;
}

const INK = "#141414";
const PAPER = "#FFF7E8";
const WHITE = "#FFFFFF";
const MUTED = "#6B6458";
const SANS = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";
const MONO = "'Geist Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace";
const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

export function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

/** Deterministic PRNG (mulberry32) so a seed always draws the same picture. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─────────────────────────────── text layout ─────────────────────────────── */

/** Rough advance width in em: Hangul/emoji ≈ 1, Latin ≈ 0.4–0.62. */
function charWidth(ch: string): number {
  if (ch === " ") return 0.3;
  if ((ch.codePointAt(0) ?? 0) >= 0x80) return 1;
  if (/[A-Z0-9]/.test(ch)) return 0.62;
  if (/[a-z]/.test(ch)) return 0.52;
  return 0.4;
}

function textWidth(value: string): number {
  return Array.from(value).reduce((sum, ch) => sum + charWidth(ch), 0);
}

/** Greedy word wrap to `maxEm` per line; overflow is ellipsised on the last line. */
export function wrapText(value: string, maxEm: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const joined = current ? `${current} ${word}` : word;
    if (textWidth(joined) <= maxEm) {
      current = joined;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    for (const ch of Array.from(word)) {
      if (textWidth(current + ch) > maxEm && current) {
        lines.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? "";
  while (last && textWidth(`${last}…`) > maxEm) last = Array.from(last).slice(0, -1).join("");
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

interface TextOpts {
  size: number;
  weight?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  family?: string;
}

function text(x: number, y: number, value: string, opts: TextOpts): string {
  const { size, weight = 700, fill = INK, anchor = "start", family = SANS } = opts;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xmlEscape(value)}</text>`;
}

function emoji(x: number, y: number, value: string, size: number): string {
  return `<text x="${x}" y="${y}" font-family="${EMOJI}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${xmlEscape(value)}</text>`;
}

/** Neo-brutalist box: hard offset shadow + ink border. */
function box(x: number, y: number, w: number, h: number, fill: string, r = 22, shadow = 8): string {
  const s = shadow > 0 ? `<rect x="${x + shadow}" y="${y + shadow}" width="${w}" height="${h}" rx="${r}" fill="${INK}"/>` : "";
  return `${s}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
}

function bar(x: number, y: number, w: number, h: number, fill: string, opacity = 1): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 10)}" fill="${fill}" fill-opacity="${opacity}"/>`;
}

/* ─────────────────────────────── layouts ─────────────────────────────── */

function landing(i: FakeShotInput, rnd: () => number): string {
  const out: string[] = [];
  out.push(box(190, 200, 270, 52, i.accent, 26, 0));
  out.push(text(325, 236, "NEW ✨ 지금 출시", { size: 24, anchor: "middle" }));
  const lines = wrapText(i.title, 9.6, 2);
  lines.forEach((line, idx) => out.push(text(190, 345 + idx * 88, line, { size: 74, weight: 800 })));
  const tagY = 345 + lines.length * 88 + 6;
  out.push(text(190, tagY, wrapText(i.tagline, 19, 1)[0] ?? "", { size: 34, weight: 600, fill: MUTED }));
  const btnY = tagY + 48;
  out.push(box(190, btnY, 270, 84, INK, 22, 0));
  out.push(text(325, btnY + 54, "시작하기 →", { size: 32, fill: WHITE, anchor: "middle" }));
  out.push(box(490, btnY, 230, 84, WHITE, 22, 6));
  out.push(text(605, btnY + 54, "둘러보기", { size: 32, anchor: "middle" }));
  const users = 300 + Math.floor(rnd() * 9000);
  [0, 1, 2].forEach((n) => {
    out.push(`<circle cx="${214 + n * 34}" cy="${btnY + 160}" r="22" fill="${[i.color, i.accent, PAPER][n]}" stroke="${INK}" stroke-width="4"/>`);
  });
  out.push(text(324, btnY + 170, `벌써 ${users.toLocaleString("en-US")}명이 써봤어요`, { size: 26, weight: 600, fill: MUTED }));

  out.push(box(980, 220, 420, 590, i.color, 36, 12));
  out.push(`<circle cx="1190" cy="440" r="140" fill="${WHITE}" fill-opacity="0.55" stroke="${INK}" stroke-width="4"/>`);
  out.push(emoji(1190, 440, i.emoji, 170));
  out.push(bar(1040, 630, 300, 22, INK, 0.85));
  out.push(bar(1040, 670, 240, 18, INK, 0.35));
  out.push(bar(1040, 706, 270, 18, INK, 0.35));
  out.push(`<g transform="translate(1335 250) rotate(12)">${box(-80, -26, 160, 52, PAPER, 26, 0)}${text(0, 10, "⭐ 4.9", { size: 26, anchor: "middle" })}</g>`);
  return out.join("");
}

function dashboard(i: FakeShotInput, rnd: () => number): string {
  const out: string[] = [];
  out.push(`<rect x="120" y="160" width="280" height="750" fill="${PAPER}"/>`);
  out.push(`<line x1="400" y1="160" x2="400" y2="910" stroke="${INK}" stroke-width="4"/>`);
  out.push(`<circle cx="190" cy="230" r="40" fill="${i.color}" stroke="${INK}" stroke-width="4"/>`);
  out.push(emoji(190, 230, i.emoji, 44));
  out.push(bar(250, 214, 110, 16, INK, 0.8));
  out.push(bar(250, 240, 80, 12, INK, 0.3));
  ["대시보드", "통계", "알림", "설정"].forEach((label, idx) => {
    const y = 320 + idx * 70;
    if (idx === 0) out.push(box(150, y - 36, 220, 54, i.color, 16, 0));
    out.push(text(180, y, label, { size: 26, weight: idx === 0 ? 800 : 600, fill: idx === 0 ? INK : MUTED }));
  });

  const titleLine = wrapText(i.title, 17, 1)[0] ?? "";
  out.push(text(450, 240, titleLine, { size: 52, weight: 800 }));
  out.push(text(450, 290, wrapText(i.tagline, 30, 1)[0] ?? "", { size: 28, weight: 600, fill: MUTED }));

  const labels = ["오늘", "이번 주", "전체"];
  labels.forEach((label, idx) => {
    const x = 450 + idx * 330;
    const value = Math.floor((idx + 1) * (40 + rnd() * 400) * (idx === 2 ? 9 : 1));
    out.push(box(x, 330, 300, 150, idx === 1 ? i.accent : WHITE, 22, 6));
    out.push(text(x + 28, 380, label, { size: 24, weight: 600, fill: MUTED }));
    out.push(text(x + 28, 450, value.toLocaleString("en-US"), { size: 54, weight: 800, family: MONO }));
  });

  out.push(box(450, 520, 960, 340, WHITE, 22, 6));
  out.push(text(480, 570, "주간 활동", { size: 26 }));
  const bars = 12;
  for (let n = 0; n < bars; n += 1) {
    const h = 40 + Math.floor(rnd() * 200);
    const x = 490 + n * 76;
    out.push(`<rect x="${x}" y="${830 - h}" width="48" height="${h}" rx="10" fill="${n % 3 === 2 ? i.accent : i.color}" stroke="${INK}" stroke-width="3"/>`);
  }
  out.push(`<line x1="470" y1="832" x2="1390" y2="832" stroke="${INK}" stroke-width="4"/>`);
  return out.join("");
}

function mobile(i: FakeShotInput, rnd: () => number): string {
  const out: string[] = [];
  out.push(`<rect x="120" y="160" width="1360" height="750" fill="${PAPER}"/>`);
  const lines = wrapText(i.title, 6.6, 3);
  lines.forEach((line, idx) => out.push(text(170, 330 + idx * 78, line, { size: 64, weight: 800 })));
  out.push(text(170, 330 + lines.length * 78 + 4, "📱 지금 앱스토어에서", { size: 28, weight: 600, fill: MUTED }));

  out.push(`<rect x="636" y="196" width="360" height="690" rx="52" fill="${INK}"/>`);
  out.push(`<rect x="620" y="180" width="360" height="690" rx="52" fill="${INK}" stroke="${INK}" stroke-width="4"/>`);
  out.push(`<rect x="636" y="196" width="328" height="658" rx="40" fill="${WHITE}"/>`);
  out.push(`<path d="M636 236 a40 40 0 0 1 40 -40 h248 a40 40 0 0 1 40 40 v70 h-328 z" fill="${i.color}"/>`);
  out.push(`<line x1="636" y1="306" x2="964" y2="306" stroke="${INK}" stroke-width="3"/>`);
  out.push(text(800, 268, wrapText(i.title, 9, 1)[0] ?? "", { size: 26, weight: 800, anchor: "middle" }));
  out.push(`<circle cx="800" cy="420" r="84" fill="${i.accent}" stroke="${INK}" stroke-width="4"/>`);
  out.push(emoji(800, 420, i.emoji, 100));
  out.push(text(800, 548, wrapText(i.tagline, 12, 1)[0] ?? "", { size: 24, weight: 700, anchor: "middle" }));
  for (let n = 0; n < 3; n += 1) {
    const y = 580 + n * 66;
    out.push(`<rect x="660" y="${y}" width="280" height="54" rx="14" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`);
    out.push(`<circle cx="690" cy="${y + 27}" r="13" fill="${n === 0 ? i.color : i.accent}" stroke="${INK}" stroke-width="3"/>`);
    out.push(bar(716, y + 16, 90 + Math.floor(rnd() * 110), 10, INK, 0.75));
    out.push(bar(716, y + 32, 60 + Math.floor(rnd() * 70), 8, INK, 0.3));
  }
  out.push(`<rect x="660" y="790" width="280" height="50" rx="25" fill="${INK}"/>`);
  out.push(text(800, 823, "시작하기", { size: 24, fill: WHITE, anchor: "middle" }));

  const downloads = (1 + Math.floor(rnd() * 9)).toString();
  out.push(`<g transform="translate(1210 330) rotate(-6)">${box(-150, -70, 300, 140, WHITE, 24, 8)}${text(0, -8, "⭐ 4.9 / 5", { size: 34, anchor: "middle" })}${text(0, 38, "리뷰 칭찬 일색", { size: 24, weight: 600, fill: MUTED, anchor: "middle" })}</g>`);
  out.push(`<g transform="translate(1230 620) rotate(5)">${box(-150, -70, 300, 140, i.color, 24, 8)}${text(0, -8, `다운로드 ${downloads}만+`, { size: 32, anchor: "middle" })}${text(0, 38, "엄마도 씀 👍", { size: 24, weight: 600, anchor: "middle" })}</g>`);
  return out.join("");
}

/* ─────────────────────────────── frame ─────────────────────────────── */

export function renderFakeScreenshot(input: FakeShotInput): string {
  const rnd = prng(input.seed);
  const body =
    input.layout === "dashboard" ? dashboard(input, rnd) : input.layout === "mobile" ? mobile(input, rnd) : landing(input, rnd);
  const lights = ["#FF5F57", "#FEBC2E", "#28C840"]
    .map((fill, n) => `<circle cx="${165 + n * 36}" cy="125" r="11" fill="${fill}" stroke="${INK}" stroke-width="3"/>`)
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${input.color}"/><stop offset="1" stop-color="${input.accent}"/></linearGradient>`,
    `<pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="${INK}" fill-opacity="0.12"/></pattern>`,
    `<clipPath id="win"><rect x="120" y="90" width="1360" height="820" rx="30"/></clipPath>`,
    `</defs>`,
    `<rect width="1600" height="1000" fill="url(#bg)"/>`,
    `<rect width="1600" height="1000" fill="url(#dots)"/>`,
    `<rect x="136" y="106" width="1360" height="820" rx="30" fill="${INK}"/>`,
    `<g clip-path="url(#win)">`,
    `<rect x="120" y="90" width="1360" height="820" fill="${WHITE}"/>`,
    body,
    `<rect x="120" y="90" width="1360" height="70" fill="${PAPER}"/>`,
    `<line x1="120" y1="160" x2="1480" y2="160" stroke="${INK}" stroke-width="4"/>`,
    lights,
    `<rect x="290" y="105" width="640" height="40" rx="20" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>`,
    text(316, 133, `🔒 localhost:3000/${input.slug}`, { size: 22, weight: 500, fill: MUTED, family: MONO }),
    `</g>`,
    `<rect x="120" y="90" width="1360" height="820" rx="30" fill="none" stroke="${INK}" stroke-width="6"/>`,
    `<g transform="translate(1420 70) rotate(8)">${box(-95, -30, 190, 60, "#FFD23F", 30, 5)}${text(0, 11, "🧪 DEMO", { size: 28, weight: 800, anchor: "middle" })}</g>`,
    `</svg>`,
  ].join("");
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
