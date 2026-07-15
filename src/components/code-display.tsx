import { Badge } from "@/components/ui/badge";

export function TaskCode({ code }: { code: string | null | undefined }) {
  if (!code) return null;
  return (
    <Badge variant="gray" className="font-mono text-xs px-1.5 py-0">
      #{code}
    </Badge>
  );
}
