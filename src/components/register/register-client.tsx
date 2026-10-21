"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ProjectCard } from "@/components/brand/project-card";
import { api, toastError } from "@/lib/api-client";
import { useAppState } from "@/lib/hooks/use-app-state";
import type { MeResponse, PublicCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LoginPanel } from "./login-panel";
import { RegisterForm } from "./register-form";
import { fireConfetti, SuccessTicket } from "./success-ticket";
import { btnPrimary, btnSecondary, panelCls } from "./ui";

export function RegisterClient() {
  const { state, error, refresh } = useAppState();
  const [success, setSuccess] = useState<{ candidate: PublicCandidate; pin: string } | null>(null);

  if (success) {
    return (
      <Shell>
        <SuccessTicket
          candidate={success.candidate}
          pin={success.pin}
          eventTitle={state?.settings.eventTitle ?? "TWOPICK"}
          onEdit={() => setSuccess(null)}
        />
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        {error ? (
          <div className={cn(panelCls, "mx-auto max-w-md space-y-4 text-center")}>
            <p className="text-4xl">📶</p>
            <p className="font-bold text-ink">{error.message}</p>
            <button type="button" onClick={() => void refresh()} className={btnSecondary}>
              🔄 다시 시도
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy>
            <div className="h-[36rem] animate-shimmer rounded-card border-2 border-ink/20 bg-paper-2" />
            <div className="hidden h-96 animate-shimmer rounded-card border-2 border-ink/20 bg-paper-2 lg:block" />
            <p className="sr-only">티켓 인쇄 중 🎟️</p>
          </div>
        )}
      </Shell>
    );
  }

  const me = state.me;
  const mine = me ? (state.candidates.find((c) => c.id === me.id) ?? null) : null;

  async function logout() {
    try {
      await api.logout();
      await refresh();
      toast.success("로그아웃 완료! 새 얼굴 환영해요 👋");
    } catch (err) {
      toastError(err);
    }
  }

  if (state.phase !== "registration") {
    if (mine) {
      return (
        <Shell title="내 작품" subtitle="투표가 시작돼서 수정이 잠겼어요 🔒">
          <div className="mx-auto max-w-md space-y-5">
            <ProjectCard candidate={mine} badge={<span className="stamp rotate-[-8deg] text-sm text-pop-ink">LOCKED</span>} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={state.phase === "revealed" ? "/results" : "/vote"} className={cn(btnPrimary, "bg-pop text-card")}>
                {state.phase === "revealed" ? "🏆 결과 보러 가기" : "🎟️ 투표하러 가기"}
              </Link>
              <Link href="/" className={cn(btnPrimary, "bg-card")}>
                🏠 홈으로
              </Link>
            </div>
          </div>
        </Shell>
      );
    }
    return (
      <Shell title="접수가 마감됐어요 🙅" subtitle="지금은 등록할 수 없어요. 이미 등록했다면 로그인해서 투표하세요!">
        <div className="mx-auto max-w-md space-y-5">
          <Link href="/vote" className={cn(btnPrimary, "w-full bg-pop text-card")}>
            🎟️ 투표장으로 가기
          </Link>
          <LoginPanel candidates={state.candidates} onDone={refresh} defaultOpen />
        </div>
      </Shell>
    );
  }

  function onRegistered(res: MeResponse, pin: string) {
    setSuccess({ candidate: res.candidate, pin });
    void fireConfetti();
  }

  return (
    <Shell
      title={mine ? "내 작품 다듬기 ✏️" : "자랑은 짧고 굵게"}
      subtitle={
        mine
          ? "투표가 시작되기 전까지는 얼마든지 고칠 수 있어요."
          : "코드는 끝났다. 이제 자랑할 시간 🎤 — 1분이면 참가 등록 끝!"
      }
      sticker={mine ? "수정 모드" : "참가 접수 중"}
    >
      <RegisterForm
        key={mine?.id ?? "new"}
        initial={mine}
        candidates={state.candidates}
        nextEntryNo={state.candidates.reduce((m, c) => Math.max(m, c.entryNo), 0) + 1}
        onRegistered={onRegistered}
        onSaved={() => {}}
        onLogout={logout}
        refresh={refresh}
      />
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  sticker,
  children,
}: {
  title?: string;
  subtitle?: string;
  sticker?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full py-2 sm:py-6">
      {title ? (
        <header className="mb-8 space-y-3">
          {sticker ? (
            <span className="inline-block -rotate-2 rounded-chip border-2 border-ink bg-ticket px-3 py-1 text-sm font-bold text-ink shadow-brutal-sm">
              🎟️ {sticker}
            </span>
          ) : null}
          <h1 className="font-display text-h1 text-ink">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-body-lg text-muted">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
