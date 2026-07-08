interface AvatarProps {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, url, size = "md", className = "" }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeStyles[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeStyles[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-medium ${className}`}
      title={name}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
