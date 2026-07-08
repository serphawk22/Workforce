import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
  secondary:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  danger:
    "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
  ghost:
    "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        transition-all duration-150
        disabled:pointer-events-none disabled:opacity-50
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
