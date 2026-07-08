import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900
            placeholder:text-gray-400 transition-all duration-150
            focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900
            ${error
              ? "border-red-500 focus:ring-red-500/10 focus:border-red-500"
              : "border-gray-300 hover:border-gray-400"
            }
            ${className}
          `}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error && textareaId ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && textareaId && (
          <p id={`${textareaId}-error`} className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
