"use client";

import { Droplets, TriangleAlert } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function MoistureBar({
  moisture,
  refillPoint,
  size = "sm",
  className,
}: {
  moisture: number | null;
  refillPoint: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { t, number } = useI18n();
  const scale = Math.max(60, Math.ceil(Math.max(moisture ?? 0, refillPoint) / 10) * 10 + 10);
  const below = moisture !== null && moisture < refillPoint;
  const refill = `${number(refillPoint, 1)}%`;
  const valueText = moisture === null ? t("dashboard.noReading") : t("dashboard.moistureValue", { value: number(moisture, 1), refill });

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("flex items-center gap-1.5 font-medium text-slate-500", size === "lg" ? "text-sm" : "text-xs")}>
          <Droplets className={cn("text-navy-600", size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden="true" />
          {t("dashboard.soilMoisture")}
        </span>
        <span className={cn("font-bold text-ink tabular-nums", size === "lg" ? "font-display text-3xl" : "text-sm")}>
          {moisture === null ? "–" : `${number(moisture, 1)}%`}
        </span>
      </div>
      <div
        role="meter"
        aria-label={t("dashboard.soilMoisture")}
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={moisture ?? 0}
        aria-valuetext={valueText}
        className={cn("relative mt-2 rounded-full bg-slate-100", size === "lg" ? "h-2.5" : "h-2")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", below ? "bg-amber-500" : "bg-emerald-600")}
          style={{ width: `${Math.min(100, ((moisture ?? 0) / scale) * 100)}%` }}
        />
        <span
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${(refillPoint / scale) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <p className={cn("mt-1.5 flex items-center gap-1 text-[11px]", below ? "font-semibold text-amber-700" : "text-slate-500")}>
        {below ? <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
        {below ? t("dashboard.belowRefill", { value: refill }) : t("dashboard.refillAt", { value: refill })}
      </p>
    </div>
  );
}
