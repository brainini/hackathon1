"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar } from "@/components/brand/avatar";
import { api, isApiError, toastError } from "@/lib/api-client";
import type { PublicState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { btnPrimary } from "./vote-bits";

export function LoginPanel({ state, onDone }: { state: PublicState; onDone: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const selected = state.candidates.find((c) => c.id === selectedId) ?? null;
  const q = query.trim().toLowerCase();
  const list = q
    ? state.candidates.filter((c) => c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
    : state.candidates;
  const canSubmit = !!selected && pin.length === 4 && !submitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || pin.length !== 4 || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.login({ candidateId: selected.id, pin });
      toast.success(`${selected.name}님 확인 완료! 👋`);
      await onDone();
    } catch (err) {
      if (isApiError(err, "WRONG_PIN", "RATE_LIMITED")) {
        setErrorMsg(err.message || "PIN이 틀렸어요 🙅 다시 입력해 주세요");
        setShake((n) => n + 1);
        setPin("");
      } else {
        toastError(err, { title: "본인 확인 실패" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <header className="rounded-card border-[3px] border-ink bg-ticket p-5 shadow-brutal-md sm:p-7">
        <p className="font-mono text-xs font-bold tracking-wider text-ink/70">VOTER CHECK-IN</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">누구세요? 🕵️</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
          내 이름을 고르고 등록할 때 정한 <b>4자리 PIN</b>을 입력하면 투표용지를 드려요.
        </p>
      </header>

      {state.candidates.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-ink/40 bg-card p-6 text-center font-hand text-lg text-muted">
          아직 아무도 등록하지 않았어요 🦗
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-card border-[3px] border-ink bg-card p-4 shadow-brutal">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg">1. 내 이름 찾기</h2>
              <span className="font-mono text-xs text-muted">{state.candidates.length}명</span>
            </div>
            {state.candidates.length > 8 ? (
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름이나 작품명으로 찾기 🔍"
                aria-label="이름으로 찾기"
                className="mt-3 w-full rounded-field border-2 border-ink bg-paper px-3 py-2.5 text-base outline-none focus:shadow-brutal-sm"
              />
            ) : null}
            <ul className="no-scrollbar mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3">
              {list.map((c) => {
                const on = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setSelectedId(c.id);
                        setErrorMsg(null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-field border-2 border-ink px-2 py-2 text-left transition-[transform,box-shadow,background-color] duration-100",
                        on ? "-translate-x-px -translate-y-px bg-ticket shadow-brutal-sm" : "bg-paper hover:bg-ticket-hi",
                      )}
                    >
                      <Avatar emoji={c.emoji} color={c.color} size="sm" />
                      <span className="min-w-0">
                        <b className="block truncate text-sm text-ink">{c.name}</b>
                        <small className="block font-mono text-[11px] text-muted">
                          No.{String(c.entryNo).padStart(3, "0")}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
              {list.length === 0 ? (
                <li className="col-span-full py-4 text-center font-hand text-muted">그런 이름은 없어요 🤔</li>
              ) : null}
            </ul>
          </div>

          <div
            key={shake}
            className={cn(
              "rounded-card border-[3px] border-ink bg-card p-4 shadow-brutal",
              shake > 0 && "animate-shake",
              !selected && "opacity-60",
            )}
          >
            <h2 className="font-display text-lg">
              2. {selected ? `${selected.name}님, PIN을 입력하세요` : "PIN 입력"}
            </h2>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              disabled={!selected}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setErrorMsg(null);
              }}
              placeholder="••••"
              aria-label="4자리 PIN"
              aria-invalid={!!errorMsg}
              className={cn(
                "mt-3 w-full rounded-field border-[3px] bg-paper px-4 py-3 text-center font-mono text-3xl tracking-[0.6em] outline-none focus:shadow-brutal-sm",
                errorMsg ? "border-danger" : "border-ink",
              )}
            />
            {errorMsg ? (
              <p role="alert" className="mt-2 text-sm font-bold text-danger-ink">
                {errorMsg}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">PIN을 까먹었다면 관리자에게 SOS 🙋</p>
            )}
          </div>

          <button type="submit" disabled={!canSubmit} className={cn(btnPrimary, "w-full")}>
            {submitting ? "확인 중… 🔍" : "투표용지 받기 🎟️"}
          </button>
        </form>
      )}

      {state.phase === "registration" ? (
        <p className="text-center text-sm text-muted">
          아직 등록 안 했다면 →{" "}
          <Link href="/register" className="font-bold text-pop-ink underline underline-offset-4">
            작품 등록하러 가기
          </Link>
        </p>
      ) : null}
    </section>
  );
}
