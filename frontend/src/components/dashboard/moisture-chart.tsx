"use client";

import { useState } from "react";
import { ChartLine, Table2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { useI18n } from "@/i18n/provider";
import { formatTime } from "@/lib/format";
import type { HourlyPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MoistureChart({ series, refillPoint }: { series: HourlyPoint[]; refillPoint: number }) {
  const { t, language, number } = useI18n();
  const [view, setView] = useState<"chart" | "table">("chart");
  const data = series.map((point) => ({ label: formatTime(point.time, language), moisture: point.soilMoisture }));
  const values = data.map((point) => point.moisture).filter((value): value is number => value !== null);

  if (values.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">{t("dashboard.noSeries")}</p>;
  }

  const low = Math.max(0, Math.floor(Math.min(...values, refillPoint) - 4));
  const high = Math.ceil(Math.max(...values, refillPoint) + 4);
  const seriesName = t("dashboard.soilMoisture");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{t("dashboard.last24h")}</p>
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("dashboard.chartView")}>
          <ToggleButton active={view === "chart"} onClick={() => setView("chart")} label={t("dashboard.chartView")}>
            <ChartLine className="h-3.5 w-3.5" />
          </ToggleButton>
          <ToggleButton active={view === "table"} onClick={() => setView("table")} label={t("dashboard.tableView")}>
            <Table2 className="h-3.5 w-3.5" />
          </ToggleButton>
        </div>
      </div>

      {view === "chart" ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="moisture-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.series1} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={chartColors.series1} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[low, high]}
                stroke={chartColors.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickCount={4}
              />
              <ReferenceLine
                y={refillPoint}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1}
                ifOverflow="extendDomain"
                label={{
                  value: t("dashboard.refillLine", { value: number(refillPoint, 1) }),
                  position: "insideBottomRight",
                  fill: "#475569",
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltip active={props.active} payload={props.payload} label={props.label} unit="%" />
                )}
              />
              <Area
                type="monotone"
                dataKey="moisture"
                name={seriesName}
                stroke={chartColors.series1}
                strokeWidth={2}
                fill="url(#moisture-fill)"
                connectNulls
                activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{t("common.time")}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{seriesName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-1.5 font-medium text-ink">{row.label}</td>
                  <td className="px-3 py-1.5 text-slate-600">{row.moisture === null ? "–" : `${number(row.moisture, 1)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "cursor-pointer rounded-md p-1.5 transition-all",
        active ? "bg-white text-ink shadow-soft" : "text-slate-400 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
