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
  default: "bg-gray-100 text-gray-700",
  primary: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-orange-100 text-orange-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-600",
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
