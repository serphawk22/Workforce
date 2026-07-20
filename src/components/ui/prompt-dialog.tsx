"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  initialValue?: string;
}

export function PromptDialog({
  open,
  onClose,
  onConfirm,
  title,
  placeholder = "",
  confirmLabel = "Confirm",
  initialValue = "",
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onConfirm(value.trim()); setValue(""); } }}
          />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => { onClose(); setValue(""); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { if (value.trim()) { onConfirm(value.trim()); setValue(""); } }}
              disabled={!value.trim()}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
