"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProjectCard } from "@/components/brand/project-card";
import { api, isApiError, toastError } from "@/lib/api-client";
import type { MeInfo, PublicState } from "@/lib/types";
import { cn, seededShuffle } from "@/lib/utils";
import { BallotTray, ConfirmDialog } from "./ballot-tray";
import { Hero, NotEnoughView, PicksList, Sticker, btnGhost } from "./vote-bits";

async function fireConfetti() {
  try {
    const { default: confetti } = await import("canvas-confetti");
    const colors = ["#FFD23F", "#FF4F8B", "#3DDC97", "#4CC9F0", "#A685FA"];
    void confetti({ particleCount: 140, spread: 85, origin: { y: 0.65 }, colors });
    window.setTimeout(() => {
      void confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors });
      void confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors });
    }, 250);
  } catch {
    // confetti is a garnish — ignore failures
  }
}

export function VotingView({ state, me, refresh }: { state: PublicState; me: MeInfo; refresh: () => Promise<void> }) {
  const limit = state.effectiveVotes;
  const [picks, setPicks] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trayBump, setTrayBump] = useState(0);
  const [selfShake, setSelfShake] = useState(0);

  const others = useMemo(
    () => seededShuffle(state.candidates.filter((c) => c.id !== me.id), me.id),
    [state.candidates, me.id],
  );
  const mine = state.candidates.find((c) => c.id === me.id) ?? null;
  // Drop picks whose candidate disappeared (admin delete) — derived, never stored.
  const picked = picks.flatMap((id) => others.filter((c) => c.id === id));

  if (limit === 0) return <NotEnoughView state={state} />;

  function toggle(id: string) {
    if (picks.includes(id)) {
      setPicks(picks.filter((p) => p !== id));
      return;
    }
    if (picked.length >= limit) {
      toast(`티켓은 ${limit}장뿐! 하나를 빼고 골라주세요`, { id: "tp-ticket-limit" });
      setTrayBump((n) => n + 1);
      return;
    }
    setPicks([...picks.filter((p) => others.some((c) => c.id === p)), id]);
  }

  function selfVote() {
    toast("셀프 투표는 반칙이에요 🙅", { id: "tp-self-vote" });
    setSelfShake((n) => n + 1);
  }

  function startChange() {
    const prev = (me.picks ?? []).filter((id) => others.some((c) => c.id === id)).slice(0, limit);
    setPicks(prev);
    setEditing(true);
    setJustVoted(false);
  }

  async function submit() {
    if (submitting || picked.length !== limit) return;
    setSubmitting(true);
    try {
      await api.vote(picked.map((c) => c.id));
      await refresh();
      setConfirmOpen(false);
      setEditing(false);
      setJustVoted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void fireConfetti();
    } catch (err) {
      setConfirmOpen(false);
      toastError(err, { title: "투표가 안 됐어요 😵" });
      if (isApiError(err, "WRONG_PHASE", "INVALID_PICKS", "ALREADY_VOTED", "UNAUTHORIZED")) void refresh();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Done: success screen (right after voting) or summary (came back later) ──
  if (me.picks && (justVoted || !editing)) {
    return (
      <section className="mx-auto max-w-xl space-y-5">
        <Hero
          eyebrow={justVoted ? "BALLOT RECEIVED" : "ALREADY VOTED"}
          title={justVoted ? "투표 완료! 🎉" : "투표 완료 ✅"}
          tone="mint"
          aside={
            <span className="stamp mt-2 shrink-0 rotate-[-10deg] animate-stamp text-xl text-pop-ink">접수 완료</span>
          }
        >
          {justVoted ? "당신의 선택은 비밀이에요 🤫" : "티켓은 이미 꽂혔어요. 결과는 무대에서 만나요!"}
        </Hero>
        <div className="space-y-2">
          <h2 className="font-display text-xl">내가 꽂은 티켓</h2>
          <PicksList ids={me.picks} candidates={state.candidates} />
        </div>
        <p className="text-center font-hand text-lg text-muted">
          지금까지 {state.stats.ballotCount}/{state.stats.candidateCount}명 투표 완료 🗳️
        </p>
        {state.settings.allowVoteChange ? (
          <button type="button" onClick={startChange} className={cn(btnGhost, "w-full")}>
            다시 고르기 🔄
          </button>
        ) : (
          <p className="text-center text-sm text-muted">이번 투표는 수정 불가예요 🔒 신중했던 과거의 나를 믿어요</p>
        )}
      </section>
    );
  }

  // ── Ballot ──
  return (
    <section className="space-y-5 pb-64">
      <Hero
        eyebrow={`투표용지 · ${me.name}`}
        title={<>티켓 {limit}장 🎟️</>}
        aside={
          <div className="lcd shrink-0 px-3 py-2 text-center">
            <small className="block font-mono text-[10px] text-ticket/80">남은 티켓</small>
            <b className="font-mono text-2xl">
              {Math.max(0, limit - picked.length)}
              <span className="text-sm text-ticket/70">/{limit}</span>
            </b>
          </div>
        }
      >
        <b className="text-pop-ink">셀프 투표는 반칙!</b> 마음에 드는 작품 <b>{limit}개</b>를 눌러주세요. 다시 누르면
        취소돼요.
      </Hero>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-hand text-base text-muted">🔀 공정하게, 순서는 사람마다 랜덤으로 섞였어요</p>
        {editing ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm font-bold text-muted underline underline-offset-4"
          >
            고르기 취소
          </button>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {others.map((c) => {
          const idx = picked.findIndex((p) => p.id === c.id);
          const on = idx >= 0;
          return (
            <li key={c.id}>
              <ProjectCard
                candidate={c}
                compact
                selected={on}
                onClick={() => toggle(c.id)}
                badge={on ? <Sticker tone="ticket">티켓 {idx + 1} 🎟️</Sticker> : undefined}
                overlay={
                  on ? (
                    <span className="stamp rotate-[-14deg] animate-stamp bg-card/85 text-3xl text-pop">PICK!</span>
                  ) : undefined
                }
              />
            </li>
          );
        })}
        {mine ? (
          <li key={`${mine.id}-${selfShake}`} className={cn(selfShake > 0 && "animate-shake")}>
            <ProjectCard
              candidate={mine}
              compact
              disabled
              onClick={selfVote}
              badge={<Sticker tone="pop">내 작품 😎</Sticker>}
              overlay={
                <span className="mx-2 rounded-chip border-2 border-ink bg-card px-2 py-1 text-center font-hand text-sm leading-snug shadow-brutal-sm">
                  이건 당신 작품이잖아요 😎
                </span>
              }
            />
          </li>
        ) : null}
      </ul>

      <BallotTray
        limit={limit}
        picked={picked}
        bump={trayBump}
        onRemove={(id) => setPicks(picks.filter((p) => p !== id))}
        onSubmit={() => setConfirmOpen(true)}
      />

      {confirmOpen ? (
        <ConfirmDialog
          picked={picked}
          allowChange={state.settings.allowVoteChange}
          submitting={submitting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void submit()}
        />
      ) : null}
    </section>
  );
}
