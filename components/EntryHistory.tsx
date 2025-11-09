"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

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

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteClick = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !user) return;

    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/entries/${entryToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete entry");
      }

      // Remove the entry from the local state
      setEntries(entries.filter((entry) => entry.id !== entryToDelete));
      showToast("Entry deleted successfully", "success");
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting entry:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to delete entry",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === "timeline"
                  ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                  : "text-gray-600 hover:bg-teal-50"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("tags")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === "tags"
                  ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                  : "text-gray-600 hover:bg-teal-50"
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
                    ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-md"
                    : "bg-gradient-to-r from-teal-50 to-purple-50 text-gray-700 hover:from-teal-100 hover:to-purple-100 border border-teal-200"
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
          <span className="px-3 py-1 bg-gradient-to-r from-teal-100 to-purple-100 text-teal-800 rounded-full text-sm font-medium border border-teal-200">
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
            className="watercolor-card rounded-xl p-5 border border-teal-100 hover:border-teal-200 transition-all"
          >
            {/* Header with date and type */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                {formatDate(entry.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    entry.type === "note"
                      ? "bg-teal-100 text-teal-800"
                      : entry.type === "url"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-pink-100 text-pink-800"
                  }`}
                >
                  {entry.type === "note" ? "Note" : entry.type === "url" ? "URL" : "Image"}
                </span>
                <button
                  onClick={() => handleDeleteClick(entry.id)}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete entry"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
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
            <div className="mb-3 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={async () => {
                    const textToCopy = entry.improvedText || entry.rawText || entry.summary || "";
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      showToast("Copied to clipboard!", "success");
                    } catch (err) {
                      console.error("Failed to copy:", err);
                      showToast("Failed to copy text", "error");
                    }
                  }}
                  className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200 transition-colors"
                  title="Copy text"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              {entry.improvedText ? (
                <pre className="text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-base">{entry.improvedText}</pre>
              ) : entry.rawText ? (
                <pre className="text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-base">{entry.rawText}</pre>
              ) : entry.summary ? (
                <pre className="text-gray-900 leading-relaxed whitespace-pre-wrap font-sans text-base">{entry.summary}</pre>
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

            {/* Tags - Always show if they exist */}
            {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-teal-100">
                <span className="text-xs font-medium text-gray-500 mr-1">Tags:</span>
                {entry.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTag(tag);
                      setViewMode("timeline");
                    }}
                    className="text-xs bg-gradient-to-r from-teal-100 to-purple-100 text-teal-700 px-3 py-1 rounded-full hover:from-teal-200 hover:to-purple-200 transition-all cursor-pointer border border-teal-200"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-teal-100">
                <span className="text-xs text-gray-400 italic">No tags yet</span>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        entryTitle={
          entryToDelete
            ? entries.find((e) => e.id === entryToDelete)?.urlTitle ||
              entries.find((e) => e.id === entryToDelete)?.rawText?.substring(0, 50) ||
              "this entry"
            : undefined
        }
      />
    </div>
  );
}

