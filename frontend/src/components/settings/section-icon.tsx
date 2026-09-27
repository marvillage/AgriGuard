import { cn } from "@/lib/utils";

export function SectionIcon({ icon: Icon, className }: { icon: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800", className)} aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
  );
}
