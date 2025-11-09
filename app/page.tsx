"use client";

import { useState } from "react";
import Image from "next/image";
import CaptureForm from "@/components/CaptureForm";
import UrlSummarizer from "@/components/UrlSummarizer";
import EntryHistory from "@/components/EntryHistory";
import LoginButton from "@/components/LoginButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";

type ViewMode = "capture" | "url" | "history";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("capture");
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

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
      if (!user) {
        throw new Error("You must be signed in to save entries");
      }
      const userId = user.uid;

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

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();
      
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error || "Failed to save entry";
        const details = data.details ? `\n\nDetails: ${data.details}` : "";
        console.error("API Error:", data);
        throw new Error(errorMsg + details);
      }

      const result = await response.json();
      console.log("Entry saved successfully:", result);

      showToast("Saved! · " + new Date().toLocaleTimeString(), "success");
    } catch (error) {
      console.error("Error saving entry:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save entry. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrl = async (url: string, summary: any) => {
    setIsLoading(true);
    try {
      if (!user) {
        throw new Error("You must be signed in to save entries");
      }
      const userId = user.uid;

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();
      
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
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

      showToast("Saved! · " + new Date().toLocaleTimeString(), "success");
    } catch (error) {
      console.error("Error saving URL:", error);
      showToast("Failed to save URL. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Visper Logo"
              width={160}
              height={160}
              className="w-32 h-32 md:w-40 md:h-40 object-contain"
              priority
            />
          </div>
          
          {/* Title and Tagline */}
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-teal-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Visper
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 font-light">
              A thoughtful journal that thinks with you.
            </p>
          </div>

          {/* Features */}
          <div className="watercolor-card rounded-2xl p-8 space-y-4 text-left">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">What makes Visper special</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✨</div>
                <div>
                  <p className="font-medium text-gray-800">AI-Powered Insights</p>
                  <p className="text-sm text-gray-600">Get deeper understanding of your thoughts with intelligent analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🏷️</div>
                <div>
                  <p className="font-medium text-gray-800">Smart Tagging</p>
                  <p className="text-sm text-gray-600">Automatically discover patterns and themes in your journal entries</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <p className="font-medium text-gray-800">Thoughtful Writing</p>
                  <p className="text-sm text-gray-600">Improve and refine your journal entries while preserving your voice</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔍</div>
                <div>
                  <p className="font-medium text-gray-800">Rich Search</p>
                  <p className="text-sm text-gray-600">Find entries by tags, topics, sentiment, and more</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign In */}
          <div>
            <p className="text-xl text-gray-700 mb-6 font-medium">
              Sign in to start your journaling journey
            </p>
            <div className="flex justify-center">
              <LoginButton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Visper Logo"
              width={64}
              height={64}
              className="w-12 h-12 md:w-16 md:h-16 object-contain"
              priority
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-teal-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Visper
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                A thoughtful journal that thinks with you.
              </p>
            </div>
          </div>
          <LoginButton />
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6 border-b border-teal-200">
          <button
            onClick={() => setViewMode("capture")}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === "capture"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "text-gray-600 hover:text-teal-600"
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setViewMode("url")}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === "url"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "text-gray-600 hover:text-teal-600"
            }`}
          >
            URL
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === "history"
                ? "border-b-2 border-teal-500 text-teal-600"
                : "text-gray-600 hover:text-teal-600"
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
          <EntryHistory userId={user.uid} />
        )}
      </div>
    </main>
  );
}
