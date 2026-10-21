import { readVoterId } from "@/lib/server/auth";
import { castVote } from "@/lib/server/domain";
import { Err } from "@/lib/server/errors";
import { handle, json, readJson } from "@/lib/server/http";
import { parseBody, voteSchema } from "@/lib/server/validation";

/** POST /api/vote — VoteInput → VoteResponse (voting phase, exactly effectiveVotes, never self). */
export async function POST(req: Request) {
  return handle(req, async () => {
    const voterId = await readVoterId();
    if (!voterId) throw Err.voterRequired();
    const { picks } = parseBody(voteSchema, await readJson(req));
    return json(await castVote(voterId, picks));
  });
}
