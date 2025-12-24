// API Route: GET /api/entries/export - Download history as interactive HTML
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getUserIdFromRequest } from "@/lib/auth/middleware";
import { buildHistoryExportHtml } from "@/lib/export/buildHistoryExportHtml";

const MAX_ENTRIES = 2000;

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request as any);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const includeImages = url.searchParams.get("includeImages") !== "false";

    // Fetch ALL entries (no date limit)
    const snapshot = await adminDb
      .collection("entries")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(MAX_ENTRIES)
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const exportDate = new Date();
    const html = buildHistoryExportHtml(entries as any, exportDate, includeImages);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="visper-history-${exportDate
          .toISOString()
          .split("T")[0]}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting entries:", error);
    return NextResponse.json(
      {
        error: "Failed to generate export",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



