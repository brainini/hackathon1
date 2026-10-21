"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate } from "@/lib/types";
import { cn, formatSerial } from "@/lib/utils";
import { btnPrimary, btnSecondary } from "./ui";

/** Fire confetti — call ONLY from event handlers. */
export async function fireConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#FFD23F", "#FF4F8B", "#3DDC97", "#4CC9F0", "#A685FA"];
    void confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors });
    setTimeout(() => void confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0 }, colors }), 220);
    setTimeout(() => void confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1 }, colors }), 380);
  } catch {
    /* confetti is a garnish — ignore */
  }
}

/** "참가 확인증" ticket receipt shown after a successful registration. */
export function SuccessTicket({
  candidate,
  pin,
  eventTitle,
  onEdit,
}: {
  candidate: PublicCandidate;
  pin: string;
  eventTitle: string;
  onEdit: () => void;
}) {
  const [showPin, setShowPin] = useState(false);
  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h1 className="mt-2 font-display text-h1 text-ink">등록 완료!</h1>
        <p className="mt-1 text-body-lg text-muted">이제 남은 건 발표뿐… 🫣</p>
      </div>

      <div className="relative animate-print overflow-hidden rounded-ticket border-[3px] border-ink bg-ticket shadow-brutal-lg">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-5 py-2.5 text-ticket">
          <span className="font-display tracking-wider">TWOPICK</span>
          <span className="font-mono text-xs">{eventTitle}</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-hand text-sm text-ink/70">참가 확인증</p>
              <p className="font-mono text-4xl font-bold text-ink">{formatSerial(candidate.entryNo)}</p>
            </div>
            <span className="stamp rotate-[-10deg] text-lg text-pop-ink">접수 완료</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar emoji={candidate.emoji} color={candidate.color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-h3 text-ink">{candidate.name}</p>
              <p className="truncate font-bold text-ink/80">「{candidate.title}」</p>
            </div>
          </div>
          <div className="perf-x h-2 text-ink/50" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-ink/70">내 PIN (투표할 때 필요해요)</p>
              <p className="font-mono text-3xl tracking-[0.4em] text-ink" aria-live="polite">
                {showPin ? pin : "••••"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className={cn(btnSecondary, "shrink-0")}
              aria-pressed={showPin}
            >
              {showPin ? "🙈 가리기" : "👀 PIN 보기"}
            </button>
          </div>
          <p className="text-xs text-ink/70">📸 캡처해 두세요! PIN 잊으면 관리자에게 조용히 손 들기 🙋</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/vote" className={cn(btnPrimary, "bg-pop text-card")}>
          🎟️ 투표장 미리 가보기
        </Link>
        <Link href="/" className={cn(btnPrimary, "bg-card")}>
          🏠 홈으로
        </Link>
      </div>
      <button type="button" onClick={onEdit} className="mx-auto block text-sm font-bold text-muted underline">
        ✏️ 앗, 고칠 게 있어요
      </button>
    </div>
  );
}
