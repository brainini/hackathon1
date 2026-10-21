import type { Metadata } from "next";
import { RegisterClient } from "@/components/register/register-client";

export const metadata: Metadata = {
  title: "참가 등록",
  description: "프로젝트를 등록하고 참가 확인증을 받아가세요 🎟️",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
