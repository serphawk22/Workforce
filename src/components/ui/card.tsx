import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl border border-gray-200 bg-white shadow-sm
        transition-shadow duration-150 hover:shadow-md
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
