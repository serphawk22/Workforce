import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "gray" | "success" | "warning" | "danger" | "info" | "primary";
  size?: "sm" | "md";
  dot?: boolean;
}

const variants: Record<string, string> = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  primary: "bg-primary/10 text-primary border-primary/20",
};

const dotColors: Record<string, string> = {
  default: "bg-gray-400",
  gray: "bg-gray-400",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  primary: "bg-primary",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const sizes: Record<string, string> = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
