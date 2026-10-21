import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — 탈락한 페이지 | TWOPICK",
};

export default function NotFound() {
  return (
    <main className="paper-bg flex min-h-dvh flex-1 items-center justify-center px-4 py-16 text-ink">
      <div className="relative w-full max-w-md">
        <span
          aria-hidden="true"
          className="absolute -top-5 -right-2 z-10 rotate-6 rounded-full border-[2.5px] border-ink bg-pop px-4 py-2 text-sm font-extrabold shadow-brutal-sm"
        >
          재심 불가 🙅
        </span>
        <div className="rounded-sheet border-[3px] border-ink bg-card p-7 text-center shadow-brutal-lg sm:p-10">
          <p className="font-mono text-sm tracking-widest text-muted">ERROR No.404</p>
          <p className="mt-2 font-display text-[clamp(4.5rem,3rem+8vw,7.5rem)] leading-none">
            4<span className="inline-block -rotate-12 text-pop">0</span>4
          </p>
          <div className="my-6 h-1.5 perf-x text-ink/40" aria-hidden="true" />
          <h1 className="font-display text-h2">이 페이지는 투표에서 탈락했어요 🫥</h1>
          <p className="mt-3 text-body text-muted">
            주소가 바뀌었거나, 애초에 출전하지 않은 페이지예요.
            <br />
            티켓은 아껴두고 홈으로 돌아가요.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-ink bg-ticket px-7 py-3.5 font-display text-xl shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-md focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
          >
            홈으로 돌아가기 🏠
          </Link>
          <p className="mt-5 font-hand text-note text-pop-ink">← 길 잃은 건 비밀로 해줄게요</p>
        </div>
      </div>
    </main>
  );
}
