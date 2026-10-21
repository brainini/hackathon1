import { clearVoterCookie } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import type { OkResponse } from "@/lib/types";

/** POST /api/logout → OkResponse; clears the voter cookie. */
export async function POST(req: Request) {
  return handle(req, async () => {
    await clearVoterCookie(req);
    const body: OkResponse = { ok: true };
    return json(body);
  });
}
