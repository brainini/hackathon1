import { connection } from "next/server";
import { getAdminState } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

/** GET /api/admin/state → AdminState (full live ranking + warnings). 401 without the admin cookie. */
export async function GET(req: Request) {
  await connection();
  return handle(req, async () => {
    await requireAdmin();
    return json(await getAdminState());
  });
}
