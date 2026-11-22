// Authentication middleware for API routes
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}


/**
 * Convenience wrapper for API routes: returns the verified user ID, or a 401
 * response to return directly.
 *
 *   const auth = await requireUser(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { userId } = auth;
 */
export async function requireUser(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in." },
      { status: 401 }
    );
  }
  return { userId };
}
