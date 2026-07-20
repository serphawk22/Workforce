"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants: Record<string, string> = {
      primary: "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 shadow-sm",
      secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 shadow-sm",
      ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
      danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
    };

    const sizes: Record<string, string> = {
      sm: icon ? "h-8 w-8 rounded-lg text-xs" : "h-8 px-3 rounded-lg text-xs gap-1.5",
      md: icon ? "h-9 w-9 rounded-xl text-sm" : "h-9 px-4 rounded-xl text-sm gap-2",
      lg: icon ? "h-10 w-10 rounded-xl text-sm" : "h-10 px-5 rounded-xl text-sm gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && children}
      </button>
    );
  }
);

Button.displayName = "Button";
