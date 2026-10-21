import { setPhase } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { handle, json, readJson } from "@/lib/server/http";
import { parseBody, setPhaseSchema } from "@/lib/server/validation";

/** POST /api/admin/phase — SetPhaseInput → AdminState (→voting needs ≥ 2 participants). */
export async function POST(req: Request) {
  return handle(req, async () => {
    await requireAdmin();
    const { phase } = parseBody(setPhaseSchema, await readJson(req));
    return json(await setPhase(phase));
  });
}
