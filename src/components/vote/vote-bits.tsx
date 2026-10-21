"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/brand/avatar";
import { ProjectCard } from "@/components/brand/project-card";
import type { PublicCandidate, PublicState } from "@/lib/types";
import { cn } from "@/lib/utils";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-field border-[3px] border-ink bg-ticket px-5 py-3 font-display text-lg text-ink shadow-brutal transition-[transform,box-shadow] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal-md active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-field border-[3px] border-ink bg-card px-4 py-3 font-display text-base text-ink shadow-brutal-sm transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-45";

const TONES = {
  ticket: "bg-ticket",
  mint: "bg-mint",
  pop: "bg-pop-soft",
  card: "bg-card",
  sky: "bg-sky",
} as const;

export function Hero({
  eyebrow,
  title,
  children,
  tone = "ticket",
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: keyof typeof TONES;
  aside?: ReactNode;
}) {
  return (
    <header className={cn("relative rounded-card border-[3px] border-ink p-5 shadow-brutal-md sm:p-7", TONES[tone])}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold tracking-wider text-ink/70">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
          {children ? <div className="mt-2 text-[15px] leading-relaxed text-ink/80">{children}</div> : null}
        </div>
        {aside}
      </div>
    </header>
  );
}

export function Sticker({ children, tone = "ticket" }: { children: ReactNode; tone?: "ticket" | "pop" }) {
  return (
    <span
      className={cn(
        "inline-block rounded-chip border-2 border-ink px-2 py-0.5 font-display text-xs whitespace-nowrap shadow-brutal-sm",
        tone === "pop" ? "bg-pop text-white" : "bg-ticket text-ink",
      )}
    >
      {children}
    </span>
  );
}

export function VoteSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="불러오는 중">
      <div className="h-36 animate-pulse rounded-card border-[3px] border-ink/15 bg-ink/5" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="aspect-[4/5] animate-pulse rounded-card border-[3px] border-ink/15 bg-ink/5" />
        ))}
      </ul>
      <p className="text-center font-hand text-muted">투표용지 인쇄 중… 🖨️</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-card border-[3px] border-ink bg-card p-6 text-center shadow-brutal-md">
      <p className="text-4xl">😵</p>
      <p className="mt-2 font-display text-xl">투표용지를 못 불러왔어요</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <button type="button" onClick={onRetry} className={cn(btnPrimary, "mt-4")}>
        다시 시도 🔁
      </button>
    </div>
  );
}

export function PicksList({ ids, candidates }: { ids: readonly string[]; candidates: readonly PublicCandidate[] }) {
  const items = ids.flatMap((id) => candidates.filter((c) => c.id === id));
  if (items.length === 0) {
    return (
      <p className="rounded-card border-2 border-dashed border-ink/40 p-4 text-center font-hand text-muted">
        이번엔 티켓을 안 꽂았어요 😶
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {items.map((c, i) => (
        <li
          key={c.id}
          className="flex items-center gap-3 rounded-ticket border-2 border-ink bg-card px-3 py-2.5 shadow-brutal-sm"
        >
          <span className="lcd shrink-0 px-2 py-1 font-mono text-xs">티켓 {i + 1}</span>
          <Avatar emoji={c.emoji} color={c.color} size="sm" />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-ink">{c.title}</b>
            <small className="block truncate text-muted">{c.name}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function WaitingRoom({ state, meId }: { state: PublicState; meId: string }) {
  return (
    <section className="space-y-6">
      <Hero eyebrow="WAITING ROOM" title="투표 대기실 ⏳">
        관리자가 <b>&lsquo;투표 시작!&rsquo;</b>을 누르면 자동으로 열려요. 새로고침은 필요 없어요.
        <br />
        그동안 라이벌들 작품 구경 어때요? 👀
      </Hero>
      <p className="font-hand text-lg text-muted">
        지금까지 <b className="text-ink">{state.candidates.length}개</b> 작품 접수 완료
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {state.candidates.map((c) => (
          <li key={c.id}>
            <ProjectCard candidate={c} compact badge={c.id === meId ? <Sticker tone="pop">내 작품 😎</Sticker> : undefined} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ClosedView({ state }: { state: PublicState }) {
  return (
    <section className="mx-auto max-w-xl space-y-5">
      <Hero eyebrow="CLOSED" title="투표 마감 🔒" tone="pop">
        두구두구… 🥁 결과는 무대에서!
      </Hero>
      <div className="space-y-2">
        <h2 className="font-display text-xl">내가 꽂은 티켓</h2>
        <PicksList ids={state.me?.picks ?? []} candidates={state.candidates} />
      </div>
      <p className="text-center text-sm text-muted">
        총 {state.stats.ballotCount}명이 투표했어요 · 발표가 시작되면 결과가 열려요
      </p>
    </section>
  );
}

export function RevealedView({ state }: { state: PublicState }) {
  return (
    <section className="mx-auto max-w-xl space-y-5">
      <Hero eyebrow="RESULTS" title="결과가 나왔어요! 🏆" tone="mint">
        오늘의 주인공이 공개됐어요. 내가 고른 작품은 몇 위일까요?
      </Hero>
      <Link href="/results" className={cn(btnPrimary, "w-full")}>
        결과 보러 가기 →
      </Link>
      <div className="space-y-2">
        <h2 className="font-display text-xl">내가 꽂은 티켓</h2>
        <PicksList ids={state.me?.picks ?? []} candidates={state.candidates} />
      </div>
    </section>
  );
}

export function NotEnoughView({ state }: { state: PublicState }) {
  return (
    <section className="mx-auto max-w-xl">
      <Hero eyebrow="HOLD ON" title="참가자가 부족해요 🥲" tone="card">
        투표하려면 최소 2명이 등록해야 해요. 지금은 {state.stats.candidateCount}명뿐이라 셀프 투표 말고는 티켓을 꽂을
        곳이 없어요. 관리자에게 살짝 알려주세요!
      </Hero>
    </section>
  );
}
