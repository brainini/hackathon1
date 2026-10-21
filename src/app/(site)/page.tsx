import type { Metadata } from "next";
import { HomeClient } from "@/components/home/home-client";

export const metadata: Metadata = {
  title: "TWOPICK 투픽 — 원픽은 너무 가혹하니까, 두 개 고르세요",
  description: "1인 해커톤 데모데이 투표. 마음을 훔친 두 작품에 티켓을 던져주세요 🎟️🎟️",
};

export default function HomePage() {
  return <HomeClient />;
}
