"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api-client";
import { LIMITS } from "@/lib/constants";
import type { PublicCandidate } from "@/lib/types";
import { cn, formatSerial } from "@/lib/utils";
import { btnPrimary, btnSecondary, Field, inputCls, PinInput } from "./ui";

/** "이미 등록했나요? 로그인" — pick your name + PIN. Remount with a new `key` to change defaults. */
export function LoginPanel({
  candidates,
  onDone,
  defaultOpen = false,
  defaultCandidateId = "",
}: {
  candidates: PublicCandidate[];
  onDone: () => Promise<void>;
  defaultOpen?: boolean;
  defaultCandidateId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [candidateId, setCandidateId] = useState(defaultCandidateId);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!candidateId) return setError("이름부터 골라주세요 👆");
    if (pin.length !== LIMITS.pinLength) return setError("PIN은 숫자 4자리예요");
    setBusy(true);
    setError(null);
    try {
      const res = await api.login({ candidateId, pin });
      await onDone();
      toast.success(`어서 와요, ${res.candidate.name}님 👋`);
    } catch (err) {
      setError(getErrorMessage(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(btnSecondary, "w-full justify-between")}>
        <span>🔑 이미 등록했나요? 로그인</span>
        <span aria-hidden>↓</span>
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border-2 border-ink bg-sky/15 p-5 shadow-brutal">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h3 text-ink">🔑 다시 오셨군요!</h2>
          <p className="text-sm text-muted">등록할 때 정한 PIN으로 들어오세요.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-muted underline">
          접기
        </button>
      </div>
      {candidates.length === 0 ? (
        <p className="text-sm font-bold text-muted">아직 등록한 사람이 없어요. 첫 번째 주인공이 되어볼까요? 🥇</p>
      ) : (
        <>
          <Field id="login-name" label="내 이름">
            <select
              id="login-name"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className={cn(inputCls, "appearance-auto")}
            >
              <option value="">이름을 골라주세요</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatSerial(c.entryNo)} · {c.name} — {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field id="login-pin" label="PIN" hint="PIN 잊으면 관리자에게 조용히 손 들기 🙋" error={error ?? undefined}>
            <PinInput id="login-pin" value={pin} onChange={setPin} invalid={!!error} />
          </Field>
          <button type="submit" disabled={busy} className={cn(btnPrimary, "w-full bg-sky")}>
            {busy ? "확인 중… 🔍" : "로그인"}
          </button>
        </>
      )}
    </form>
  );
}
