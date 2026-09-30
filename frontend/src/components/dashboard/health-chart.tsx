"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

type SeriesKey = "health" | "waterStress" | "diseaseRisk";

export function HealthChart({ trend }: { trend: Dashboard["healthTrend"] }) {
  const { t, language } = useI18n();

  const series: Array<{ key: SeriesKey; label: string; color: string }> = [
    { key: "health", label: t("dashboard.seriesHealth"), color: chartColors.series1 },
    { key: "waterStress", label: t("dashboard.seriesWater"), color: chartColors.series2 },
    { key: "diseaseRisk", label: t("dashboard.seriesDisease"), color: chartColors.series3 },
  ];

  if (trend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.healthTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t("dashboard.healthEmpty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = trend.map((row) => ({ ...row, label: formatDate(`${row.day}T00:00:00`, language) }));
  const lastIndex = data.length - 1;

  const endLabel = (props: { x?: number | string; y?: number | string; index?: number; value?: unknown }) => {
    if (props.index !== lastIndex || props.value === null || props.value === undefined) return null;
    return (
      <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fontSize={12} fontWeight={600} fill="var(--chart-strong)">
        {String(props.value)}
      </text>
    );
  };

  return (
    <ChartCard
      title={t("dashboard.healthTitle")}
      description={t("dashboard.healthDescription")}
      legend={series.map((item) => ({ label: item.label, color: item.color }))}
      table={{
        columns: [t("common.date"), ...series.map((item) => item.label)],
        rows: data.map((row) => [row.label, ...series.map((item) => row[item.key] ?? "–")]),
      }}
    >
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 32, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={chartColors.axis}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-muted)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke={chartColors.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-muted)", strokeWidth: 1 }}
              content={(props) => <ChartTooltip active={props.active} payload={props.payload} label={props.label} />}
            />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls
                activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface }}
                label={endLabel}
                animationDuration={900}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
