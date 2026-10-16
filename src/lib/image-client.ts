"use client";

/** Browser-only image helpers: resize, background removal, alpha trim. */

export async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(blob);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не удалось сохранить изображение"))), type, quality);
  });
}

/** Downscale so the longest side is at most `maxSide`. Keeps PNG transparency when asked. */
export async function resizeImage(blob: Blob, maxSide: number, type: "image/jpeg" | "image/png" = "image/jpeg", quality = 0.88) {
  const bmp = await loadBitmap(blob);
  const ratio = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * ratio));
  const h = Math.max(1, Math.round(bmp.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return { blob: await canvasToBlob(canvas, type, quality), width: w, height: h };
}

/** Remove the background in the browser (model is downloaded once and cached by the browser). */
export async function removeBg(blob: Blob, onProgress?: (fraction: number, stage: string) => void): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(blob, {
    model: "isnet_quint8",
    output: { format: "image/png", quality: 1 },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || !total) return;
      const stage = key.startsWith("fetch") ? "model" : "compute";
      onProgress(current / total, stage);
    },
  });
}

/** Crop away transparent margins so items sit tight in collages and try-on zones. */
export async function trimTransparent(blob: Blob, padding = 8): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await loadBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { blob, width, height };
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return { blob: await canvasToBlob(out, "image/png"), width: w, height: h };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
