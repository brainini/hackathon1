"use client";

import { QRCodeSVG } from "qrcode.react";
import { Avatar } from "@/components/brand/avatar";
import type { PublicCandidate } from "@/lib/types";
import { cn, displayUrl } from "@/lib/utils";

export function QrPanel({ url, label, tone }: { url: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className={cn("rounded-sheet border-4 border-ink bg-white p-5", tone)}>
        {url ? (
          <QRCodeSVG
            value={url}
            size={512}
            level="M"
            marginSize={0}
            style={{ width: "calc(var(--stage-u) * 24)", height: "calc(var(--stage-u) * 24)" }}
          />
        ) : (
          <div style={{ width: "calc(var(--stage-u) * 24)", height: "calc(var(--stage-u) * 24)" }} />
        )}
      </div>
      <p className="font-display text-stage-title">{label}</p>
      <p className="lcd px-5 py-2 font-mono text-stage-body">{url ? displayUrl(url) : "…"}</p>
    </div>
  );
}

export function RegistrationView({ origin, candidates }: { origin: string; candidates: PublicCandidate[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] items-center gap-16 px-16">
        <QrPanel url={origin ? `${origin}/` : ""} label="📱 QR 찍고 작품 등록!" tone="shadow-stage-pop" />
        <div className="flex h-full min-h-0 flex-col justify-center gap-8 py-8">
          <div className="flex items-end gap-6">
            <span className="lcd px-8 py-3 font-display text-stage-mega tabular-nums">{candidates.length}</span>
            <span className="pb-4 font-display text-stage-hero">명 등록</span>
          </div>
          <p className="text-stage-body text-muted-night">
            {candidates.length === 0
              ? "아직 아무도 없어요. 첫 번째 주인공이 되어볼까요? 🥇"
              : "코드는 끝났다. 이제 자랑할 시간 🎤"}
          </p>
          <ul className="flex min-h-0 flex-wrap content-start gap-5 overflow-hidden">
            {candidates.map((c) => (
              <li key={c.id} className="flex w-32 animate-pop-in flex-col items-center gap-2 text-center">
                <Avatar emoji={c.emoji} color={c.color} size="xl" className="size-24 text-[calc(var(--stage-u)*4)] shadow-brutal" />
                <span className="w-full truncate text-stage-min font-bold">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Ticker items={candidates.map((c) => `${c.emoji} ${c.title}`)} />
    </div>
  );
}

export function VotingView({
  origin,
  candidates,
  ballotCount,
}: {
  origin: string;
  candidates: PublicCandidate[];
  ballotCount: number;
}) {
  const total = candidates.length;
  const pct = total > 0 ? Math.min(100, (ballotCount / total) * 100) : 0;
  return (
    <div className="grid h-full grid-cols-[auto_1fr] items-center gap-16 px-16">
      <QrPanel url={origin ? `${origin}/vote` : ""} label="🎟️ 지금 투표하러 가기" tone="shadow-stage-sky" />
      <div className="flex h-full min-h-0 flex-col justify-center gap-6 py-8">
        <div className="flex items-end gap-4 font-display">
          <span className="text-stage-mega text-ticket tabular-nums">{ballotCount}</span>
          <span className="pb-3 text-stage-hero text-muted-night">/ {total}</span>
          <span className="pb-4 text-stage-h2">투표 완료</span>
        </div>
        <div className="h-6 overflow-hidden rounded-full border-4 border-ink bg-night-3">
          <div className="h-full rounded-full bg-mint transition-[width] duration-700 ease-snap" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-stage-body text-muted-night">
          {ballotCount >= total && total > 0 ? "전원 투표 완료! 🎉 관리자님, 마감 버튼 누를 시간이에요" : "티켓은 딱 2장 🎟️🎟️ 셀프 투표 금지 🙅"}
        </p>
        <ul className="flex min-h-0 flex-wrap content-start gap-5 overflow-hidden">
          {candidates.map((c) => (
            <li
              key={c.id}
              className={cn(
                "relative flex w-28 flex-col items-center gap-1.5 text-center transition-[opacity,filter] duration-500",
                c.hasVoted ? "opacity-100" : "opacity-40 grayscale",
              )}
            >
              <Avatar
                emoji={c.emoji}
                color={c.color}
                size="xl"
                className={cn("size-20 text-[calc(var(--stage-u)*3.4)]", c.hasVoted && "shadow-glow-ticket")}
              />
              <span aria-hidden className="absolute top-0 right-1 text-stage-body">
                {c.hasVoted ? "✅" : "👀"}
              </span>
              <span className="w-full truncate text-stage-min font-bold">{c.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ClosedView({
  isAdmin,
  showHint,
  onStart,
}: {
  isAdmin: boolean;
  showHint: boolean;
  onStart: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <span aria-hidden className="inline-block animate-drumroll text-stage-mega">
        🥁
      </span>
      <h1 className="font-display text-stage-mega">투표 마감 🔒</h1>
      <p className="text-stage-title text-muted-night">두구두구두구… 결과는 곧 이 무대에서 공개됩니다</p>
      {isAdmin ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-4 rounded-card border-4 border-ink bg-ticket px-12 py-5 font-display text-stage-h2 text-ink shadow-stage-pop transition-transform hover:-translate-y-1 active:translate-y-1"
        >
          🎤 결과 발표 시작
        </button>
      ) : showHint ? (
        <p className="rounded-card border-2 border-dashed border-muted-night px-8 py-4 text-stage-body text-muted-night">
          관리자 페이지(/admin)에서 이 브라우저로 로그인하면 발표를 진행할 수 있어요
        </p>
      ) : null}
    </div>
  );
}

function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden border-y-4 border-ink bg-ticket py-3 text-ink">
      <div className="flex w-max animate-marquee gap-16 font-display text-stage-title whitespace-nowrap">
        {loop.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}
