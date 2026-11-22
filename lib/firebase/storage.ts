// Server-side helpers for journal images in Firebase Storage.
//
// Images are stored privately. Instead of making objects public (which exposed
// every photo to anyone with the URL pattern and fails on buckets with uniform
// access), each object gets a random Firebase download token. The resulting
// URL is unguessable and works in <img> tags without auth headers.
import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase/admin";
import type { EntryImage } from "@/types";

export const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "wisper-vivek.firebasestorage.app";

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_ENTRY = 6;

export function getBucket() {
  return adminStorage.bucket(STORAGE_BUCKET);
}

export function userImagePrefix(userId: string) {
  return `entries/${userId}/`;
}

/** True when a storage path lives inside this user's own folder. */
export function isUserPath(userId: string, storagePath: unknown): storagePath is string {
  return (
    typeof storagePath === "string" &&
    storagePath.startsWith(userImagePrefix(userId)) &&
    !storagePath.includes("..")
  );
}

export function buildDownloadUrl(storagePath: string, token: string) {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/` +
    `${encodeURIComponent(storagePath)}?alt=media&token=${token}`
  );
}

/** Uploads an image buffer privately and returns its token URL. */
export async function saveUserImage(
  userId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<EntryImage> {
  const ext = ALLOWED_IMAGE_TYPES[contentType] || "jpg";
  const storagePath = `${userImagePrefix(userId)}${randomUUID()}.${ext}`;
  const token = randomUUID();

  await getBucket()
    .file(storagePath)
    .save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "private, max-age=31536000, immutable",
        metadata: {
          firebaseStorageDownloadTokens: token,
          userId,
          originalName: originalName.slice(0, 200),
          uploadedAt: new Date().toISOString(),
        },
      },
    });

  return {
    url: buildDownloadUrl(storagePath, token),
    storagePath,
    filename: originalName.slice(0, 200),
    size: buffer.length,
    contentType,
  };
}

/** Downloads an image and returns it as a data: URL for multimodal AI calls. */
export async function downloadAsDataUrl(storagePath: string): Promise<string> {
  const file = getBucket().file(storagePath);
  const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  const contentType = metadata.contentType || "image/jpeg";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

/** Best-effort delete; missing files are ignored. */
export async function deleteStorageFiles(paths: string[]) {
  const bucket = getBucket();
  await Promise.all(
    paths.map((p) =>
      bucket
        .file(p)
        .delete({ ignoreNotFound: true })
        .catch((error) => console.error(`Failed to delete ${p}:`, error))
    )
  );
}

/**
 * Converts an old publicly-readable image into a private, token-protected
 * one. Returns the new URL.
 */
export async function makeImagePrivate(storagePath: string): Promise<string> {
  const file = getBucket().file(storagePath);
  const [metadata] = await file.getMetadata();
  let token = String(metadata.metadata?.firebaseStorageDownloadTokens || "").split(",")[0];
  if (!token) {
    token = randomUUID();
    await file.setMetadata({
      metadata: { firebaseStorageDownloadTokens: token },
    });
  }
  try {
    await file.makePrivate();
  } catch (error) {
    // Buckets with uniform bucket-level access reject per-object ACL changes;
    // public access there is controlled at the bucket level instead.
    console.warn(`makePrivate failed for ${storagePath}:`, error);
  }
  return buildDownloadUrl(storagePath, token);
}

/** Old entries stored public storage.googleapis.com URLs; recover the path. */
export function storagePathFromLegacyUrl(url: string): string | null {
  const prefix = `https://storage.googleapis.com/${STORAGE_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split("?")[0]);
}

export function isLegacyPublicUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://storage.googleapis.com/");
}
