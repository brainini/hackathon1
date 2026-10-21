import { connection } from "next/server";
import { readImage } from "@/lib/server/domain";
import { Err } from "@/lib/server/errors";
import { handle, idParam, type IdContext } from "@/lib/server/http";

/**
 * GET /api/images/[id] — screenshot bytes. Ids are never reused (every upload gets a new one),
 * so responses are cacheable forever.
 */
export async function GET(req: Request, ctx: IdContext) {
  await connection();
  return handle(req, async () => {
    const id = await idParam(ctx, Err.imageNotFound);
    const image = await readImage(id);
    if (!image) throw Err.imageNotFound();
    const headers: Record<string, string> = {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.length),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (image.contentType === "image/svg+xml") {
      headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
    }
    return new Response(new Uint8Array(image.bytes), { status: 200, headers });
  });
}
