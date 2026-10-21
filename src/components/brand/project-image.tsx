import { COLORS } from "@/lib/constants";
import type { PublicCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Screenshot (16:10) with a playful placeholder when there is no image.
 * Pass a partial candidate (imageUrl/emoji/color/title) — also used for the register preview.
 */
export function ProjectImage({
  candidate,
  className,
}: {
  candidate: Pick<PublicCandidate, "imageUrl" | "emoji" | "color" | "title">;
  className?: string;
}) {
  const hex = COLORS[candidate.color]?.hex ?? COLORS.yellow.hex;
  return (
    <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-paper-2", className)}>
      {candidate.imageUrl ? (
        <img
          src={candidate.imageUrl}
          alt={`${candidate.title} 스크린샷`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            backgroundColor: hex,
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.22) 0 12px, transparent 12px 24px)",
          }}
        >
          <div className="flex flex-col items-center gap-1 px-4 text-center">
            <span className="text-5xl drop-shadow-[3px_3px_0_rgb(20_20_20_/_0.85)]">{candidate.emoji}</span>
            <span className="line-clamp-1 font-display text-lg text-ink/80">{candidate.title || "프로젝트"}</span>
            <span className="text-xs font-semibold text-ink/60">스크린샷 없음 · 상상력으로 감상하기 🫠</span>
          </div>
        </div>
      )}
    </div>
  );
}
