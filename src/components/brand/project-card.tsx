"use client";

import type { ReactNode } from "react";
import type { PublicCandidate } from "@/lib/types";
import { cn, formatSerial } from "@/lib/utils";
import { Avatar } from "./avatar";
import { ProjectImage } from "./project-image";

/**
 * Canonical project card (gallery / vote / results / preview).
 * - `onClick` makes the card body a toggle <button aria-pressed={selected}>.
 * - `onImageClick` adds a 🔍 button on the screenshot (does not trigger onClick).
 * - `badge` renders as a sticker on the top-left, `overlay` covers the screenshot, `footer` sits at the bottom.
 */
export function ProjectCard({
  candidate,
  selected = false,
  disabled = false,
  badge,
  overlay,
  footer,
  onClick,
  onImageClick,
  compact = false,
  className,
}: {
  candidate: PublicCandidate;
  selected?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  overlay?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  onImageClick?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="relative border-b-[3px] border-ink">
        <ProjectImage candidate={candidate} />
        {overlay ? <div className="absolute inset-0 grid place-items-center">{overlay}</div> : null}
      </div>
      <div className={cn("flex flex-1 flex-col gap-2 text-left", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-ticket px-2 py-0.5 font-mono text-[11px] font-bold leading-none">
            {formatSerial(candidate.entryNo)}
          </span>
        </div>
        <h3 className={cn("font-display leading-tight break-keep", compact ? "text-lg" : "text-xl")}>
          {candidate.title}
        </h3>
        {!compact && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted break-keep">{candidate.description}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Avatar emoji={candidate.emoji} color={candidate.color} size="sm" />
          <span className="truncate text-sm font-bold">{candidate.name}</span>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-visible rounded-card border-[3px] border-ink bg-card transition-transform duration-150",
        selected ? "-translate-y-1 shadow-brutal-pop-lg ring-4 ring-pop" : "shadow-brutal",
        disabled && "opacity-70",
        className,
      )}
    >
      {badge ? <div className="absolute -top-3 -left-2 z-10 -rotate-3">{badge}</div> : null}
      <div className="flex flex-1 flex-col overflow-hidden rounded-[calc(var(--radius-card)-3px)]">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-disabled={disabled || undefined}
            className="flex flex-1 cursor-pointer flex-col focus-visible:outline-none"
          >
            {body}
          </button>
        ) : (
          <div className="flex flex-1 flex-col">{body}</div>
        )}
        {footer ? <div className={cn("border-t-2 border-dashed border-ink/30", compact ? "p-3" : "px-4 py-3")}>{footer}</div> : null}
      </div>
      {onImageClick ? (
        <button
          type="button"
          onClick={onImageClick}
          aria-label={`${candidate.title} 스크린샷 크게 보기`}
          className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-full border-2 border-ink bg-card text-base shadow-brutal-sm transition active:translate-x-px active:translate-y-px"
        >
          🔍
        </button>
      ) : null}
    </div>
  );
}
