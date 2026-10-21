import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "TWOPICK · 1인 해커톤 데모데이 투표",
    template: "%s · TWOPICK",
  },
  description: "원픽은 너무 가혹하니까, 두 개 고르세요 🎟️🎟️ — 1인 해커톤 데모데이 투표",
};

export const viewport: Viewport = {
  themeColor: "#FFF7E8",
};

/**
 * Display fonts load from Google Fonts at runtime (not via next/font) so the build never depends on
 * downloading ~300 Hangul font slices. Families map to CSS variables in globals.css (:root).
 * Pretendard (body) is self-hosted from the pretendard npm package above.
 */
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Jua&family=Nanum+Gothic+Coding:wght@400;700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body className="paper-bg flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
