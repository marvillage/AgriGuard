"use client";

import { useI18n } from "@/i18n/provider";
import type { FieldOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

const stageNames = ["initial", "development", "mid", "late"] as const;

export function CropTimeline({ stage }: { stage: FieldOverview["stage"] }) {
  const { t, tx, number } = useI18n();
  if (!stage.stages) return null;
  const total = stage.stages.reduce((sum, days) => sum + days, 0);
  const day = Math.max(0, Math.min(total, stage.day ?? 0));
  const marker = total > 0 ? (day / total) * 100 : 0;
  const ranges = stage.stages.map((days, index, all) => {
    const from = all.slice(0, index).reduce((sum, value) => sum + value, 0) + 1;
    return { days, from, to: from + days - 1 };
  });

  return (
    <div>
      <div className="relative pt-9">
        <div
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-700"
          style={{ left: `${Math.min(92, Math.max(8, marker))}%` }}
        >
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white tabular-nums">
            {t("field.dayMarker", { day: number(day) })}
          </span>
        </div>
        <div className="flex h-4 gap-0.5 overflow-hidden rounded-full">
          {ranges.map(({ days }, index) => (
            <div
              key={stageNames[index]}
              className={cn(
                "h-full transition-colors",
                index < stage.index ? "bg-navy-700" : index === stage.index ? "bg-sun-400" : "bg-slate-200"
              )}
              style={{ width: `${(days / total) * 100}%` }}
            />
          ))}
        </div>
        <span
          className="absolute top-7 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${marker}%` }}
          aria-hidden="true"
        />
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ranges.map(({ days, from, to }, index) => (
          <li
            key={stageNames[index]}
            className={cn("rounded-xl border p-3", index === stage.index ? "border-sun-300 bg-sun-50" : "border-slate-200/80 bg-white")}
          >
            <p className={cn("text-sm font-semibold", index === stage.index ? "text-ink" : "text-slate-600")}>
              {tx(`field.stage_${stageNames[index]}`)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {t("field.stageRange", { from: number(from), to: number(to), days: number(days) })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
