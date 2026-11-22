// API Route: POST /api/reflect
// Generates a gentle weekly or monthly reflection from recent entries.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { reflectOnJournal } from "@/lib/venice/client";
import { entryToText, formatEntryDate, listUserEntries, toDate } from "@/lib/entries/server";
import type { Reflection } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const period: "week" | "month" = body.period === "month" ? "month" : "week";
    const since = new Date(Date.now() - (period === "week" ? 7 : 31) * 24 * 60 * 60 * 1000);

    const entries = (await listUserEntries(auth.userId, 400)).filter((e) => {
      const d = toDate(e.createdAt);
      return d && d >= since;
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: `No entries in the last ${period}. Write a little and come back!` },
        { status: 400 }
      );
    }

    // Oldest first so the model sees the arc of the period. Keep the prompt
    // bounded: shorter excerpts when there are many entries.
    const perEntry = entries.length > 40 ? 500 : 1500;
    const context = entries
      .slice()
      .reverse()
      .map((e) => ({ id: e.id, date: formatEntryDate(e), text: entryToText(e).slice(0, perEntry) }));

    const result = await reflectOnJournal(period, context);
    const reflection: Reflection = { ...result, entryCount: entries.length, period };
    return NextResponse.json({ reflection });
  } catch (error) {
    console.error("Error generating reflection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't create a reflection right now" },
      { status: 500 }
    );
  }
}
