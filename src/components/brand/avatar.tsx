import { COLORS } from "@/lib/constants";
import type { ColorKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-sm border-2",
  sm: "size-8 text-base border-2",
  md: "size-11 text-xl border-[2.5px]",
  lg: "size-16 text-3xl border-[3px]",
  xl: "size-24 text-5xl border-[3px]",
} as const;

/** Emoji avatar on the participant colour with an ink border. */
export function Avatar({
  emoji,
  color,
  size = "md",
  className,
}: {
  emoji: string;
  color: ColorKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border-ink leading-none select-none",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: COLORS[color]?.hex ?? COLORS.yellow.hex }}
    >
      {emoji}
    </span>
  );
}
