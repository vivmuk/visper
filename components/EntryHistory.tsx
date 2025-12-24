"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import type { Entry } from "@/types";

interface EntryHistoryProps {
  userId: string;
}

interface MonthGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  entries: Entry[];
}

export default function EntryHistory({ userId }: EntryHistoryProps) {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "tags">("timeline");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeImagesInExport, setIncludeImagesInExport] = useState(true);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchAllEntries = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      
      // Fetch all entries without date filter, with higher limit
      const response = await fetch(
        `/api/entries?limit=1000`,
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
      setAllEntries(data.entries || []);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Group entries by month
  const monthGroups = useMemo(() => {
    const groups: Map<string, MonthGroup> = new Map();
    
    allEntries.forEach((entry) => {
      const date = getEntryDate(entry);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      if (!groups.has(key)) {
        groups.set(key, { key, label, year, month, entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    });
    
    // Sort by date descending
    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [allEntries]);

  // Set default selected month to the most recent
  useEffect(() => {
    if (monthGroups.length > 0 && !selectedMonthKey) {
      setSelectedMonthKey(monthGroups[0].key);
    }
  }, [monthGroups, selectedMonthKey]);

  // Get entries for display based on filters
  const entries = useMemo(() => {
    if (selectedTag) {
      return allEntries.filter(
        (entry) => entry.tags && entry.tags.includes(selectedTag)
      );
    }
    return allEntries;
  }, [allEntries, selectedTag]);

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
      setAllEntries(allEntries.filter((entry) => entry.id !== entryToDelete));
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

  const handleDownloadExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams();
      params.set("includeImages", String(includeImagesInExport));
      
      const response = await fetch(`/api/entries/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visper-history-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Download started!", "success");
      setShowExportOptions(false);
    } catch (error) {
      console.error("Error exporting history:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to download history",
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const scrollToMonth = (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    const ref = monthRefs.current[monthKey];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function getEntryDate(entry: Entry): Date {
    const timestamp = entry.createdAt as any;
    try {
      if (!timestamp) return new Date(0);
      if (typeof timestamp.toDate === "function") return timestamp.toDate();
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
      if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
      return new Date(timestamp);
    } catch {
      return new Date(0);
    }
  }

  // Get all unique tags with counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allEntries]);

  // Filter entries by selected tag
  const filteredEntries = useMemo(() => {
    if (!selectedTag) return entries;
    return entries.filter(
      (entry) => entry.tags && entry.tags.includes(selectedTag)
    );
  }, [entries, selectedTag]);

  // Group filtered entries by month for display
  const displayMonthGroups = useMemo(() => {
    const targetEntries = selectedTag ? filteredEntries : allEntries;
    const groups: Map<string, MonthGroup> = new Map();
    
    targetEntries.forEach((entry) => {
      const date = getEntryDate(entry);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      if (!groups.has(key)) {
        groups.set(key, { key, label, year, month, entries: [] });
      }
      groups.get(key)!.entries.push(entry);
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [allEntries, filteredEntries, selectedTag]);

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

  if (allEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No entries found.</p>
        <p className="text-gray-400 text-sm mt-2">Start writing to see your entries here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-semibold">
          {selectedTag ? `Tag: ${selectedTag}` : "All Entries"}
        </h2>
        <div className="flex items-center gap-4 flex-wrap justify-end">
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
            {selectedTag ? filteredEntries.length : allEntries.length} entries
          </span>
          
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? "Preparing..." : "Download"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                <h4 className="font-medium text-gray-800 mb-3">Export Options</h4>
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={includeImagesInExport}
                    onChange={(e) => setIncludeImagesInExport(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Include images</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  {includeImagesInExport 
                    ? "Images will be embedded (larger file size)" 
                    : "Export will be smaller without images"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadExport}
                    disabled={isExporting}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:shadow-md transition disabled:opacity-50"
                  >
                    {isExporting ? "..." : "Download HTML"}
                  </button>
                  <button
                    onClick={() => setShowExportOptions(false)}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Month Navigation - horizontal scrollable */}
      {viewMode === "timeline" && !selectedTag && monthGroups.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Jump to Month</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {monthGroups.map((group) => (
              <button
                key={group.key}
                onClick={() => scrollToMonth(group.key)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-all ${
                  selectedMonthKey === group.key
                    ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {group.label} ({group.entries.length})
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Entries grouped by month */}
      <div className="space-y-8">
        {displayMonthGroups.map((monthGroup) => (
          <div
            key={monthGroup.key}
            ref={(el) => { monthRefs.current[monthGroup.key] = el; }}
            className="scroll-mt-4"
          >
            {/* Month header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-sm py-3 mb-4 border-b border-teal-100">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                <span className="bg-gradient-to-r from-teal-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {monthGroup.entries.length}
                </span>
                {monthGroup.label}
              </h3>
            </div>
            
            {/* Entries for this month */}
            <div className="space-y-4">
              {monthGroup.entries.map((entry) => (
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
            ? allEntries.find((e) => e.id === entryToDelete)?.urlTitle ||
              allEntries.find((e) => e.id === entryToDelete)?.rawText?.substring(0, 50) ||
              "this entry"
            : undefined
        }
      />
    </div>
  );
}

