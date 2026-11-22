// Shrinks photos in the browser before upload: phone photos are often
// 3-10 MB; a 2048px JPEG is ~300-600 KB and uploads far faster on mobile.

export interface PreparedImage {
  file: File;
  width?: number;
  height?: number;
}

const MAX_DIMENSION = 2048;
const QUALITY = 0.85;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as any);
    } catch {
      // Fall through to <img> decoding
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

export async function prepareImage(file: File): Promise<PreparedImage> {
  // Animated GIFs would lose their animation; keep them as-is.
  if (file.type === "image/gif") return { file };

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    // e.g. HEIC on browsers that can't decode it: upload the original.
    return { file };
  }

  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  // Small enough already and in a web format: skip re-encoding.
  if (scale === 1 && file.size < 1.5 * 1024 * 1024 && /jpeg|png|webp/.test(file.type)) {
    return { file, width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, width, height };
  ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );
  if (!blob || blob.size >= file.size) return { file, width, height };

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { file: new File([blob], name, { type: "image/jpeg" }), width: targetW, height: targetH };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
