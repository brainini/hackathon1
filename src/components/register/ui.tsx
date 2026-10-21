"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/brand/avatar";
import { COLORS, EMOJIS, LIMITS } from "@/lib/constants";
import { COLOR_KEYS, type ColorKey } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ───────────── shared class recipes (neo-brutalist ticket booth) ───────────── */

export const inputCls =
  "w-full rounded-field border-2 border-ink bg-card px-4 py-3 text-body text-ink shadow-brutal-sm outline-none transition " +
  "placeholder:text-muted/70 focus:-translate-y-0.5 focus:shadow-brutal focus-visible:ring-4 focus-visible:ring-ticket/60 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-field border-2 border-ink font-bold text-ink transition " +
  "hover:-translate-y-0.5 hover:shadow-brutal-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ticket/60 disabled:pointer-events-none disabled:opacity-60";

export const btnPrimary = cn(btnBase, "bg-ticket px-6 py-3.5 font-display text-lg shadow-brutal");
export const btnSecondary = cn(btnBase, "bg-card px-4 py-2.5 text-sm shadow-brutal-sm");
export const panelCls = "rounded-card border-2 border-ink bg-card p-5 shadow-brutal-md sm:p-6";

/* ───────────── Field: label + hint + error ───────────── */

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  aside,
  children,
}: {
  id?: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="font-display text-lg leading-none text-ink">
          {label}
          {optional ? <span className="ml-1.5 font-sans text-xs font-semibold text-muted">(선택)</span> : null}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-bold text-danger-ink">
          ⚠️ {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ───────────── PIN input with show/hide ───────────── */

export function PinInput({
  id,
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (pin: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input
        id={id}
        type={show ? "text" : "password"}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={LIMITS.pinLength}
        placeholder="••••"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LIMITS.pinLength))}
        aria-invalid={invalid || undefined}
        className={cn(
          inputCls,
          "w-40 text-center font-mono text-2xl tracking-[0.5em]",
          invalid && "border-danger",
        )}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className={cn(btnSecondary, "px-3")}
        aria-label={show ? "PIN 숨기기" : "PIN 보기"}
        aria-pressed={show}
      >
        {show ? "🙈 숨기기" : "👀 보기"}
      </button>
    </div>
  );
}

/* ───────────── Avatar: emoji grid + colour swatches ───────────── */

export function AvatarPicker({
  emoji,
  color,
  onEmoji,
  onColor,
  onRandom,
}: {
  emoji: string;
  color: ColorKey;
  onEmoji: (e: string) => void;
  onColor: (c: ColorKey) => void;
  onRandom: () => void;
}) {
  return (
    <div className="space-y-4 rounded-card border-2 border-ink bg-paper-2 p-4">
      <div className="flex items-center gap-4">
        <Avatar emoji={emoji} color={color} size="lg" className="animate-pop-in" key={`${emoji}-${color}`} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">오늘의 내 얼굴</p>
          <p className="text-sm text-muted">{COLORS[color].label} 배경의 {emoji}</p>
        </div>
        <button type="button" onClick={onRandom} className={btnSecondary}>
          🎲 랜덤
        </button>
      </div>
      <div role="radiogroup" aria-label="아바타 이모지" className="grid grid-cols-8 gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={e === emoji}
            onClick={() => onEmoji(e)}
            className={cn(
              "grid aspect-square place-items-center rounded-chip border-2 text-xl transition hover:-translate-y-0.5",
              e === emoji ? "border-ink bg-ticket shadow-brutal-sm" : "border-transparent bg-card hover:border-ink",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="아바타 색" className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={COLORS[c].label}
            title={COLORS[c].label}
            onClick={() => onColor(c)}
            style={{ backgroundColor: COLORS[c].hex }}
            className={cn(
              "size-9 rounded-full border-2 border-ink transition hover:-translate-y-0.5",
              c === color ? "scale-110 shadow-brutal-sm ring-4 ring-ink/15" : "opacity-90",
            )}
          >
            {c === color ? <span className="text-sm font-black">✓</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
