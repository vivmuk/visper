// API Route: GET /api/memories?date=YYYY-MM-DD&tz=America/New_York
// "On this day" and "this week in past years": entries written on (or within
// 3 days of) today's date in previous years, in the user's own time zone.
//
// Only a small date window per past year is read from Firestore, so this stays
// cheap to call every time the Write tab opens.
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth/middleware";
import { adminDb } from "@/lib/firebase/admin";
import { ENTRIES } from "@/lib/entries/server";
import { findMemories, localParts, parseDayKey } from "@/lib/entries/shared";
import type { Entry } from "@/types";

export const dynamic = "force-dynamic";

const YEARS_BACK = 12;
const WINDOW_DAYS = 3;

function validTimeZone(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const params = request.nextUrl.searchParams;
    const timeZone = validTimeZone(params.get("tz"));
    const today = parseDayKey(params.get("date") || "") || localParts(new Date(), timeZone);

    // One small range query per past year: today's date ± (window + 1 day of
    // time-zone slack). Uses the existing (userId, createdAt) index.
    const margin = (WINDOW_DAYS + 1) * 86400000;
    const snapshots = await Promise.all(
      Array.from({ length: YEARS_BACK }, (_, i) => today.y - 1 - i).map((year) => {
        const center = Date.UTC(year, today.m - 1, today.d);
        return adminDb
          .collection(ENTRIES)
          .where("userId", "==", auth.userId)
          .where("createdAt", ">=", Timestamp.fromMillis(center - margin))
          .where("createdAt", "<=", Timestamp.fromMillis(center + margin))
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
      })
    );

    const entries = snapshots.flatMap((snap) =>
      snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Entry)
    );
    const memories = findMemories(entries, today, timeZone, WINDOW_DAYS);

    return NextResponse.json(memories, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error loading memories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't load memories" },
      { status: 500 }
    );
  }
}
