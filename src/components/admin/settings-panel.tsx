"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/lib/api-client";
import { LIMITS } from "@/lib/constants";
import type { UpdateSettingsInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { AdminSectionProps } from "./admin-dashboard";
import { btn, inputCls, Panel, Toggle } from "./ui";

export function SettingsPanel({ state, setState }: AdminSectionProps) {
  const s = state.settings;
  const [title, setTitle] = useState(s.eventTitle);
  const [serverTitle, setServerTitle] = useState(s.eventTitle);
  const [busy, setBusy] = useState(false);
  if (serverTitle !== s.eventTitle) {
    setServerTitle(s.eventTitle);
    setTitle(s.eventTitle);
  }

  async function save(input: UpdateSettingsInput, message: string) {
    setBusy(true);
    try {
      setState(await api.admin.updateSettings(input));
      toast.success(message);
    } catch (err) {
      toastError(err, { title: "설정 저장 실패" });
    } finally {
      setBusy(false);
    }
  }

  function saveTitle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === s.eventTitle) return;
    void save({ eventTitle: next }, "행사 이름을 바꿨어요 🏷️");
  }

  const { min, max } = LIMITS.votesPerVoter;
  const capped = state.effectiveVotes < s.votesPerVoter;

  return (
    <Panel title="설정 ⚙️">
      <form onSubmit={saveTitle} className="space-y-1.5">
        <label htmlFor="admin-event-title" className="block text-sm font-bold">
          행사 이름
        </label>
        <div className="flex gap-2">
          <input
            id="admin-event-title"
            value={title}
            maxLength={LIMITS.eventTitle.max}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy || !title.trim() || title.trim() === s.eventTitle}
            className={cn(btn("primary"), "shrink-0")}
          >
            저장
          </button>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">1인당 티켓 🎟️</p>
          <p className="text-sm text-muted">
            {capped ? `참가자가 적어서 실제로는 ${state.effectiveVotes}장만 쓰여요` : "한 사람이 던질 수 있는 표 수"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="티켓 줄이기"
            disabled={busy || s.votesPerVoter <= min}
            onClick={() => void save({ votesPerVoter: s.votesPerVoter - 1 }, `이제 1인당 ${s.votesPerVoter - 1}장!`)}
            className={cn(btn("ghost", "sm"), "size-9 text-lg")}
          >
            −
          </button>
          <span className="w-8 text-center font-display text-h3 tabular-nums">{s.votesPerVoter}</span>
          <button
            type="button"
            aria-label="티켓 늘리기"
            disabled={busy || s.votesPerVoter >= max}
            onClick={() => void save({ votesPerVoter: s.votesPerVoter + 1 }, `이제 1인당 ${s.votesPerVoter + 1}장!`)}
            className={cn(btn("ghost", "sm"), "size-9 text-lg")}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 divide-y-2 divide-dashed divide-ink/20">
        <Toggle
          label="마음 바꾸기 허용 🔁"
          hint="투표 마감 전까지 다시 고를 수 있어요"
          checked={s.allowVoteChange}
          disabled={busy}
          onChange={(v) => void save({ allowVoteChange: v }, v ? "번복 가능! 마음껏 고민하세요 🔁" : "한 번 던진 표는 끝! ✋")}
        />
        <Toggle
          label="냉정 모드 🧊 전체 순위 공개"
          hint="끄면 시상대(1~3위)만 공개돼요"
          checked={s.showFullRanking}
          disabled={busy}
          onChange={(v) => void save({ showFullRanking: v }, v ? "냉정 모드 ON 🧊 모든 순위가 공개돼요" : "따뜻 모드 🌷 시상대만 공개해요")}
        />
      </div>
    </Panel>
  );
}
