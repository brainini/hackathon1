import { adminReset } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { handle, json, readJson } from "@/lib/server/http";
import { parseReset } from "@/lib/server/validation";

/** POST /api/admin/reset — ResetInput (confirm must be "초기화") → AdminState. */
export async function POST(req: Request) {
  return handle(req, async () => {
    await requireAdmin();
    const { scope } = parseReset(await readJson(req));
    return json(await adminReset(scope));
  });
}
