import { LIMITS } from "./constants";

export interface CompressedImage {
  dataUrl: string;
  bytes: number;
  width: number;
  height: number;
}

const MAX_INPUT_BYTES = 20 * 1024 * 1024;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요 😵 다른 파일로 시도해 주세요"));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Client-side screenshot compression: resize (longest edge ≤ LIMITS.imageMaxEdge) and re-encode as
 * WebP (JPEG fallback) until it fits LIMITS.imageTargetBytes. Throws Error with a Korean message.
 */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있어요 🖼️");
  if (file.size > MAX_INPUT_BYTES) throw new Error("이미지가 너무 커요 (20MB 초과) 🐘 캡처 화면으로 다시 시도해 주세요");

  const source = await loadBitmap(file).catch(() => {
    throw new Error("이미지를 열 수 없어요 😵 PNG, JPG, WebP 파일로 시도해 주세요");
  });
  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!srcW || !srcH) throw new Error("이미지 크기를 알 수 없어요 😵");

  let scale = Math.min(1, LIMITS.imageMaxEdge / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 이미지를 처리할 수 없어요 😢");

  let best: { blob: Blob; w: number; h: number } | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);

    for (const quality of [0.86, 0.76, 0.64]) {
      let blob = await canvasToBlob(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob) continue;
      if (!best || blob.size < best.blob.size) best = { blob, w, h };
      if (blob.size <= LIMITS.imageTargetBytes) {
        return { dataUrl: await blobToDataUrl(blob), bytes: blob.size, width: w, height: h };
      }
    }
    scale *= 0.75;
  }

  if (best && best.blob.size <= LIMITS.imageMaxBytes) {
    return { dataUrl: await blobToDataUrl(best.blob), bytes: best.blob.size, width: best.w, height: best.h };
  }
  throw new Error("이미지를 충분히 줄이지 못했어요 😵 화면 일부만 캡처해서 다시 올려주세요");
}
