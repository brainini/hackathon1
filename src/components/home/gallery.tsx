"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { ProjectCard } from "@/components/brand/project-card";
import { ProjectImage } from "@/components/brand/project-image";
import type { PublicCandidate, PublicState } from "@/lib/types";
import { displayUrl, formatSerial, isHttpUrl } from "@/lib/utils";

function Lightbox({ candidate, onClose }: { candidate: PublicCandidate; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${candidate.title} 자세히 보기`}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-sheet border-[3px] border-ink bg-card shadow-brutal-lg motion-safe:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ProjectImage candidate={candidate} className="w-full border-b-[3px] border-ink" />
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <Avatar emoji={candidate.emoji} color={candidate.color} size="md" />
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted">{formatSerial(candidate.entryNo)}</p>
              <p className="truncate font-bold">{candidate.name}</p>
            </div>
          </div>
          <h3 className="mt-4 font-display text-h2 break-keep">{candidate.title}</h3>
          <p className="mt-2 text-body whitespace-pre-line text-ink/85">{candidate.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isHttpUrl(candidate.link) && (
              <a
                href={candidate.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-sky px-4 py-2.5 font-bold shadow-brutal-sm transition-transform hover:-translate-y-0.5"
              >
                🔗 {displayUrl(candidate.link)}
              </a>
            )}
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="rounded-full border-[2.5px] border-ink bg-paper-2 px-4 py-2.5 font-bold shadow-brutal-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-ink"
            >
              닫기 ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Gallery({ state }: { state: PublicState }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { candidates, me } = state;
  const newest = candidates.reduce<PublicCandidate | null>((a, c) => (!a || c.entryNo > a.entryNo ? c : a), null);
  const ordered = [...candidates].reverse();
  const open = openId ? candidates.find((c) => c.id === openId) : undefined;

  return (
    <section aria-labelledby="gallery-title" className="mt-16 sm:mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="gallery-title" className="font-display text-h2">
          오늘의 출전작 <span className="font-mono text-h3 text-pop-ink">{candidates.length}</span>
        </h2>
        <p className="font-hand text-note text-muted">실시간으로 늘어나는 중 👀</p>
      </div>

      {candidates.length === 0 ? (
        <div className="mt-6 rounded-sheet border-[3px] border-dashed border-ink bg-card/70 px-6 py-14 text-center">
          <p className="text-5xl" aria-hidden="true">
            🥇
          </p>
          <p className="mt-4 font-display text-h3">아직 아무도 없어요. 첫 번째 주인공이 되어볼까요? 🥇</p>
          {state.phase === "registration" && (
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-full border-[3px] border-ink bg-ticket px-6 py-3 font-display text-lg shadow-brutal transition-transform hover:-translate-y-0.5"
            >
              1번 타자로 등록하기 🚀
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((c) => (
            <li key={c.id} className="motion-safe:animate-rise">
              <ProjectCard
                candidate={c}
                onClick={() => setOpenId(c.id)}
                onImageClick={() => setOpenId(c.id)}
                badge={
                  me?.id === c.id ? (
                    <span className="rotate-6 rounded-full border-[2.5px] border-ink bg-mint px-3 py-1 text-sm font-extrabold shadow-brutal-sm">
                      내 작품 😎
                    </span>
                  ) : newest?.id === c.id && candidates.length > 1 ? (
                    <span className="rotate-6 rounded-full border-[2.5px] border-ink bg-pop px-3 py-1 text-sm font-extrabold shadow-brutal-sm">
                      따끈따끈 🔥
                    </span>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {open && <Lightbox candidate={open} onClose={() => setOpenId(null)} />}
    </section>
  );
}
