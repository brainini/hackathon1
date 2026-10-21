import { setVoterCookie } from "@/lib/server/auth";
import { login } from "@/lib/server/domain";
import { handle, json, readJson } from "@/lib/server/http";
import { loginSchema, parseBody } from "@/lib/server/validation";

/** POST /api/login — LoginInput → MeResponse + voter cookie (401 WRONG_PIN, 429 RATE_LIMITED). */
export async function POST(req: Request) {
  return handle(req, async () => {
    const input = parseBody(loginSchema, await readJson(req));
    const result = await login(input);
    await setVoterCookie(req, result.me.id);
    return json(result);
  });
}
