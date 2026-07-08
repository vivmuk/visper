// API Route: GET /api/entries/backup
// Downloads a full backup (all entry text/metadata as JSON + a readable HTML
// timeline + the original image files) bundled into a single ZIP.
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getUserIdFromRequest } from "@/lib/auth/middleware";
import { buildHistoryExportHtml } from "@/lib/export/buildHistoryExportHtml";

const MAX_ENTRIES = 2000;
const STORAGE_BUCKET = "wisper-vivek.firebasestorage.app";

function serializeTimestamp(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  if (typeof value._seconds === "number") return new Date(value._seconds * 1000).toISOString();
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const includeImages = url.searchParams.get("includeImages") !== "false";

    const snapshot = await adminDb
      .collection("entries")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(MAX_ENTRIES)
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<Record<string, any>>;

    const zip = new JSZip();

    // Machine-readable backup of every entry's text and metadata.
    const serializedEntries = entries.map((entry) => ({
      ...entry,
      createdAt: serializeTimestamp(entry.createdAt),
      updatedAt: serializeTimestamp(entry.updatedAt),
      urlFetchedAt: serializeTimestamp(entry.urlFetchedAt),
    }));
    zip.file("entries.json", JSON.stringify(serializedEntries, null, 2));

    // Human-readable timeline for browsing the backup offline.
    const exportDate = new Date();
    const html = buildHistoryExportHtml(entries as any, exportDate, true);
    zip.file("visper-history.html", html);

    if (includeImages) {
      const imagesFolder = zip.folder("images")!;
      const bucket = adminStorage.bucket(STORAGE_BUCKET);
      const downloadErrors: string[] = [];

      const imageEntries = entries.filter((entry) => entry.imageStoragePath);

      await Promise.all(
        imageEntries.map(async (entry) => {
          try {
            const [buffer] = await bucket.file(entry.imageStoragePath).download();
            const originalName = entry.imageMetadata?.filename || entry.imageStoragePath.split("/").pop();
            const filename = safeFilename(`${entry.id}-${originalName}`);
            imagesFolder.file(filename, buffer);
          } catch (error) {
            downloadErrors.push(
              `${entry.id}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        })
      );

      if (downloadErrors.length > 0) {
        zip.file("image-download-errors.txt", downloadErrors.join("\n"));
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="visper-backup-${exportDate
          .toISOString()
          .split("T")[0]}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating backup:", error);
    return NextResponse.json(
      {
        error: "Failed to generate backup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
