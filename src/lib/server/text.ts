import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Invisible / control characters that are always stripped from user text:
 * C0/C1 controls (tab, LF, CR are handled separately), soft hyphen, zero-width space, LRM/RLM,
 * bidi embeddings/overrides/isolates, word joiners, BOM and the Hangul/Braille "blank" fillers
 * that are popular for "empty-looking" names.
 */
const STRIP =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­ᅟᅠ​‎‏‪-‮⁠-⁤⁦-⁩⠀ㅤ﻿ﾠ]/g;

/** Additionally ignored when comparing names (ZWJ/ZWNJ and emoji variation selectors). */
const KEY_STRIP = /[‌‍︎️]/g;

/** Single-line text: NFC, invisible characters removed, whitespace collapsed, trimmed. */
export function cleanLine(input: string): string {
  return input.normalize("NFC").replace(STRIP, "").replace(/\s+/g, " ").trim();
}

/** Multi-line text: like cleanLine but keeps single/double line breaks. */
export function cleanMultiline(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(STRIP, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Uniqueness key for participant names: trimmed + whitespace-collapsed + lowercased. */
export function nameKey(name: string): string {
  return cleanLine(name).replace(KEY_STRIP, "").toLowerCase();
}

/** Length in Unicode code points (lenient vs. UTF-16 `.length`, never stricter than the browser). */
export function charCount(s: string): number {
  return Array.from(s).length;
}

/** Candidate / image ids: 16 url-safe characters, never contain "." (used as cookie separator). */
export const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function newId(): string {
  return randomBytes(12).toString("base64url");
}
