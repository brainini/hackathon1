import { SiteHeader } from "@/components/brand/site-header";
import Link from "next/link";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6">{children}</main>
      <footer className="border-t-[3px] border-ink bg-paper-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm sm:px-6">
          <p className="font-semibold text-muted">
            <span className="font-display text-ink">TWOPICK</span> · 원픽은 너무 가혹하니까, 투픽 🎟️
          </p>
          <nav className="flex gap-2">
            <Link
              href="/stage"
              className="rounded-full border-2 border-ink bg-card px-3 py-1 font-bold shadow-brutal-sm transition hover:-translate-y-px"
            >
              무대 모드 🎤
            </Link>
            <Link
              href="/admin"
              className="rounded-full border-2 border-ink bg-card px-3 py-1 font-bold shadow-brutal-sm transition hover:-translate-y-px"
            >
              관리자 🛰️
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
