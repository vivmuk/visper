"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface CaptureFormProps {
  onSave: (
    rawText: string,
    improvedText: string | null,
    source: "raw" | "improved" | "both",
    imageUrl?: string,
    imageMetadata?: {
      filename: string;
      size: number;
      contentType: string;
    }
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Image size must be less than 10MB");
        return;
      }
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async (source: "raw" | "improved" | "both") => {
    if (source === "improved" && !improvedText) {
      alert("No improved text available. Please improve first.");
      return;
    }

    if (source === "both" && !improvedText) {
      alert("No improved text available. Please improve first.");
      return;
    }

    let imageUrl: string | undefined;
    let imageMetadata: { filename: string; size: number; contentType: string } | undefined;

    // Upload image if selected
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("userId", "temp-user-id"); // TODO: Get from auth

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to upload image");
        }

        const data = await response.json();
        imageUrl = data.url;
        imageMetadata = data.metadata;
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image. Please try again.");
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    onSave(text, improvedText, source, imageUrl, imageMetadata);
    // Reset form
    setText("");
    setImprovedText(null);
    setShowPreview(false);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
          disabled={isLoading || isImproving || isUploadingImage}
        />
        <p className="text-sm text-gray-500 mt-2">
          ⌘⏎ to improve
        </p>
      </div>

      {/* Image upload */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          id="image-upload"
          disabled={isLoading || isUploadingImage}
        />
        <label
          htmlFor="image-upload"
          className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📷 {selectedImage ? "Change Image" : "Add Image"}
        </label>
        {selectedImage && (
          <button
            onClick={handleRemoveImage}
            className="ml-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-4">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-full max-h-64 rounded-lg border border-gray-300"
          />
        </div>
      )}

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
          disabled={(!text.trim() && !selectedImage) || isLoading || isUploadingImage}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploadingImage ? "Uploading..." : "Save Raw"}
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
              disabled={isLoading || isUploadingImage}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUploadingImage ? "Uploading..." : "Save Improved"}
            </button>
            <button
              onClick={() => handleSave("both")}
              disabled={isLoading || isUploadingImage}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {isUploadingImage ? "Uploading..." : "Save Both"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

