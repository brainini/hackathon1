import { adminDeleteCandidate, adminUpdateCandidate } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { Err } from "@/lib/server/errors";
import { handle, idParam, json, readJson, type IdContext } from "@/lib/server/http";
import { adminUpdateCandidateSchema, parseBody } from "@/lib/server/validation";

/** PATCH /api/admin/candidates/[id] — AdminUpdateCandidateInput → AdminState (any phase, unique name). */
export async function PATCH(req: Request, ctx: IdContext) {
  return handle(req, async () => {
    await requireAdmin();
    const id = await idParam(ctx, Err.candidateNotFound);
    const input = parseBody(adminUpdateCandidateSchema, await readJson(req));
    return json(await adminUpdateCandidate(id, input));
  });
}

/** DELETE /api/admin/candidates/[id] → AdminState (also deletes their ballot + screenshot). */
export async function DELETE(req: Request, ctx: IdContext) {
  return handle(req, async () => {
    await requireAdmin();
    const id = await idParam(ctx, Err.candidateNotFound);
    return json(await adminDeleteCandidate(id));
  });
}
