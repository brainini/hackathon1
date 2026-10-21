"use client";

import { useEffect, useEffectEvent, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { cn, formatBytes } from "@/lib/utils";
import { btnSecondary } from "./ui";

/** Screenshot picker: file picker + drag&drop + Ctrl+V anywhere on the page. */
export function ImagePicker({
  value,
  onChange,
  invalid,
  disabled,
  onBusyChange,
}: {
  /** data URL or existing `/api/images/…` URL, null when empty. */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  invalid?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function processFile(file: Blob | null | undefined) {
    if (!file || disabled || busy) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요 🖼️ (PNG · JPG · WEBP · GIF)");
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    try {
      const out = await compressImage(file);
      setInfo(`${out.width}×${out.height} · ${formatBytes(out.bytes)}`);
      onChange(out.dataUrl);
      toast.success("스크린샷 장착 완료 📸");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지를 못 읽었어요 😵 다른 파일로 시도해 주세요");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    void processFile(item.getAsFile());
  });

  useEffect(() => {
    const handler = (e: ClipboardEvent) => onPaste(e);
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, []);

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    void processFile(e.dataTransfer.files?.[0]);
  }

  if (value) {
    return (
      <div className={cn("overflow-hidden rounded-card border-2 border-ink bg-card shadow-brutal-sm", invalid && "border-danger")}>
        <div className="relative aspect-video bg-paper-2">
          <img src={value} alt="스크린샷 미리보기" className="size-full object-cover" decoding="async" />
          {busy ? <BusyOverlay /> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink px-3 py-2.5">
          <span className="font-mono text-xs text-muted">{info ?? "현재 스크린샷"}</span>
          <div className="flex gap-2">
            <label className={cn(btnSecondary, "cursor-pointer")}>
              🔁 바꾸기
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled || busy}
                onChange={(e) => {
                  void processFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => {
                onChange(null);
                setInfo(null);
              }}
              className={cn(btnSecondary, "bg-pop-soft")}
            >
              🗑️ 빼기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink px-4 py-6 text-center transition",
        dragging ? "-rotate-1 bg-ticket-hi shadow-brutal" : "bg-paper-2 hover:bg-ticket-hi/60",
        invalid && "border-danger",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span className="text-4xl" aria-hidden>
        {dragging ? "🫳" : "🖼️"}
      </span>
      <span className="font-bold text-ink">
        {dragging ? "여기에 놓아주세요!" : "스크린샷을 끌어다 놓거나, 캡처 후 Ctrl+V 📋"}
      </span>
      <span className="text-sm text-muted">제일 잘 나온 컷으로! · 클릭해서 파일 고르기도 OK</span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          void processFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy ? <BusyOverlay /> : null}
    </label>
  );
}

function BusyOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-[inherit] bg-paper/85" role="status" aria-live="polite">
      <span className="animate-wiggle rounded-chip border-2 border-ink bg-ticket px-3 py-1.5 font-bold text-ink shadow-brutal-sm">
        이미지 다이어트 중… 🏃
      </span>
    </div>
  );
}
