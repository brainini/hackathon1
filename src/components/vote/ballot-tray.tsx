"use client";

import { useEffect } from "react";
import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary } from "./vote-bits";

export function BallotTray({
  limit,
  picked,
  bump,
  onRemove,
  onSubmit,
}: {
  limit: number;
  picked: readonly PublicCandidate[];
  bump: number;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}) {
  const full = picked.length === limit;
  const remaining = Math.max(0, limit - picked.length);
  return (
    <div role="region" aria-label="내 티켓" className="fixed inset-x-0 bottom-0 z-40">
      <div
        key={bump}
        className={cn(
          "mx-auto max-w-3xl rounded-t-sheet border-x-[3px] border-t-[3px] border-ink bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-tray",
          bump > 0 && "animate-wiggle",
        )}
      >
        <div className="flex items-center gap-2">
          <b className="font-display text-base">내 티켓</b>
          <span className="lcd px-2 py-0.5 font-mono text-sm">
            {picked.length}/{limit}
          </span>
          <span className="ml-auto font-hand text-sm text-muted">
            {picked.length > limit
              ? `${picked.length - limit}장 빼주세요 ✂️`
              : full
                ? "다 골랐다! 👇"
                : `${remaining}장 남았어요`}
          </span>
        </div>
        <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: Math.max(limit, picked.length) }, (_, i) => {
            const c = picked[i];
            return (
              <li key={c ? c.id : `empty-${i}`} className="min-w-[9.5rem] flex-1">
                {c ? (
                  <div className="flex h-14 animate-pop-in items-center gap-2 rounded-ticket border-2 border-ink bg-ticket px-2 shadow-brutal-sm">
                    <Avatar emoji={c.emoji} color={c.color} size="xs" />
                    <span className="min-w-0 flex-1">
                      <small className="block font-mono text-[10px] leading-none text-ink/70">티켓 {i + 1}</small>
                      <b className="block truncate text-sm leading-tight">{c.title}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      aria-label={`${c.title}에서 티켓 빼기`}
                      className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-card text-base leading-none active:translate-y-px"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="grid h-14 place-items-center rounded-ticket border-2 border-dashed border-ink/40 font-hand text-sm text-muted">
                    빈 티켓 {i + 1} 🎟️
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onSubmit}
          disabled={picked.length !== limit}
          className={cn(btnPrimary, "mt-2 w-full", full && "bg-pop text-white")}
        >
          투표하기 🎟️
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  picked,
  allowChange,
  submitting,
  onCancel,
  onConfirm,
}: {
  picked: readonly PublicCandidate[];
  allowChange: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-confirm-title"
      className="fixed inset-0 z-50 grid place-items-end bg-ink/55 p-3 sm:place-items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="w-full max-w-md animate-pop-in rounded-sheet border-[3px] border-ink bg-card p-5 shadow-brutal-lg">
        <p className="font-mono text-xs font-bold tracking-wider text-muted">FINAL CHECK</p>
        <h2 id="vote-confirm-title" className="mt-1 font-display text-2xl">
          이대로 투표할까요? 🎟️
        </h2>
        <ol className="mt-4 space-y-2">
          {picked.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 rounded-ticket border-2 border-ink bg-ticket-hi px-3 py-2">
              <span className="font-mono text-xs font-bold">#{i + 1}</span>
              <Avatar emoji={c.emoji} color={c.color} size="sm" />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{c.title}</b>
                <small className="block truncate text-muted">{c.name}</small>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          {allowChange
            ? "마감 전까지는 다시 고를 수 있어요. 누굴 골랐는지는 아무도 몰라요 🤫"
            : "⚠️ 한 번 내면 못 바꿔요! 누굴 골랐는지는 아무도 몰라요 🤫"}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className={btnGhost}>
            다시 볼래요
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className={btnPrimary}>
            {submitting ? "꽂는 중…" : "투표하기!"}
          </button>
        </div>
      </div>
    </div>
  );
}
