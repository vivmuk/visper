// API Route: DELETE /api/entries/[id] - Delete an entry
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getUserIdFromRequest } from "@/lib/auth/middleware";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get userId from Firebase ID token
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const entryId = params.id;

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Get the entry to verify ownership
    const entryRef = adminDb.collection("entries").doc(entryId);
    const entryDoc = await entryRef.get();

    if (!entryDoc.exists) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    const entryData = entryDoc.data();

    // Verify the user owns this entry
    if (entryData?.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to delete this entry" },
        { status: 403 }
      );
    }

    // Delete the entry
    await entryRef.delete();

    console.log(`Entry ${entryId} deleted successfully by user ${userId}`);

    return NextResponse.json({ 
      success: true,
      message: "Entry deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete entry",
      },
      { status: 500 }
    );
  }
}

