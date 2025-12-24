"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import type { Entry } from "@/types";

interface ImageGalleryProps {
  userId: string;
}

interface ImageEntry {
  id: string;
  imageUrl: string;
  imageDescription?: string;
  imageMood?: string;
  imageScene?: string;
  imageObjects?: string[];
  tags?: string[];
  createdAt: any;
  rawText?: string;
  improvedText?: string;
}

export default function ImageGallery({ userId }: ImageGalleryProps) {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageEntry | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("masonry");
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchImageEntries = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      
      // Fetch all entries and filter for images
      const response = await fetch(`/api/entries?limit=1000`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch entries");
      }

      const data = await response.json();
      // Filter for entries with images
      const imageEntries = (data.entries || []).filter(
        (entry: any) => entry.imageUrl
      );
      setEntries(imageEntries);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchImageEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Group images by month
  const imagesByMonth = useMemo(() => {
    const groups: Map<string, { label: string; images: ImageEntry[] }> = new Map();
    
    entries.forEach((entry) => {
      const date = getEntryDate(entry);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      if (!groups.has(key)) {
        groups.set(key, { label, images: [] });
      }
      groups.get(key)!.images.push(entry);
    });
    
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [entries]);

  function getEntryDate(entry: ImageEntry): Date {
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

  const formatDate = (timestamp: any) => {
    const date = getEntryDate({ createdAt: timestamp } as ImageEntry);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-500">Loading images...</p>
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
        <div className="text-6xl mb-4">🖼️</div>
        <p className="text-gray-500 text-lg">No images uploaded yet.</p>
        <p className="text-gray-400 text-sm mt-2">
          Upload images with your entries to see them here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Image Gallery</h2>
          <p className="text-sm text-gray-500 mt-1">
            {entries.length} image{entries.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        
        {/* View toggle */}
        <div className="flex gap-2 border rounded-lg p-1">
          <button
            onClick={() => setViewMode("masonry")}
            className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
              viewMode === "masonry"
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                : "text-gray-600 hover:bg-purple-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
            </svg>
            Masonry
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
              viewMode === "grid"
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                : "text-gray-600 hover:bg-purple-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
        </div>
      </div>

      {/* Images by Month */}
      {imagesByMonth.map((monthGroup) => (
        <div key={monthGroup.key} className="space-y-4">
          {/* Month header */}
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-700">{monthGroup.label}</h3>
            <span className="text-sm text-gray-400">
              {monthGroup.images.length} image{monthGroup.images.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Image grid */}
          {viewMode === "masonry" ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {monthGroup.images.map((image) => (
                <div
                  key={image.id}
                  className="break-inside-avoid group cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50">
                    <img
                      src={image.imageUrl}
                      alt={image.imageDescription || "Gallery image"}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      <p className="text-white text-xs font-medium truncate">
                        {formatDate(image.createdAt)}
                      </p>
                      {image.imageMood && (
                        <p className="text-white/80 text-xs truncate">
                          {image.imageMood}
                        </p>
                      )}
                    </div>
                    {/* Tags indicator */}
                    {image.tags && image.tags.length > 0 && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-purple-600 text-xs px-2 py-1 rounded-full font-medium shadow-md">
                        {image.tags.length} tag{image.tags.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {monthGroup.images.map((image) => (
                <div
                  key={image.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50">
                    <img
                      src={image.imageUrl}
                      alt={image.imageDescription || "Gallery image"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                      <p className="text-white text-xs font-medium truncate">
                        {formatDate(image.createdAt)}
                      </p>
                      {image.imageMood && (
                        <p className="text-white/80 text-xs truncate">
                          {image.imageMood}
                        </p>
                      )}
                    </div>
                    {/* Tags indicator */}
                    {image.tags && image.tags.length > 0 && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-purple-600 text-xs px-2 py-1 rounded-full font-medium shadow-md">
                        {image.tags.length} tag{image.tags.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
              {/* Image */}
              <div className="lg:flex-1 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4 lg:p-8">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.imageDescription || "Gallery image"}
                  className="max-w-full max-h-[60vh] lg:max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              </div>

              {/* Info panel */}
              <div className="lg:w-80 p-6 overflow-y-auto bg-white">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Image Details</h3>
                
                <div className="space-y-4">
                  {/* Date */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                    <p className="text-sm text-gray-800">{formatDate(selectedImage.createdAt)}</p>
                  </div>

                  {/* Description */}
                  {selectedImage.imageDescription && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-gray-700">{selectedImage.imageDescription}</p>
                    </div>
                  )}

                  {/* Scene */}
                  {selectedImage.imageScene && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Scene</p>
                      <p className="text-sm text-gray-700">{selectedImage.imageScene}</p>
                    </div>
                  )}

                  {/* Mood */}
                  {selectedImage.imageMood && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mood</p>
                      <p className="text-sm text-gray-700">{selectedImage.imageMood}</p>
                    </div>
                  )}

                  {/* Objects */}
                  {selectedImage.imageObjects && selectedImage.imageObjects.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Objects</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedImage.imageObjects.map((obj, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedImage.tags && selectedImage.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedImage.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gradient-to-r from-teal-100 to-purple-100 text-teal-700 px-2 py-1 rounded-full border border-teal-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Entry text */}
                  {(selectedImage.improvedText || selectedImage.rawText) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Entry Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedImage.improvedText || selectedImage.rawText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Download button */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <a
                    href={selectedImage.imageUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Image
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

