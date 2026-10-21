"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, getErrorMessage, isApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { btn, inputCls } from "./ui";

export function AdminLogin({ onSuccess, notConfigured }: { onSuccess: () => Promise<void>; notConfigured: boolean }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const showMissing = notConfigured || missing;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.admin.login(password);
      toast.success("관제탑 접속 완료 🛰️", { description: "오늘 행사의 운명이 당신 손에…!" });
      setPassword("");
      await onSuccess();
    } catch (err) {
      if (isApiError(err, "ADMIN_NOT_CONFIGURED")) {
        setMissing(true);
      } else {
        setError(isApiError(err, "UNAUTHORIZED", "FORBIDDEN") ? "비밀번호가 달라요 🙅 다시 한 번!" : getErrorMessage(err));
        setShakeKey((k) => k + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <div
        key={shakeKey}
        className={cn(
          "relative rounded-sheet border-[3px] border-ink bg-card p-6 shadow-brutal-lg sm:p-8",
          shakeKey > 0 && "animate-shake",
        )}
      >
        <span className="absolute -top-4 left-6 rotate-[-4deg] rounded-chip border-2 border-ink bg-ticket px-3 py-1 text-sm font-bold shadow-brutal-sm">
          STAFF ONLY
        </span>
        <p className="text-5xl">🛰️</p>
        <h1 className="mt-3 font-display text-h1">관제탑</h1>
        <p className="mt-1 text-muted">운영자만 들어올 수 있어요. 비밀번호를 대면 문이 열립니다.</p>

        {showMissing ? (
          <div className="mt-5 rounded-field border-2 border-ink bg-pop-soft p-4 text-sm">
            <p className="font-bold">🔧 아직 관리자 비밀번호가 없어요</p>
            <p className="mt-1">
              Vercel 환경변수에 <code className="rounded bg-card px-1 font-mono font-bold">ADMIN_PASSWORD</code>를 설정해
              주세요. 설정 후 다시 배포하면 바로 로그인할 수 있어요.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">관리자 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(inputCls, error && "border-danger")}
              aria-invalid={error ? true : undefined}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm font-bold text-danger-ink">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || !password.trim()} className={cn(btn("pop", "lg"), "w-full")}>
            {busy ? "문 여는 중…" : "관제탑 입장 🔑"}
          </button>
        </form>
      </div>
    </div>
  );
}
