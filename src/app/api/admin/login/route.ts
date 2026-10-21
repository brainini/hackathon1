import { adminLogin } from "@/lib/server/admin";
import { assertAdminConfigured } from "@/lib/server/auth";
import { handle, json, readJson } from "@/lib/server/http";
import { adminLoginSchema, parseBody } from "@/lib/server/validation";
import type { OkResponse } from "@/lib/types";

/** POST /api/admin/login — AdminLoginInput → OkResponse + admin cookie (10 failures / 10 min / IP). */
export async function POST(req: Request) {
  return handle(req, async () => {
    const raw = await readJson(req);
    assertAdminConfigured();
    const { password } = parseBody(adminLoginSchema, raw);
    await adminLogin(req, password);
    const body: OkResponse = { ok: true };
    return json(body);
  });
}
