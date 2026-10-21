"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api, getErrorMessage, toastError } from "@/lib/api-client";
import { PHASE_META, POLL_MS } from "@/lib/constants";
import { useAdminState } from "@/lib/hooks/use-admin-state";
import { useAppState } from "@/lib/hooks/use-app-state";
import type { Results } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Ceremony } from "./ceremony";
import { ClosedView, RegistrationView, VotingView } from "./stage-phases";

const subscribeNoop = () => () => {};

export function StageClient() {
  const { state, error, refresh } = useAppState({ interval: POLL_MS.stage });
  const phase = state?.phase;
  const admin = useAdminState({ enabled: phase === "closed", interval: 5000 });
  const origin = useSyncExternalStore(subscribeNoop, () => window.location.origin, () => "");

  const [adminCeremony, setAdminCeremony] = useState<Results | null>(null);
  const [prevPhase, setPrevPhase] = useState(phase);
  if (prevPhase !== phase) {
    setPrevPhase(phase);
    if (phase !== "closed" && phase !== "revealed") setAdminCeremony(null);
  }

  const isAdmin = phase === "closed" && !!admin.state && !admin.isUnauthorized;
  const ceremonyResults = phase === "revealed" ? (state?.results ?? null) : phase === "closed" ? adminCeremony : null;

  async function publish() {
    try {
      const next = await api.admin.setPhase("revealed");
      admin.setState(next);
      await refresh();
      toast.success("결과가 모두의 화면에 공개됐어요 🎉");
    } catch (err) {
      toastError(err);
    }
  }

  const meta = phase ? PHASE_META[phase] : null;

  return (
    <main className="stage stage-root night-bg fixed inset-0 grid place-items-center overflow-hidden">
      <div
        className="relative flex flex-col overflow-hidden"
        style={{ width: "calc(var(--stage-u) * 100)", height: "calc(var(--stage-u) * 56.25)" }}
      >
        <header className="flex items-center justify-between gap-8 px-12 pt-8 pb-4">
          <div className="bulbs rounded-card bg-night-2 px-10 py-4">
            <p className="font-display text-stage-h2 text-ticket">{state?.settings.eventTitle ?? "TWOPICK"}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-display text-stage-title tracking-wider text-muted-night">TWOPICK 투픽</span>
            {meta && (
              <span
                className={cn(
                  "flex items-center gap-3 rounded-full border-4 border-ink px-6 py-2 font-display text-stage-body",
                  phase === "voting" ? "bg-onair text-white" : "bg-ticket text-ink",
                )}
              >
                {phase === "voting" && <span className="size-3 animate-blink rounded-full bg-white" />}
                {meta.emoji} {meta.label}
              </span>
            )}
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {!state ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <span aria-hidden className="inline-block animate-float text-stage-mega">
                {error ? "📶" : "🎟️"}
              </span>
              <p className="font-display text-stage-h2">{error ? getErrorMessage(error) : "무대 조명 켜는 중…"}</p>
            </div>
          ) : ceremonyResults ? (
            <Ceremony
              results={ceremonyResults}
              candidates={state.candidates}
              canPublish={isAdmin}
              onPublish={publish}
            />
          ) : state.phase === "registration" ? (
            <RegistrationView origin={origin} candidates={state.candidates} />
          ) : state.phase === "voting" ? (
            <VotingView origin={origin} candidates={state.candidates} ballotCount={state.stats.ballotCount} />
          ) : (
            <ClosedView
              isAdmin={isAdmin}
              showHint={admin.isUnauthorized || admin.isNotConfigured || (!!admin.error && !admin.state)}
              onStart={() => {
                if (admin.state) setAdminCeremony(admin.state.results);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
