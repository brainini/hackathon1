import type { Metadata } from "next";
import { AdminClient } from "@/components/admin/admin-client";

export const metadata: Metadata = {
  title: "관제탑 🛰️",
  description: "TWOPICK 운영자 전용 관제탑 — 단계 전환, 참가자 관리, 실시간 집계",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
