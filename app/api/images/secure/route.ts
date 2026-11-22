// API Route: /api/images/secure
// GET  - how many of the user's older images are still publicly readable
// POST - moves those images into the user's own private folder and switches
//        the entries to private download-token URLs.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { ENTRIES, entryImages, listUserEntries } from "@/lib/entries/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  getBucket,
  isLegacyPublicUrl,
  isUserPath,
  makeImagePrivate,
  storagePathFromLegacyUrl,
  userImagePrefix,
} from "@/lib/firebase/storage";
import type { Entry, EntryImage } from "@/types";

export const dynamic = "force-dynamic";

function legacyEntries(entries: Entry[]) {
  return entries.filter((e) => entryImages(e).some((img) => isLegacyPublicUrl(img.url)));
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const entries = legacyEntries(await listUserEntries(auth.userId, 2000));
    const images = entries.reduce(
      (n, e) => n + entryImages(e).filter((img) => isLegacyPublicUrl(img.url)).length,
      0
    );
    return NextResponse.json({ entries: entries.length, images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}

async function secureImage(userId: string, img: EntryImage): Promise<EntryImage> {
  if (!isLegacyPublicUrl(img.url)) return img;
  const currentPath = storagePathFromLegacyUrl(img.url);
  if (!currentPath) throw new Error(`Unrecognised image URL: ${img.url}`);

  let path = currentPath;
  const fileName = currentPath.split("/").pop();
  if (!isUserPath(userId, currentPath)) {
    // Older uploads all went to a shared "temp-user-id" folder; move each
    // file (referenced only by this user's entry) into the user's folder.
    const destination = `${userImagePrefix(userId)}${fileName}`;
    await getBucket().file(currentPath).move(destination);
    path = destination;
  }
  const url = await makeImagePrivate(path);
  return { ...img, url, storagePath: path };
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const entries = legacyEntries(await listUserEntries(auth.userId, 2000)).slice(0, 100);
    let secured = 0;
    const failures: string[] = [];

    for (const entry of entries) {
      try {
        const images = await Promise.all(
          entryImages(entry).map((img) => secureImage(auth.userId, img))
        );
        secured += images.length;
        await adminDb
          .collection(ENTRIES)
          .doc(entry.id)
          .update({
            images,
            imageUrl: images[0].url,
            imageStoragePath: images[0].storagePath,
          });
      } catch (error) {
        console.error(`Failed to secure images for entry ${entry.id}:`, error);
        failures.push(entry.id);
      }
    }

    const remaining = legacyEntries(await listUserEntries(auth.userId, 2000)).length;
    return NextResponse.json({ secured, failed: failures.length, remainingEntries: remaining });
  } catch (error) {
    console.error("Error securing images:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to secure images" },
      { status: 500 }
    );
  }
}
