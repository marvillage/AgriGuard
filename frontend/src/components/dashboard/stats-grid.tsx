import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  sun: "bg-sun-100 text-sun-700",
  navy: "bg-navy-50 text-navy-700",
  good: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-600",
};

export interface Stat {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
}

export function StatsGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4", className)}>
      {stats.map(({ label, value, hint, icon: Icon, tone = "navy" }) => (
        <Card
          key={label}
          className="group min-w-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-snug font-medium text-slate-500">{label}</p>
              {Icon ? (
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11",
                    tones[tone]
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink tabular-nums sm:text-3xl">
              {value}
            </p>
            {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
