"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, toastError } from "@/lib/api-client";
import { RESET_CONFIRM_WORD } from "@/lib/constants";
import type { AdminState, ResetInput } from "@/lib/types";
import { cn, formatKstDateTime, formatSerial } from "@/lib/utils";
import type { AdminSectionProps } from "./admin-dashboard";
import { btn, Panel } from "./ui";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(state: AdminState): string {
  const byId = new Map(state.candidates.map((c) => [c.id, c]));
  const header = ["순위", "참가번호", "이름", "프로젝트", "득표", "득표율", "투표 참여", "등록 시각(KST)"];
  const rows = state.results.ranking.flatMap((r) => {
    const c = byId.get(r.candidateId);
    if (!c) return [];
    return [
      [
        r.rank,
        formatSerial(c.entryNo),
        c.name,
        c.title,
        r.votes,
        `${(r.share * 100).toFixed(1)}%`,
        c.hasVoted ? "O" : "X",
        formatKstDateTime(c.createdAt),
      ],
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function ToolsPanel({ state, setState, refresh }: AdminSectionProps & { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  async function seed(withBallots: boolean) {
    setBusy(true);
    try {
      const res = await api.admin.seed({ count: 8, withBallots });
      toast.success(`데모 참가자 ${res.added}명 입장! 🧪`, {
        description: withBallots ? `가짜 투표 ${res.ballots}장도 투척 완료 (PIN: 0000)` : "데모 계정 PIN은 모두 0000",
      });
      await refresh();
    } catch (err) {
      toastError(err, { title: "데모 데이터 실패" });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const blob = new Blob(["﻿" + buildCsv(state)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twopick-결과-${formatKstDateTime(Date.now()).replace(/[^\d]/g, "")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV 다운로드 완료 📄");
  }

  async function reset(scope: ResetInput["scope"]) {
    const what = scope === "ballots" ? "모든 투표를 지울까요? (참가자는 그대로)" : "참가자·투표·설정까지 전부 지울까요?";
    const typed = window.prompt(`⚠️ ${what}\n되돌릴 수 없어요. 계속하려면 "${RESET_CONFIRM_WORD}"라고 입력하세요.`);
    if (typed === null) return;
    if (typed.trim() !== RESET_CONFIRM_WORD) {
      toast("입력이 달라서 취소했어요 😮‍💨");
      return;
    }
    setBusy(true);
    try {
      setState(await api.admin.reset({ scope, confirm: RESET_CONFIRM_WORD }));
      toast.success(scope === "ballots" ? "투표함을 싹 비웠어요 🧹" : "전부 초기화! 새 출발 🌱");
    } catch (err) {
      toastError(err, { title: "초기화 실패" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="도구함 🧰">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => void seed(false)} className={btn("mint", "sm")}>
          데모 데이터 넣기 🧪
        </button>
        <button type="button" disabled={busy} onClick={() => void seed(true)} className={btn("mint", "sm")}>
          + 가짜 투표 🎲
        </button>
        <button
          type="button"
          disabled={state.candidates.length === 0}
          onClick={exportCsv}
          className={cn(btn("primary", "sm"), "col-span-2")}
        >
          순위 CSV 내보내기 📄
        </button>
      </div>

      <div className="mt-5 rounded-field border-2 border-dashed border-danger-ink/60 bg-pop-soft/50 p-3">
        <p className="mb-2 text-sm font-bold text-danger-ink">☢️ 위험 구역 — 신중하게!</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => void reset("ballots")} className={btn("ghost", "sm")}>
            투표만 초기화
          </button>
          <button type="button" disabled={busy} onClick={() => void reset("all")} className={btn("danger", "sm")}>
            전체 초기화
          </button>
        </div>
      </div>
    </Panel>
  );
}
