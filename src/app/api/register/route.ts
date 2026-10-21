import { setVoterCookie } from "@/lib/server/auth";
import { registerCandidate } from "@/lib/server/domain";
import { handle, json, readJson } from "@/lib/server/http";
import { parseBody, registerSchema } from "@/lib/server/validation";

/** POST /api/register — RegisterInput → 201 MeResponse + voter cookie. */
export async function POST(req: Request) {
  return handle(req, async () => {
    const input = parseBody(registerSchema, await readJson(req));
    const result = await registerCandidate(input);
    await setVoterCookie(req, result.me.id);
    return json(result, { status: 201 });
  });
}
