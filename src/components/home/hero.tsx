import Link from "next/link";
import { PHASE_META } from "@/lib/constants";
import type { PublicState } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

const STICKERS = [
  { text: "셀프 투표 금지 🙅", cls: "bg-pop -rotate-6" },
  { text: "익명 보장 🤫", cls: "bg-sky rotate-3" },
  { text: "티켓은 딱 2장", cls: "bg-ticket -rotate-2" },
  { text: "오늘의 주인공은 너", cls: "bg-mint rotate-6" },
] as const;

const btn =
  "inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-ink px-7 py-4 font-display text-xl shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-md focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm sm:text-2xl";

function PhaseCta({ state }: { state: PublicState }) {
  const { phase, me, stats } = state;
  if (phase === "registration") {
    return me ? (
      <Link href="/register" className={cn(btn, "bg-card")}>
        내 작품 수정하기 ✏️
      </Link>
    ) : (
      <Link href="/register" className={cn(btn, "bg-ticket")}>
        내 작품 등록하기 🚀
      </Link>
    );
  }
  if (phase === "voting") {
    const ratio = stats.candidateCount > 0 ? stats.ballotCount / stats.candidateCount : 0;
    return (
      <div className="flex flex-wrap items-center gap-4">
        {me?.picks ? (
          <Link href="/vote" className={cn(btn, "bg-mint")}>
            투표 완료 ✅ <span className="text-base sm:text-lg">(수정하기)</span>
          </Link>
        ) : (
          <Link href="/vote" className={cn(btn, "bg-ticket motion-safe:animate-wiggle")}>
            지금 투표하기 🎟️
          </Link>
        )}
        <div className="lcd flex items-baseline gap-2 px-4 py-2.5" aria-label={`${stats.candidateCount}명 중 ${stats.ballotCount}명 투표 완료`}>
          <b className="font-display text-3xl">{stats.ballotCount}</b>
          <span className="font-mono text-sm">/{stats.candidateCount}명 투표 완료</span>
          <span className="font-mono text-xs opacity-80">({formatPercent(ratio)})</span>
        </div>
      </div>
    );
  }
  if (phase === "closed") {
    return (
      <div className={cn(btn, "cursor-default bg-paper-2 hover:translate-y-0 hover:shadow-brutal")} role="status">
        <span className="inline-block motion-safe:animate-drumroll">🥁</span> 두구두구… 집계 중
      </div>
    );
  }
  return (
    <Link href="/results" className={cn(btn, "foil")}>
      결과 보러가기 🏆
    </Link>
  );
}

export function Hero({ state }: { state: PublicState }) {
  const meta = PHASE_META[state.phase];
  return (
    <section className="relative grid items-center gap-10 pt-6 pb-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:pt-12">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-ticket px-3.5 py-1.5 text-sm font-extrabold shadow-brutal-sm">
            <i className="size-2.5 rounded-full bg-pop motion-safe:animate-blink" aria-hidden="true" />
            {meta.label} {meta.emoji}
          </span>
          <span className="rounded-full border-[2.5px] border-ink bg-card px-3.5 py-1.5 text-sm font-bold">{state.settings.eventTitle}</span>
        </div>
        <h1 className="mt-6 font-display text-hero-sm">
          <span className="block">원픽은 너무 가혹하니까,</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 text-hero">
            <span className="marker [--marker:rgb(255_210_63/0.85)]">두 개</span> 고르세요
            <span className="text-[0.55em]" aria-hidden="true">
              🎟️🎟️
            </span>
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-body-lg font-medium">
          코드는 끝났다. 이제 자랑할 시간 🎤
          <br />
          오늘 만든 진짜 서비스들 중, 마음을 훔친 <b className="marker font-extrabold">두 작품</b>에 티켓을 던져주세요.
        </p>
        <div className="mt-8">
          <PhaseCta state={state} />
        </div>
        <ul className="mt-8 flex flex-wrap gap-3 lg:hidden" aria-label="오늘의 규칙">
          {STICKERS.map((s) => (
            <li key={s.text} className={cn("rounded-full border-[2.5px] border-ink px-3.5 py-2 text-sm font-extrabold shadow-brutal-sm", s.cls)}>
              {s.text}
            </li>
          ))}
        </ul>
      </div>

      {/* golden ticket art + floating stickers (desktop) */}
      <div className="relative hidden h-[420px] lg:block" aria-hidden="true">
        <div className="absolute inset-x-6 top-16 flex rotate-[-5deg] overflow-hidden rounded-ticket border-[3px] border-ink shadow-brutal-lg foil">
          <div className="flex-1 p-6">
            <p className="font-mono text-xs font-bold tracking-[0.3em]">ADMIT ONE · PICK TICKET</p>
            <p className="mt-3 font-display text-6xl leading-none">TWOPICK</p>
            <p className="mt-2 font-hand text-xl">원픽 말고 투픽</p>
            <div className="mt-5 h-1.5 perf-x text-ink/60" />
            <p className="mt-3 font-mono text-sm font-bold">No.002 · 2장 중 1장</p>
          </div>
          <div className="flex w-20 items-center justify-center border-l-[3px] border-dashed border-ink bg-ticket-hi">
            <span className="rotate-90 font-display text-2xl whitespace-nowrap">🎟️ PICK!</span>
          </div>
        </div>
        <div className="absolute inset-x-14 top-52 flex rotate-[4deg] overflow-hidden rounded-ticket border-[3px] border-ink bg-pop-soft shadow-brutal">
          <div className="flex-1 p-5">
            <p className="font-mono text-xs font-bold tracking-[0.3em]">ADMIT ONE · PICK TICKET</p>
            <p className="mt-2 font-display text-4xl leading-none">TWOPICK</p>
            <p className="mt-3 font-mono text-sm font-bold">No.002 · 2장 중 2장</p>
          </div>
          <span className="stamp m-4 self-center text-2xl text-pop-ink -rotate-12">PICK!</span>
        </div>
        {STICKERS.map((s, i) => (
          <span
            key={s.text}
            className={cn(
              "absolute z-10 rounded-full border-[2.5px] border-ink px-4 py-2 text-base font-extrabold whitespace-nowrap shadow-sticker motion-safe:animate-float",
              s.cls,
              ["-top-2 left-0", "top-6 right-0 [animation-delay:0.6s]", "bottom-6 left-2 [animation-delay:1.2s]", "right-2 bottom-0 [animation-delay:1.8s]"][i],
            )}
          >
            {s.text}
          </span>
        ))}
      </div>
    </section>
  );
}
