// API Route: GET /api/health
// Checks the services Visper depends on, so failures (e.g. a closed Google
// billing account or an empty Venice balance) show up in the app instead of
// failing silently. Requires sign-in; makes no AI inference calls.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { adminDb } from "@/lib/firebase/admin";
import { getBucket, userImagePrefix } from "@/lib/firebase/storage";
import { getVeniceBalance } from "@/lib/venice/client";
import type { HealthCheck, HealthResponse } from "@/types";

export const dynamic = "force-dynamic";

function failure(error: unknown): HealthCheck {
  const message = error instanceof Error ? error.message : String(error);
  if (/billing account/i.test(message)) {
    return { ok: false, message: "Google Cloud billing is disabled for this Firebase project" };
  }
  return { ok: false, message: message.slice(0, 200) };
}

async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms)),
  ]);
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const [firestore, storage, venice] = await Promise.all([
    withTimeout(
      adminDb.collection("entries").where("userId", "==", auth.userId).limit(1).get()
    ).then((): HealthCheck => ({ ok: true }), failure),
    withTimeout(
      getBucket().getFiles({ prefix: userImagePrefix(auth.userId), maxResults: 1, autoPaginate: false })
    ).then((): HealthCheck => ({ ok: true }), failure),
    withTimeout(getVeniceBalance()).then(
      ({ usd, diem }): HealthResponse["checks"]["venice"] => {
        const low = usd < 0.5 && diem < 0.5;
        return {
          ok: !low,
          balanceUsd: usd,
          balanceDiem: diem,
          ...(low ? { message: "Venice balance is almost empty — AI features will stop working" } : {}),
        };
      },
      failure
    ),
  ]);

  const response: HealthResponse = {
    ok: firestore.ok && storage.ok && venice.ok,
    checks: { firestore, storage, venice },
  };
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
