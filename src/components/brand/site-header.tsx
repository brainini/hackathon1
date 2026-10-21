"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/lib/api-client";
import { PHASE_META } from "@/lib/constants";
import { useAppState } from "@/lib/hooks/use-app-state";
import type { Phase } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/register", label: "등록" },
  { href: "/vote", label: "투표" },
  { href: "/results", label: "결과" },
] as const;

const PHASE_TOAST: Partial<Record<Phase, { msg: string; href: string; action: string }>> = {
  voting: { msg: "🎟️ 투표가 시작됐어요!", href: "/vote", action: "투표하러 가기" },
  closed: { msg: "🔒 투표 마감! 두구두구… 결과를 기다려 주세요", href: "/", action: "홈으로" },
  revealed: { msg: "🏆 결과가 공개됐어요!", href: "/results", action: "결과 보기" },
};

export function SiteHeader() {
  const pathname = usePathname();
  const { state, refresh } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);

  const me = state?.me ?? null;
  const meCandidate = me ? state?.candidates.find((c) => c.id === me.id) : undefined;
  const phase = state?.phase;

  // Toast on live phase changes (not on first load).
  const prevPhase = useRef<Phase | null>(null);
  useEffect(() => {
    if (!phase) return;
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (!prev || prev === phase) return;
    const info = PHASE_TOAST[phase];
    if (info) toast(info.msg, { action: { label: info.action, onClick: () => window.location.assign(info.href) } });
  }, [phase]);

  async function logout() {
    setMenuOpen(false);
    try {
      await api.logout();
      await refresh();
      toast("로그아웃했어요 👋");
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label="TWOPICK 홈">
          <span className="text-2xl leading-none">🎟️</span>
          <span className="hidden font-display text-xl tracking-tight min-[400px]:inline sm:text-2xl">TWOPICK</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center">
          <ul className="flex items-center gap-0.5 rounded-full border-[2.5px] border-ink bg-card p-1 shadow-brutal-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-full px-2.5 py-1 text-sm font-bold transition sm:px-4",
                      active ? "bg-ink text-paper" : "hover:bg-paper-2",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {phase ? (
          <span
            className={cn(
              "hidden shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold shadow-brutal-sm md:inline-flex",
              phase === "voting" ? "bg-ticket" : phase === "revealed" ? "bg-mint" : "bg-card",
            )}
          >
            {phase === "voting" ? <span className="size-2 animate-pulse rounded-full bg-pop" /> : null}
            {PHASE_META[phase].emoji} {PHASE_META[phase].label}
          </span>
        ) : null}

        {me && meCandidate ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-card py-0.5 pr-2.5 pl-0.5 text-sm font-bold shadow-brutal-sm"
            >
              <Avatar emoji={meCandidate.emoji} color={meCandidate.color} size="xs" />
              <span className="hidden max-w-24 truncate sm:inline">{me.name}</span>
              <span aria-hidden>▾</span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border-[3px] border-ink bg-card shadow-brutal">
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-bold hover:bg-paper-2"
                >
                  내 작품 보기
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="block w-full border-t-2 border-ink/20 px-4 py-2.5 text-left text-sm font-bold hover:bg-paper-2"
                >
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
