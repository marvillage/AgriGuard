"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatNumber, toDate } from "@/lib/format";
import type { ImpactSummary, LedgerEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { kilolitres } from "./impact-labels";

type Grouping = "month" | "week";

interface Row {
  key: string;
  label: string;
  used: number;
  saved: number;
  baseline: number;
}

function weekRows(entries: LedgerEntry[], label: (date: Date) => string) {
  const weeks = new Map<string, Row>();
  for (const entry of entries) {
    if (entry.kind !== "WATER") continue;
    const start = toDate(entry.periodStart);
    if (!start) continue;
    const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - ((start.getDay() + 6) % 7));
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const row = weeks.get(key) ?? { key, label: label(monday), used: 0, saved: 0, baseline: 0 };
    row.used += entry.waterUsed ?? 0;
    row.saved += entry.waterSaved ?? 0;
    row.baseline += entry.baselineWater ?? 0;
    weeks.set(key, row);
  }
  return [...weeks.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function WaterUsageChart({
  monthly,
  entries,
  className,
}: {
  monthly: ImpactSummary["monthly"];
  entries: LedgerEntry[];
  className?: string;
}) {
  const { t, language } = useI18n();
  const [grouping, setGrouping] = useState<Grouping>(monthly.length >= 3 ? "month" : "week");

  const rows = useMemo<Row[]>(() => {
    if (grouping === "week") {
      return weekRows(entries, (date) => formatDate(date.toISOString(), language));
    }
    return [...monthly]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => {
        const [year, month] = row.month.split("-").map(Number);
        const label = formatDate(new Date(year, month - 1, 1).toISOString(), language, { month: "short", year: "numeric" });
        return { key: row.month, label, used: row.litresUsed, saved: row.litresSaved, baseline: row.baseline };
      });
  }, [grouping, monthly, entries, language]);

  const data = rows.map((row) => ({ label: row.label, used: kilolitres(row.used), saved: kilolitres(row.saved) }));
  const format = (value: number) => formatNumber(value, value >= 100 ? 0 : 1, language);
  const usedLabel = t("sustainability.chartUsed");
  const savedLabel = t("sustainability.chartSaved");

  return (
    <ChartCard
      className={className}
      title={t("sustainability.chartTitle")}
      description={grouping === "month" ? t("sustainability.chartDescriptionMonth") : t("sustainability.chartDescriptionWeek")}
      legend={[
        { label: usedLabel, color: chartColors.series1, shape: "square" },
        { label: savedLabel, color: chartColors.series4, shape: "square" },
      ]}
      action={
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("sustainability.chartGrouping")}>
          {(["month", "week"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={grouping === option}
              onClick={() => setGrouping(option)}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                grouping === option ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink"
              )}
            >
              {option === "month" ? t("sustainability.byMonth") : t("sustainability.byWeek")}
            </button>
          ))}
        </div>
      }
      table={{
        columns: [t("sustainability.colPeriod"), t("sustainability.colUsedKl"), t("sustainability.colSavedKl"), t("sustainability.colBaselineKl")],
        rows: rows.map((row) => [row.label, format(kilolitres(row.used)), format(kilolitres(row.saved)), format(kilolitres(row.baseline))]),
      }}
    >
      {data.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="label" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={{ stroke: "var(--chart-muted)" }} />
              <YAxis
                stroke={chartColors.axis}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => formatNumber(value, 0, language)}
              />
              <Tooltip
                cursor={{ fill: "var(--chart-cursor)" }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    label={props.label}
                    unit={` ${t("sustainability.unitKl")}`}
                    payload={props.payload?.map((row) => ({ name: row.name, color: row.color, value: format(Number(row.value)) }))}
                  />
                )}
              />
              <Bar dataKey="used" name={usedLabel} stackId="water" fill={chartColors.series1} stroke={chartColors.surface} strokeWidth={2} maxBarSize={24} animationDuration={800} />
              <Bar dataKey="saved" name={savedLabel} stackId="water" fill={chartColors.series4} stroke={chartColors.surface} strokeWidth={2} maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
          {t("sustainability.chartEmpty")}
        </p>
      )}
    </ChartCard>
  );
}
