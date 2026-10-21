import { requireAdmin } from "@/lib/server/auth";
import { handle, json, readJson } from "@/lib/server/http";
import { seedDemo } from "@/lib/server/seed";
import { parseBody, seedSchema } from "@/lib/server/validation";

/** POST /api/admin/seed — SeedInput → SeedResponse (demo participants, PIN "0000"). */
export async function POST(req: Request) {
  return handle(req, async () => {
    await requireAdmin();
    const input = parseBody(seedSchema, await readJson(req));
    return json(await seedDemo(input));
  });
}
