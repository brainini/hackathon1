const STEPS = [
  { emoji: "📝", title: "등록", body: "작품 이름, 한 줄 자랑, 스크린샷 한 장. 자랑은 짧고 굵게!" },
  { emoji: "🎤", title: "발표", body: "코드는 끝났다. 이제 자랑할 시간. 떨리면 데모부터 보여주세요." },
  { emoji: "🎟️", title: "투표 (2표!)", body: "티켓은 딱 2장, 서로 다른 두 작품에. 셀프 투표는 반칙 🙅" },
  { emoji: "🏆", title: "시상", body: "두구두구… 결과는 무대에서 공개! 익명이라 뒤끝도 없어요 🤫" },
] as const;

/** "어떻게 진행되나요?" — 4 ticket-stub steps. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="mt-16 sm:mt-24">
      <h2 id="how-title" className="font-display text-h2">
        어떻게 진행되나요? <span className="font-hand text-note text-pop-ink">딱 4단계</span>
      </h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="flex min-h-32 overflow-hidden rounded-ticket border-[3px] border-ink bg-card shadow-brutal transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-0.6deg]"
          >
            <div className="foil flex w-20 flex-none flex-col items-center justify-center gap-1.5 border-r-[3px] border-dashed border-ink">
              <span className="text-3xl leading-none" aria-hidden="true">
                {s.emoji}
              </span>
              <span className="font-mono text-xs font-bold">STEP {i + 1}</span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-h3">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
