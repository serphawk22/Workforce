import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  primary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
