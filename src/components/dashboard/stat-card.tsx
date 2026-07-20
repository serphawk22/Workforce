interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  accentClass?: string;
  bgAccentClass?: string;
}

export function StatCard({ icon, title, value, description, accentClass = "text-blue-600", bgAccentClass = "bg-blue-50" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bgAccentClass} ${accentClass} ring-1 ring-black/5`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
