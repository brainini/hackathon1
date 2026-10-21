import "server-only";
import { COLORS, EMOJIS, LIMITS } from "@/lib/constants";
import { COLOR_KEYS, type SeedResponse } from "@/lib/types";
import { hashPin } from "./auth";
import { effectiveVotes, tallyBallots } from "./results";
import { DEMO_PROFILES, type DemoProfile } from "./seed-data";
import { getStore, StoreConflict, type BallotRecord, type CandidateRecord } from "./store";
import { renderFakeScreenshot, svgDataUrl } from "./svg";
import { nameKey, newId } from "./text";

/** Admin demo tool: witty fake participants (PIN "0000") with SVG screenshots, optional demo ballots. */

export const DEMO_PIN = "0000";

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** FNV-1a → uint32 (seed for the screenshot PRNG). */
function hashSeed(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Unused names from the pool; once exhausted, numbered alter egos ("김코딩 2호"). */
function chooseProfiles(count: number, taken: Set<string>): DemoProfile[] {
  const pool = shuffled(DEMO_PROFILES);
  const out: DemoProfile[] = [];
  for (let round = 1; out.length < count && round <= 50; round += 1) {
    for (const profile of pool) {
      if (out.length >= count) break;
      const name = round === 1 ? profile.name : `${profile.name} ${round}호`;
      const key = nameKey(name);
      if (taken.has(key)) continue;
      taken.add(key);
      out.push({ ...profile, name });
    }
  }
  return out;
}

export async function seedDemo(input: { count?: number; withBallots?: boolean }): Promise<SeedResponse> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const room = Math.max(0, LIMITS.maxCandidates - snap.candidates.length);
  const count = Math.min(input.count ?? 8, LIMITS.seedMax, room);
  const profiles = chooseProfiles(count, new Set(snap.candidates.map((c) => nameKey(c.name))));

  let added = 0;
  let full = false;
  const insertOne = async (profile: DemoProfile): Promise<void> => {
    const id = newId();
    const color = pickOne(COLOR_KEYS);
    const accent = pickOne(COLOR_KEYS.filter((key) => key !== color));
    const emoji = pickOne(EMOJIS);
    const svg = renderFakeScreenshot({
      title: profile.title,
      tagline: profile.tagline,
      emoji,
      color: COLORS[color].hex,
      accent: COLORS[accent].hex,
      layout: profile.layout,
      slug: `demo-${id.slice(0, 5).toLowerCase()}`,
      seed: hashSeed(id),
    });
    const image = { id: newId(), dataUrl: svgDataUrl(svg) };
    const now = Date.now();
    try {
      // The store writes the image only after the name claim succeeded (no orphans on clashes).
      await store.insertCandidate(
        {
          id,
          name: profile.name,
          title: profile.title,
          description: profile.description,
          link: null,
          emoji,
          color,
          imageId: image.id,
          pinHash: await hashPin(id, DEMO_PIN),
          createdAt: now,
          updatedAt: now,
          demo: true,
        },
        image,
        LIMITS.maxCandidates,
      );
      added += 1;
    } catch (err) {
      if (!(err instanceof StoreConflict)) throw err;
      if (err.reason === "too_many") full = true;
    }
  };

  // A few inserts in flight at once: ~3 Redis round trips each, so 30 sequential ones would be slow.
  // Entry numbers stay unique (atomic counter); file/memory stores serialise through their mutex.
  let next = 0;
  const worker = async () => {
    while (!full && next < profiles.length) {
      const profile = profiles[next];
      next += 1;
      if (profile) await insertOne(profile);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, profiles.length) }, worker));

  const ballots = input.withBallots ? await castDemoBallots() : 0;
  return { added, ballots };
}

/** Weighted sampling without replacement. */
function weightedSample(pool: readonly CandidateRecord[], k: number, weight: Map<string, number>): string[] {
  const remaining = [...pool];
  const out: string[] = [];
  while (out.length < k && remaining.length > 0) {
    const total = remaining.reduce((sum, c) => sum + (weight.get(c.id) ?? 1), 0);
    let roll = Math.random() * total;
    let index = 0;
    for (; index < remaining.length - 1; index += 1) {
      roll -= weight.get(remaining[index]?.id ?? "") ?? 1;
      if (roll <= 0) break;
    }
    const [chosen] = remaining.splice(index, 1);
    if (chosen) out.push(chosen.id);
  }
  return out;
}

/**
 * ~80% of the demo participants who have not voted yet cast a random valid ballot.
 * Real participants never get forged ballots (they may receive demo votes, though).
 */
async function castDemoBallots(): Promise<number> {
  const store = getStore();
  const snap = await store.getSnapshot();
  const required = effectiveVotes(snap.meta.settings.votesPerVoter, snap.candidates.length);
  if (required === 0) return 0;
  const tally = tallyBallots(snap.candidates, snap.ballots);
  const idle = snap.candidates.filter((c) => c.demo && !tally.valid.has(c.id));
  if (idle.length === 0) return 0;

  const voters = shuffled(idle).slice(0, Math.max(1, Math.round(idle.length * 0.8)));
  // Uneven popularity → a podium story (and the occasional tie).
  const weight = new Map(snap.candidates.map((c) => [c.id, 0.3 + Math.random() ** 2 * 3]));
  const base = snap.meta.votingStartedAt ?? Date.now();
  const offsets = voters.map(() => 4_000 + Math.floor(Math.random() * 176_000)).sort((a, b) => a - b);
  const ballots: BallotRecord[] = voters.map((voter, index) => {
    const at = base + (offsets[index] ?? 0);
    return {
      voterId: voter.id,
      picks: weightedSample(
        snap.candidates.filter((c) => c.id !== voter.id),
        required,
        weight,
      ),
      createdAt: at,
      updatedAt: at,
    };
  });
  await store.putBallots(ballots);
  return ballots.length;
}
