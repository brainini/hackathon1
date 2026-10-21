import { readVoterId } from "@/lib/server/auth";
import { updateMe } from "@/lib/server/domain";
import { Err } from "@/lib/server/errors";
import { handle, json, readJson } from "@/lib/server/http";
import { parseBody, updateMeSchema } from "@/lib/server/validation";

/** PATCH /api/me — UpdateMeInput → MeResponse (own entry, registration phase only). */
export async function PATCH(req: Request) {
  return handle(req, async () => {
    const voterId = await readVoterId();
    if (!voterId) throw Err.voterRequired();
    const input = parseBody(updateMeSchema, await readJson(req));
    return json(await updateMe(voterId, input));
  });
}
