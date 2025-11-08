// Authentication middleware for API routes
import { NextRequest } from "next/server";
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

