import { Loader2 } from "lucide-react";

export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes: Record<string, string> = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return <Loader2 className={`animate-spin text-primary ${sizes[size]} ${className}`} />;
}
