"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/brand/avatar";
import { api, getFieldErrors, toastError } from "@/lib/api-client";
import { LIMITS } from "@/lib/constants";
import type { AdminState, PublicCandidate } from "@/lib/types";
import { cn, formatKstTime, formatSerial } from "@/lib/utils";
import type { AdminSectionProps } from "./admin-dashboard";
import { btn, inputCls, Modal, Panel } from "./ui";

export function Participants({ state, setState }: AdminSectionProps) {
  const [editing, setEditing] = useState<PublicCandidate | null>(null);
  const [pinResult, setPinResult] = useState<{ name: string; pin: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = state.candidates;

  async function resetPin(c: PublicCandidate) {
    if (!window.confirm(`${c.name}님의 PIN을 새로 만들까요?\n기존 PIN은 더 이상 안 먹혀요.`)) return;
    setBusyId(c.id);
    try {
      const { pin } = await api.admin.resetPin(c.id);
      setPinResult({ name: c.name, pin });
    } catch (err) {
      toastError(err, { title: "PIN 재설정 실패" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: PublicCandidate) {
    if (!window.confirm(`${c.name}님의 「${c.title}」을(를) 삭제할까요?\n관련 투표도 정리되고, 되돌릴 수 없어요!`)) return;
    setBusyId(c.id);
    try {
      setState(await api.admin.deleteCandidate(c.id));
      toast.success(`${c.name}님의 작품을 삭제했어요 🗑️`);
    } catch (err) {
      toastError(err, { title: "삭제 실패" });
    } finally {
      setBusyId(null);
    }
  }

  async function copyPin(pin: string) {
    try {
      await navigator.clipboard.writeText(pin);
      toast.success("PIN을 복사했어요 📋");
    } catch {
      toast.error("복사에 실패했어요. 화면의 숫자를 직접 알려주세요 🙏");
    }
  }

  return (
    <Panel title={`참가자 명단 🎫 (${list.length})`}>
      {list.length === 0 ? (
        <p className="rounded-field border-2 border-dashed border-ink/40 py-8 text-center text-muted">
          아직 아무도 없어요. 첫 번째 용사를 기다리는 중… 🦗
        </p>
      ) : (
        <ul className="divide-y-2 divide-dashed divide-ink/20">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <Avatar emoji={c.emoji} color={c.color} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-mono text-xs text-muted">{formatSerial(c.entryNo)}</span>
                  <span className="font-bold">{c.name}</span>
                  <span
                    className={cn(
                      "rounded-chip border-2 border-ink px-1.5 text-xs font-bold",
                      c.hasVoted ? "bg-mint" : "bg-paper-2",
                    )}
                  >
                    {c.hasVoted ? "✅ 투표함" : "⏳ 아직"}
                  </span>
                </p>
                <p className="truncate text-sm text-muted">
                  {c.title} · {formatKstTime(c.createdAt)} 등록
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" disabled={busyId === c.id} onClick={() => setEditing(c)} className={btn("ghost", "sm")}>
                  수정
                </button>
                <button type="button" disabled={busyId === c.id} onClick={() => void resetPin(c)} className={btn("primary", "sm")}>
                  PIN 재설정
                </button>
                <button type="button" disabled={busyId === c.id} onClick={() => void remove(c)} className={btn("danger", "sm")}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="참가자 정보 수정 ✏️">
        {editing ? (
          <EditForm
            key={editing.id}
            candidate={editing}
            onDone={(next) => {
              setState(next);
              setEditing(null);
              toast.success("수정 완료! ✨");
            }}
          />
        ) : null}
      </Modal>

      <Modal open={pinResult !== null} onClose={() => setPinResult(null)} title="새 PIN 발급 🔑">
        {pinResult ? (
          <div className="text-center">
            <p className="text-muted">{pinResult.name}님에게 살짝 알려주세요 🤫</p>
            <p className="my-5 rounded-card border-[3px] border-ink bg-ticket py-4 font-mono text-6xl font-bold tracking-[0.3em] shadow-brutal">
              {pinResult.pin}
            </p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => void copyPin(pinResult.pin)} className={btn("primary")}>
                복사하기 📋
              </button>
              <button type="button" onClick={() => setPinResult(null)} className={btn("ghost")}>
                확인
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Panel>
  );
}

function EditForm({ candidate, onDone }: { candidate: PublicCandidate; onDone: (next: AdminState) => void }) {
  const [name, setName] = useState(candidate.name);
  const [title, setTitle] = useState(candidate.title);
  const [description, setDescription] = useState(candidate.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      onDone(
        await api.admin.updateCandidate(candidate.id, {
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
        }),
      );
    } catch (err) {
      setErrors(getFieldErrors(err));
      toastError(err, { title: "수정 실패" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="이름" error={errors.name}>
        <input value={name} maxLength={LIMITS.name.max} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="프로젝트 이름" error={errors.title}>
        <input value={title} maxLength={LIMITS.title.max} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </Field>
      <Field label={`소개 (${description.length}/${LIMITS.description.max})`} error={errors.description}>
        <textarea
          value={description}
          rows={4}
          maxLength={LIMITS.description.max}
          onChange={(e) => setDescription(e.target.value)}
          className={cn(inputCls, "resize-y")}
        />
      </Field>
      <button
        type="submit"
        disabled={busy || !name.trim() || !title.trim() || !description.trim()}
        className={cn(btn("pop"), "w-full")}
      >
        {busy ? "저장 중…" : "저장하기 💾"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm font-bold text-danger-ink">{error}</span> : null}
    </label>
  );
}
