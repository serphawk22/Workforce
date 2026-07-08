import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: number | string;
  description?: string;
  accentClass: string;
  bgAccentClass: string;
}

export function StatCard({
  icon,
  title,
  value,
  description,
  accentClass,
  bgAccentClass,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${bgAccentClass}`}>
          <span className={`h-5 w-5 ${accentClass}`}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${accentClass}`}>
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
