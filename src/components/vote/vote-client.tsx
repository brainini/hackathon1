"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api-client";
import { useAppState } from "@/lib/hooks/use-app-state";
import { VotingView } from "./ballot";
import { LoginPanel } from "./login-panel";
import { ClosedView, ErrorBox, RevealedView, VoteSkeleton, WaitingRoom } from "./vote-bits";

export function VoteClient() {
  const { state, error, refresh } = useAppState();
  const phase = state?.phase;

  // Live switch registration → voting: flash a 1.5s "투표가 열렸어요!" overlay.
  const [prevPhase, setPrevPhase] = useState(phase);
  const [flash, setFlash] = useState(false);
  if (prevPhase !== phase) {
    setPrevPhase(phase);
    if (prevPhase === "registration" && phase === "voting") setFlash(true);
  }
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(false), 1500);
    return () => window.clearTimeout(t);
  }, [flash]);

  let body;
  if (!state) {
    body = error ? <ErrorBox message={getErrorMessage(error)} onRetry={() => void refresh()} /> : <VoteSkeleton />;
  } else if (!state.me) {
    body = <LoginPanel state={state} onDone={refresh} />;
  } else if (state.phase === "registration") {
    body = <WaitingRoom state={state} meId={state.me.id} />;
  } else if (state.phase === "voting") {
    body = <VotingView key={state.me.id} state={state} me={state.me} refresh={refresh} />;
  } else if (state.phase === "closed") {
    body = <ClosedView state={state} />;
  } else {
    body = <RevealedView state={state} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      {body}
      {flash ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-pop/90 p-6"
        >
          <p className="caption animate-pop-in text-center text-5xl text-ticket sm:text-7xl">
            🚨 투표가
            <br />
            열렸어요!
          </p>
        </div>
      ) : null}
    </div>
  );
}
