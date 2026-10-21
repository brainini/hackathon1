"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BtnVariant = "primary" | "pop" | "mint" | "ghost" | "danger" | "ink";

const VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-ticket text-ink",
  pop: "bg-pop text-white",
  mint: "bg-mint text-ink",
  ghost: "bg-card text-ink",
  danger: "bg-danger text-white",
  ink: "bg-ink text-paper",
};

/** Brutal button classes: `btn("pop", "lg")`. */
export function btn(variant: BtnVariant = "ghost", size: "sm" | "md" | "lg" = "md"): string {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-field border-2 border-ink font-bold shadow-brutal-sm transition-[transform,box-shadow]",
    "hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-brutal-sm",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-pop",
    size === "sm" && "px-2.5 py-1 text-sm",
    size === "md" && "px-4 py-2 text-base",
    size === "lg" && "px-6 py-3.5 text-lg",
    VARIANTS[variant],
  );
}

export const inputCls =
  "w-full rounded-field border-2 border-ink bg-card px-3 py-2 text-base text-ink shadow-brutal-sm outline-none placeholder:text-muted/70 focus:border-pop focus:shadow-brutal-pop-sm";

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border-[3px] border-ink bg-card p-4 shadow-brutal sm:p-5", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border-2 border-ink shadow-brutal-sm transition-colors disabled:opacity-50",
          checked ? "bg-mint" : "bg-paper-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full border-2 border-ink bg-card transition-all",
            checked ? "left-[26px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90dvh] w-full max-w-md animate-pop-in overflow-y-auto rounded-sheet border-[3px] border-ink bg-card p-5 shadow-brutal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-h3">{title}</h3>
          <button type="button" onClick={onClose} className={btn("ghost", "sm")} aria-label="닫기">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
