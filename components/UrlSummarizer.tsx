"use client";

import { useState } from "react";

interface UrlSummarizerProps {
  onSave: (url: string, summary: any) => void;
  isLoading?: boolean;
}

export default function UrlSummarizer({
  onSave,
  isLoading = false,
}: UrlSummarizerProps) {
  const [url, setUrl] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    if (!url.trim()) return;

    setIsSummarizing(true);
    setError(null);

    try {
      const response = await fetch("/api/urls/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to summarize URL");
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize URL");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = () => {
    if (!summary) return;
    onSave(url, summary);
    // Reset
    setUrl("");
    setSummary(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL here..."
          className="w-full p-4 text-lg text-gray-900 watercolor-card border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 placeholder:text-gray-400"
          disabled={isLoading || isSummarizing}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSummarize();
            }
          }}
        />
      </div>

      <button
        onClick={handleSummarize}
        disabled={!url.trim() || isSummarizing || isLoading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
      >
        {isSummarizing ? "Summarizing..." : "Summarize"}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-6 border-t pt-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">{summary.meta.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-gray-100 rounded">{summary.meta.domain}</span>
              {summary.meta.author && <span>by {summary.meta.author}</span>}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">TL;DR</h4>
            <p className="text-gray-700">{summary.summary}</p>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">Key Points</h4>
            <ul className="list-disc list-inside space-y-1">
              {summary.keyPoints.map((point: string, idx: number) => (
                <li key={idx} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>

          {summary.quotes && summary.quotes.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Quotes</h4>
              <div className="space-y-2">
                {summary.quotes.map((quote: any, idx: number) => (
                  <blockquote
                    key={idx}
                    className="p-3 bg-gray-50 border-l-4 border-blue-500 italic text-gray-700"
                  >
                    &ldquo;{quote.text}&rdquo;
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

