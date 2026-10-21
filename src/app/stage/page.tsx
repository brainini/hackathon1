import type { Metadata } from "next";
import { StageClient } from "@/components/stage/stage-client";

export const metadata: Metadata = {
  title: "무대 화면 🎤",
  description: "프로젝터용 무대 화면 — 등록 현황, 투표 현황, 결과 발표 세리머니.",
};

export default function StagePage() {
  return <StageClient />;
}
