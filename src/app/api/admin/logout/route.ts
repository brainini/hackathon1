import { clearAdminCookie } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import type { OkResponse } from "@/lib/types";

/** POST /api/admin/logout → OkResponse; clears the admin cookie. */
export async function POST(req: Request) {
  return handle(req, async () => {
    await clearAdminCookie(req);
    const body: OkResponse = { ok: true };
    return json(body);
  });
}
