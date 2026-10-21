import { updateSettings } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { handle, json, readJson } from "@/lib/server/http";
import { parseBody, settingsSchema } from "@/lib/server/validation";

/** PATCH /api/admin/settings — UpdateSettingsInput (partial) → AdminState. */
export async function PATCH(req: Request) {
  return handle(req, async () => {
    await requireAdmin();
    const input = parseBody(settingsSchema, await readJson(req));
    return json(await updateSettings(input));
  });
}
