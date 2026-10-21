/** Fire canvas-confetti (dynamically imported — call only from handlers / timer callbacks). */
export async function fireConfetti(kind: "burst" | "big" = "burst"): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    const colors = ["#FFD23F", "#FF4F8B", "#3DDC97", "#4CC9F0", "#A685FA", "#FF8C42"];
    if (kind === "burst") {
      void confetti({ particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.6 }, colors });
      return;
    }
    void confetti({ particleCount: 220, spread: 120, startVelocity: 60, origin: { y: 0.55 }, colors, scalar: 1.3 });
    window.setTimeout(() => {
      void confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, scalar: 1.2 });
      void confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, scalar: 1.2 });
    }, 350);
  } catch {
    // confetti is decoration only
  }
}
