"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

/** Client providers for the whole app: reduced-motion aware animations + brand toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="top-center"
        offset={16}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-2xl !border-[3px] !border-ink !bg-card !text-ink !shadow-brutal !font-sans !font-semibold",
            description: "!text-muted",
            actionButton: "!bg-ink !text-paper !rounded-full !font-bold",
          },
        }}
      />
    </MotionConfig>
  );
}
