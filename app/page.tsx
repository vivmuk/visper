"use client";

import { useState } from "react";
import CaptureForm from "@/components/CaptureForm";
import UrlSummarizer from "@/components/UrlSummarizer";
import EntryHistory from "@/components/EntryHistory";

type ViewMode = "capture" | "url" | "history";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("capture");
  const [isLoading, setIsLoading] = useState(false);

  const handleImprove = async (text: string): Promise<string> => {
    const response = await fetch("/api/entries/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawText: text }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to improve text");
    }

    const data = await response.json();
    return data.improvedText;
  };

  const handleSaveEntry = async (
    rawText: string,
    improvedText: string | null,
    source: "raw" | "improved" | "both",
    imageUrl?: string,
    imageMetadata?: {
      filename: string;
      size: number;
      contentType: string;
    }
  ) => {
    setIsLoading(true);
    try {
      // TODO: Get userId from auth context
      const userId = "temp-user-id"; // Temporary - will be replaced with real auth

      const payload: any = {
        userId,
        type: imageUrl ? "image" : "note",
        source,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        device: navigator.userAgent,
      };

      if (source === "raw" || source === "both") {
        payload.rawText = rawText;
      }

      if (source === "improved" || source === "both") {
        if (!improvedText) {
          throw new Error("Improved text is required for this save type");
        }
        payload.improvedText = improvedText;
      }

      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imageStoragePath = imageUrl.split("/").slice(-2).join("/"); // Extract path
        payload.imageMetadata = imageMetadata;
      }

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save entry");
      }

      // Show success toast (simplified)
      alert("Saved! · " + new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrl = async (url: string, summary: any) => {
    setIsLoading(true);
    try {
      // TODO: Get userId from auth context
      const userId = "temp-user-id";

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: "url",
          source: "improved",
          url,
          urlTitle: summary.meta.title,
          urlDomain: summary.meta.domain,
          urlAuthor: summary.meta.author,
          urlChecksum: summary.meta.checksum,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          quotes: summary.quotes,
          tags: summary.tags || [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          device: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save URL");
      }

      alert("Saved! · " + new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error saving URL:", error);
      alert("Failed to save URL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Whisper</h1>
          <p className="text-lg text-gray-600">
            A thoughtful journal that thinks with you.
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setViewMode("capture")}
            className={`px-4 py-2 font-medium ${
              viewMode === "capture"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setViewMode("url")}
            className={`px-4 py-2 font-medium ${
              viewMode === "url"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            URL
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-4 py-2 font-medium ${
              viewMode === "history"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        {viewMode === "capture" ? (
          <CaptureForm
            onSave={handleSaveEntry}
            onImprove={handleImprove}
            isLoading={isLoading}
          />
        ) : viewMode === "url" ? (
          <UrlSummarizer onSave={handleSaveUrl} isLoading={isLoading} />
        ) : (
          <EntryHistory userId="temp-user-id" />
        )}
      </div>
    </main>
  );
}
