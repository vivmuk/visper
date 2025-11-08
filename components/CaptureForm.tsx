"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface CaptureFormProps {
  onSave: (
    rawText: string,
    improvedText: string | null,
    source: "raw" | "improved" | "both"
  ) => void;
  onImprove?: (text: string) => Promise<string>;
  isLoading?: boolean;
}

export default function CaptureForm({
  onSave,
  onImprove,
  isLoading = false,
}: CaptureFormProps) {
  const [text, setText] = useState("");
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImprove = async () => {
    if (!text.trim() || !onImprove) return;

    setIsImproving(true);
    try {
      const improved = await onImprove(text);
      setImprovedText(improved);
      setShowPreview(true);
    } catch (error) {
      console.error("Error improving text:", error);
      alert("Failed to improve text. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSave = (source: "raw" | "improved" | "both") => {
    if (source === "improved" && !improvedText) {
      alert("No improved text available. Please improve first.");
      return;
    }

    if (source === "both" && !improvedText) {
      alert("No improved text available. Please improve first.");
      return;
    }

    onSave(text, improvedText, source);
    // Reset form
    setText("");
    setImprovedText(null);
    setShowPreview(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to improve
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleImprove();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main input */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          className="w-full min-h-[200px] p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isLoading || isImproving}
        />
        <p className="text-sm text-gray-500 mt-2">
          ⌘⏎ to improve
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        {onImprove && (
          <button
            onClick={handleImprove}
            disabled={!text.trim() || isImproving || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImproving ? "Improving..." : "Improve"}
          </button>
        )}
        <button
          onClick={() => handleSave("raw")}
          disabled={!text.trim() || isLoading}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Raw
        </button>
      </div>

      {/* Preview (side-by-side) */}
      {showPreview && improvedText && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Raw</h4>
              <div className="p-4 bg-gray-50 rounded-lg min-h-[150px] whitespace-pre-wrap">
                {text}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Improved</h4>
              <div className="p-4 bg-blue-50 rounded-lg min-h-[150px] whitespace-pre-wrap">
                {improvedText}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleSave("improved")}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Save Improved
            </button>
            <button
              onClick={() => handleSave("both")}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Save Both
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

