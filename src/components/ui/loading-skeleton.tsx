interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ className = "h-4 w-full", count = 1 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse rounded bg-gray-200 ${className}`} aria-hidden="true" />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <LoadingSkeleton className="h-5 w-2/3" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-4/5" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <LoadingSkeleton key={i} className={`h-4 ${i === 0 ? "w-1/3" : "w-1/6"}`} />
      ))}
    </div>
  );
}
