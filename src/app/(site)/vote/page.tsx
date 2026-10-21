import type { Metadata } from "next";
import { VoteClient } from "@/components/vote/vote-client";

export const metadata: Metadata = {
  title: "투표하기",
  description: "티켓은 딱 두 장. 마음에 드는 작품에 꽂아주세요 🎟️",
};

export default function VotePage() {
  return <VoteClient />;
}
