import "server-only";
import type { z } from "zod";
import type { AdminState, Phase, ResetPinResponse } from "@/lib/types";
import { hashPin, passwordMatches, randomPin, setAdminCookie } from "./auth";
import { buildPatch, FAIL_WINDOW_SEC, mapStoreConflict } from "./domain";
import { adminPassword } from "./env";
import { Err } from "./errors";
import { clientIp } from "./http";
import { defaultMeta, getStore, type Meta } from "./store";
import type { adminUpdateCandidateSchema, settingsSchema } from "./validation";
import { buildAdminState } from "./views";

/** Admin use-cases. Callers must have passed `requireAdmin()` (except adminLogin). */

export const ADMIN_MAX_FAILS = 10;

export type SettingsBody = z.output<typeof settingsSchema>;
export type AdminUpdateBody = z.output<typeof adminUpdateCandidateSchema>;

export async function getAdminState(): Promise<AdminState> {
  const store = getStore();
  return buildAdminState(await store.getSnapshot(), store.kind, Date.now());
}

/** POST /api/admin/login — 10 failures per 10 minutes per client IP. Sets the admin cookie. */
export async function adminLogin(req: Request, password: string): Promise<void> {
  const expected = adminPassword();
  if (expected === null) throw Err.adminNotConfigured();
  const store = getStore();
  const failKey = `admin:${clientIp(req)}`;
  const fails = await store.peekHits(failKey);
  if (fails >= ADMIN_MAX_FAILS) throw Err.adminLocked();
  if (!passwordMatches(password, expected)) {
    const remaining = ADMIN_MAX_FAILS - (await store.hit(failKey, FAIL_WINDOW_SEC));
    if (remaining <= 0) throw Err.adminLocked();
    throw Err.wrongAdminPassword(remaining);
  }
  if (fails > 0) await store.clearHits(failKey);
  await setAdminCookie(req, expected);
}

/** Free movement between phases; →voting needs ≥ 2 participants. */
export async function setPhase(target: Phase): Promise<AdminState> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const meta = snap.meta;
  if (meta.phase !== target) {
    if (target === "voting" && snap.candidates.length < 2) {
      throw Err.notEnoughCandidates(snap.candidates.length);
    }
    const now = Date.now();
    const next: Meta = { ...meta, phase: target, phaseChangedAt: now };
    switch (target) {
      case "registration":
        next.votingClosedAt = null;
        // Started by mistake and nobody voted yet → forget the start time too.
        if (snap.ballots.length === 0) next.votingStartedAt = null;
        break;
      case "voting":
        next.votingStartedAt = meta.votingStartedAt ?? now;
        next.votingClosedAt = null;
        break;
      case "closed":
        next.votingClosedAt = now;
        break;
      case "revealed":
        next.votingClosedAt = meta.votingClosedAt ?? now;
        break;
    }
    await store.setMeta(next);
  }
  return getAdminState();
}

export async function updateSettings(input: SettingsBody): Promise<AdminState> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const current = snap.meta.settings;
  const settings = {
    eventTitle: input.eventTitle ?? current.eventTitle,
    votesPerVoter: input.votesPerVoter ?? current.votesPerVoter,
    allowVoteChange: input.allowVoteChange ?? current.allowVoteChange,
    showFullRanking: input.showFullRanking ?? current.showFullRanking,
  };
  const changed = (Object.keys(settings) as Array<keyof typeof settings>).some(
    (key) => settings[key] !== current[key],
  );
  if (changed) await store.setMeta({ ...snap.meta, settings });
  return getAdminState();
}

/** Any phase; names stay unique; admins can remove (not upload) screenshots. */
export async function adminUpdateCandidate(id: string, input: AdminUpdateBody): Promise<AdminState> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const current = snap.candidates.find((c) => c.id === id);
  if (!current) throw Err.candidateNotFound();
  const { patch } = buildPatch(current, input, snap);
  if (patch) {
    const updated = await store.updateCandidate(id, patch).catch(mapStoreConflict);
    if (!updated) throw Err.candidateNotFound();
  }
  return getAdminState();
}

/** Deletes the participant, their ballot and screenshot. Tallies are recomputed on read. */
export async function adminDeleteCandidate(id: string): Promise<AdminState> {
  const store = getStore();
  const removed = await store.deleteCandidate(id);
  if (!removed) throw Err.candidateNotFound();
  await store.clearHits(`pin:${id}`);
  return getAdminState();
}

export async function adminResetPin(id: string): Promise<ResetPinResponse> {
  const store = getStore();
  const pin = randomPin();
  const updated = await store.updateCandidate(id, { pinHash: await hashPin(id, pin) });
  if (!updated) throw Err.candidateNotFound();
  await store.clearHits(`pin:${id}`);
  return { pin };
}

/** "ballots": clears ballots + vote timestamps. "all": wipes everything except settings. */
export async function adminReset(scope: "ballots" | "all"): Promise<AdminState> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const now = Date.now();
  if (scope === "ballots") {
    await store.resetBallots({
      ...snap.meta,
      votingStartedAt: snap.meta.phase === "voting" ? now : null,
      votingClosedAt: null,
    });
  } else {
    await store.resetAll({ ...defaultMeta(now), settings: snap.meta.settings });
  }
  return getAdminState();
}
