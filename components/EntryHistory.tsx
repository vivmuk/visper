"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Entry } from "@/types";

interface EntryHistoryProps {
  userId: string;
}

export default function EntryHistory({ userId }: EntryHistoryProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "tags">("timeline");
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

  // Group entries by tags
  const tagGroups = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach((entry) => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach((tag) => {
          if (!groups[tag]) {
            groups[tag] = [];
          }
          if (!groups[tag].find((e) => e.id === entry.id)) {
            groups[tag].push(entry);
          }
        });
      }
    });
    return groups;
  }, [entries]);

  // Get all unique tags with counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Filter entries by selected tag
  const filteredEntries = useMemo(() => {
    if (!selectedTag) return entries;
    return entries.filter(
      (entry) => entry.tags && entry.tags.includes(selectedTag)
    );
  }, [entries, selectedTag]);

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
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">
          {selectedTag ? `Tag: ${selectedTag}` : "Last 30 Days"}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 border rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode("timeline");
                setSelectedTag(null);
              }}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "timeline"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("tags")}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "tags"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tags
            </button>
          </div>
          <span className="text-sm text-gray-500">
            {selectedTag ? filteredEntries.length : entries.length} entries
          </span>
        </div>
      </div>

      {/* Tag cloud view */}
      {viewMode === "tags" && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(selectedTag === tag ? null : tag);
                  setViewMode("timeline");
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                #{tag} ({count})
              </button>
            ))}
          </div>
          {tagCounts.length === 0 && (
            <p className="text-gray-500 text-sm mt-4">
              No tags found. Tags will be automatically generated when you save entries.
            </p>
          )}
        </div>
      )}

      {/* Selected tag filter */}
      {selectedTag && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtered by:</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            #{selectedTag}
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-4">
        {(selectedTag ? filteredEntries : entries).map((entry) => (
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

            {/* Enriched metadata */}
            {(entry.topics || entry.keywords || entry.category) && (
              <div className="mt-3 space-y-2">
                {entry.category && (
                  <div className="text-xs">
                    <span className="text-gray-500">Category: </span>
                    <span className="font-medium text-gray-700">{entry.category}</span>
                  </div>
                )}
                {entry.topics && entry.topics.length > 0 && (
                  <div className="text-xs">
                    <span className="text-gray-500">Topics: </span>
                    <span className="text-gray-700">
                      {entry.topics.slice(0, 3).join(", ")}
                      {entry.topics.length > 3 && ` +${entry.topics.length - 3} more`}
                    </span>
                  </div>
                )}
                {entry.keywords && entry.keywords.length > 0 && (
                  <div className="text-xs">
                    <span className="text-gray-500">Keywords: </span>
                    <span className="text-gray-700">
                      {entry.keywords.slice(0, 5).join(", ")}
                      {entry.keywords.length > 5 && ` +${entry.keywords.length - 5} more`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Image metadata */}
            {entry.type === "image" && (
              <div className="mt-3 space-y-2">
                {entry.imageDescription && (
                  <p className="text-sm text-gray-600 italic">{entry.imageDescription}</p>
                )}
                {entry.imageObjects && entry.imageObjects.length > 0 && (
                  <div className="text-xs">
                    <span className="text-gray-500">Objects: </span>
                    <span className="text-gray-700">{entry.imageObjects.join(", ")}</span>
                  </div>
                )}
                {entry.imageScene && (
                  <div className="text-xs">
                    <span className="text-gray-500">Scene: </span>
                    <span className="text-gray-700">{entry.imageScene}</span>
                  </div>
                )}
                {entry.imageMood && (
                  <div className="text-xs">
                    <span className="text-gray-500">Mood: </span>
                    <span className="text-gray-700">{entry.imageMood}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {entry.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTag(tag);
                      setViewMode("timeline");
                    }}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
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

