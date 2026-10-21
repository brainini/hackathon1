import type { Metadata } from "next";
import { ResultsClient } from "@/components/results/results-client";

export const metadata: Metadata = {
  title: "결과 발표 🏆",
  description: "오늘의 MVP는 누구? 투표 결과와 특별상을 확인하세요.",
};

export default function ResultsPage() {
  return <ResultsClient />;
}
