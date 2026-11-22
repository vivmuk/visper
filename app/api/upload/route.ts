// API Route: POST /api/upload
// Uploads one image to the signed-in user's private folder in Firebase Storage.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, saveUserImage } from "@/lib/firebase/storage";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, WebP, GIF or HEIC." },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 10 MB" }, { status: 400 });
    }

    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await saveUserImage(auth.userId, buffer, file.type, file.name || "image");

    return NextResponse.json({ image: { ...image, width, height } });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: describeStorageError(error) },
      { status: 500 }
    );
  }
}

/** Turns Google Cloud errors into a message a person can act on. */
function describeStorageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/billing account/i.test(message)) {
    return "Image storage is unavailable: the Google Cloud billing account for this Firebase project is disabled. Re-enable billing in the Google Cloud console.";
  }
  if (/permission|forbidden|403/i.test(message)) {
    return `Image storage refused the upload (${message.slice(0, 160)})`;
  }
  return message || "Failed to upload image";
}
