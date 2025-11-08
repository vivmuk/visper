"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Entry } from "@/types";

interface EntryHistoryProps {
  userId: string;
}

export default function EntryHistory({ userId }: EntryHistoryProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      try {
        // Get Firebase ID token for authentication
        const idToken = await user.getIdToken();
        
        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString();

        const response = await fetch(
          `/api/entries?from=${fromDate}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch entries");
        }

        const data = await response.json();
        setEntries(data.entries || []);
      } catch (err) {
        console.error("Error fetching entries:", err);
        setError(err instanceof Error ? err.message : "Failed to load entries");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEntries();
    }
  }, [user]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";
    try {
      let date: Date;
      // Handle Firestore Timestamp in various formats
      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp && timestamp.seconds) {
        // Serialized Firestore Timestamp
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp && timestamp._seconds) {
        // Another Firestore Timestamp format
        date = new Date(timestamp._seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-500">Loading entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong className="font-semibold">Error:</strong> {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No entries found for the last 30 days.</p>
        <p className="text-gray-400 text-sm mt-2">Start writing to see your entries here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Last 30 Days</h2>
        <span className="text-sm text-gray-500">{entries.length} entries</span>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header with date and type */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                {formatDate(entry.createdAt)}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  entry.type === "note"
                    ? "bg-blue-100 text-blue-800"
                    : entry.type === "url"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {entry.type === "note" ? "Note" : entry.type === "url" ? "URL" : "Image"}
              </span>
            </div>

            {/* Image */}
            {entry.imageUrl && (
              <div className="mb-3">
                <img
                  src={entry.imageUrl}
                  alt={entry.imageMetadata?.filename || "Entry image"}
                  className="max-w-full rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* Content */}
            <div className="mb-3">
              {entry.improvedText ? (
                <p className="text-gray-800 leading-relaxed">{entry.improvedText}</p>
              ) : entry.rawText ? (
                <p className="text-gray-800 leading-relaxed">{entry.rawText}</p>
              ) : entry.summary ? (
                <p className="text-gray-800 leading-relaxed">{entry.summary}</p>
              ) : null}
            </div>

            {/* URL link if it's a URL entry */}
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1 mb-3"
              >
                <span>🔗</span>
                {entry.urlTitle || entry.url}
              </a>
            )}

            {/* Key points for URL entries */}
            {entry.keyPoints && entry.keyPoints.length > 0 && (
              <div className="mt-3 mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Points:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {entry.keyPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {entry.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Sentiment indicator */}
            {entry.sentiment && (
              <div className="mt-3 text-xs">
                <span className="text-gray-500">Sentiment: </span>
                <span
                  className={`font-medium ${
                    entry.sentiment === "positive"
                      ? "text-green-600"
                      : entry.sentiment === "negative"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {entry.sentiment}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

