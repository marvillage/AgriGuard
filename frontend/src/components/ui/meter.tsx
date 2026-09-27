import { cn } from "@/lib/utils";

const tones = {
  sun: { track: "bg-sun-100", fill: "bg-sun-400" },
  navy: { track: "bg-navy-100", fill: "bg-navy-700" },
  good: { track: "bg-emerald-100", fill: "bg-emerald-600" },
  warning: { track: "bg-amber-100", fill: "bg-amber-500" },
  critical: { track: "bg-red-100", fill: "bg-red-600" },
};

export function Meter({
  value,
  tone = "navy",
  label,
  className,
}: {
  value: number;
  tone?: keyof typeof tones;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-2 w-full overflow-hidden rounded-full", tones[tone].track, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone].fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
