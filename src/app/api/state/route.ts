import { connection } from "next/server";
import { getPublicState } from "@/lib/server/domain";
import { handle, json } from "@/lib/server/http";

/** GET /api/state?since=<version> → StateResponse (`{ unchanged: true }` when nothing changed). */
export async function GET(req: Request) {
  await connection();
  return handle(req, async () => {
    const since = new URL(req.url).searchParams.get("since");
    return json(await getPublicState(since));
  });
}
