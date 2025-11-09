"use client";

import { useState } from "react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryTitle?: string;
}

export default function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  entryTitle,
}: DeleteConfirmationDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onConfirm();
      setStep(1); // Reset for next time
    }
  };

  const handleClose = () => {
    setStep(1); // Reset step when closing
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {step === 1 ? (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Delete Entry?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this entry? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Final Confirmation
            </h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this entry. Are you absolutely sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Yes, Delete Forever
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

