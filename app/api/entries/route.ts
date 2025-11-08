// API Route: POST /api/entries - Create a new entry
// API Route: GET /api/entries - List entries (with optional filters)
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { CreateEntryRequest, Entry, SearchRequest } from "@/types";

// POST /api/entries - Create entry
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to get userId from token
    // For now, we'll accept userId in the request body (temporary)
    const body: CreateEntryRequest & { userId: string } = await request.json();

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!body.type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    if (body.type === "note" && !body.rawText && !body.improvedText) {
      return NextResponse.json(
        { error: "rawText or improvedText is required for note entries" },
        { status: 400 }
      );
    }

    if (body.type === "url" && !body.url) {
      return NextResponse.json(
        { error: "url is required for url entries" },
        { status: 400 }
      );
    }

    if (body.type === "image" && !body.imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required for image entries" },
        { status: 400 }
      );
    }

    // Verify Firebase Admin is initialized
    try {
      // Test Firebase connection by accessing adminDb
      const testCollection = adminDb.collection("entries");
      console.log("Firebase Admin initialized successfully");
    } catch (firebaseError) {
      console.error("Firebase Admin initialization error:", firebaseError);
      return NextResponse.json(
        {
          error: "Firebase Admin not configured. Check environment variables.",
          details: firebaseError instanceof Error ? firebaseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Create entry document
    const entryData: Omit<Entry, "id"> = {
      userId: body.userId,
      type: body.type,
      source: body.source || (body.improvedText ? "improved" : "raw"),
      rawText: body.rawText,
      improvedText: body.improvedText,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
      timezone: body.timezone,
      device: body.device,
      tags: body.tags || [],
      entities: [],
      url: body.url,
      imageUrl: body.imageUrl,
      imageStoragePath: body.imageStoragePath,
      imageMetadata: body.imageMetadata,
    };

    console.log("Attempting to save entry to Firestore...");
    const docRef = await adminDb.collection("entries").add(entryData);
    console.log("Entry saved successfully with ID:", docRef.id);

    // Fetch the created document to return it
    const doc = await docRef.get();
    const entry = { id: doc.id, ...doc.data() } as Entry;

    return NextResponse.json({ id: doc.id, entry });
  } catch (error) {
    console.error("Error creating entry:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create entry";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : "Unknown",
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

// GET /api/entries - List entries with filters
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    // Build query
    let query: FirebaseFirestore.Query = adminDb
      .collection("entries")
      .where("userId", "==", userId);

    // Apply filters
    const type = searchParams.get("type");
    if (type && (type === "note" || type === "url")) {
      query = query.where("type", "==", type);
    }

    const tag = searchParams.get("tag");
    if (tag) {
      query = query.where("tags", "array-contains", tag);
    }

    const sentiment = searchParams.get("sentiment");
    if (sentiment && ["negative", "neutral", "positive"].includes(sentiment)) {
      query = query.where("sentiment", "==", sentiment);
    }

    // Date range filtering
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Note: Firestore requires orderBy before where clauses with range filters
    // So we'll filter after fetching if needed, or use a different approach
    // For now, we'll filter client-side after fetching
    
    // Order by createdAt descending (newest first)
    query = query.orderBy("createdAt", "desc");

    // Limit results
    const limit = parseInt(searchParams.get("limit") || "50");
    query = query.limit(limit);

    const snapshot = await query.get();
    let entries = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }) as Entry[];

    // Filter by date range if provided (client-side filtering)
    // This is necessary because Firestore requires orderBy before range filters
    if (from) {
      const fromDate = new Date(from);
      entries = entries.filter((entry) => {
        if (!entry.createdAt) return false;
        let entryDate: Date;
        if (entry.createdAt && typeof (entry.createdAt as any).toDate === "function") {
          // Firestore Timestamp
          entryDate = (entry.createdAt as any).toDate();
        } else if (entry.createdAt && (entry.createdAt as any).seconds) {
          // Firestore Timestamp in serialized form
          entryDate = new Date((entry.createdAt as any).seconds * 1000);
        } else {
          entryDate = new Date(entry.createdAt as any);
        }
        return entryDate >= fromDate;
      });
    }

    if (to) {
      const toDate = new Date(to);
      entries = entries.filter((entry) => {
        if (!entry.createdAt) return false;
        let entryDate: Date;
        if (entry.createdAt && typeof (entry.createdAt as any).toDate === "function") {
          entryDate = (entry.createdAt as any).toDate();
        } else if (entry.createdAt && (entry.createdAt as any).seconds) {
          entryDate = new Date((entry.createdAt as any).seconds * 1000);
        } else {
          entryDate = new Date(entry.createdAt as any);
        }
        return entryDate <= toDate;
      });
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch entries",
      },
      { status: 500 }
    );
  }
}

