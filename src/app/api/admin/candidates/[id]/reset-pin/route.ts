import { adminResetPin } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { Err } from "@/lib/server/errors";
import { handle, idParam, json, type IdContext } from "@/lib/server/http";

/** POST /api/admin/candidates/[id]/reset-pin → ResetPinResponse (random 4 digits, clears lockout). */
export async function POST(req: Request, ctx: IdContext) {
  return handle(req, async () => {
    await requireAdmin();
    const id = await idParam(ctx, Err.candidateNotFound);
    return json(await adminResetPin(id));
  });
}
