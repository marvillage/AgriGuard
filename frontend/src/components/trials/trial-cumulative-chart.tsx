"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatNumber, toDate } from "@/lib/format";
import type { Trial, TrialPlot } from "@/lib/types";
import { plotColors } from "./plot-colors";

interface Point {
  time: number;
  litresPerAcre: number;
}

function points(plot: TrialPlot | null): Point[] {
  return (plot?.series ?? [])
    .map((point) => ({ time: toDate(point.time)?.getTime() ?? Number.NaN, litresPerAcre: point.litresPerAcre }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

function valueAt(series: Point[], time: number) {
  let value = 0;
  for (const point of series) {
    if (point.time > time) break;
    value = point.litresPerAcre;
  }
  return Math.round(value / 100) / 10;
}

function evenTicks(start: number, end: number, count: number) {
  if (end <= start) return [start];
  return Array.from({ length: count }, (value, index) => Math.round(start + ((end - start) * index) / (count - 1)));
}

export function TrialCumulativeChart({ trial, asOf, className }: { trial: Trial; asOf: number; className?: string }) {
  const { t, language } = useI18n();
  const treatmentLabel = t("trials.treatment");
  const controlLabel = t("trials.control");

  const { rows, start, end, hasData } = useMemo(() => {
    const treatment = points(trial.results.treatment);
    const control = points(trial.results.control);
    const eventTimes = [...treatment, ...control].map((point) => point.time);
    const startTime = toDate(trial.startDate)?.getTime() ?? Math.min(...eventTimes, asOf);
    const endTime = Math.max(toDate(trial.endDate)?.getTime() ?? asOf, startTime);
    const times = [...new Set([startTime, ...eventTimes, endTime])].sort((a, b) => a - b);
    return {
      rows: times.map((time) => ({ time, treatment: valueAt(treatment, time), control: valueAt(control, time) })),
      start: startTime,
      end: endTime,
      hasData: eventTimes.length > 0,
    };
  }, [trial, asOf]);

  const shortDate = (time: number) => formatDate(new Date(time).toISOString(), language);
  const longDate = (time: number) =>
    formatDate(new Date(time).toISOString(), language, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const format = (value: number) => formatNumber(value, value >= 100 ? 0 : 1, language);

  const tableRows = [...new Map(rows.map((row) => [longDate(row.time), row])).entries()].map(([label, row]) => [
    label,
    format(row.treatment),
    format(row.control),
  ]);

  return (
    <ChartCard
      className={className}
      title={t("trials.cumulativeTitle")}
      description={t("trials.cumulativeDescription")}
      legend={[
        { label: treatmentLabel, color: plotColors.treatment, shape: "line" },
        { label: controlLabel, color: plotColors.control, shape: "line" },
      ]}
      table={{ columns: [t("trials.colDate"), t("trials.colTreatmentKl"), t("trials.colControlKl")], rows: tableRows }}
    >
      {hasData ? (
        <div className="h-64 xl:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[start, end]}
                ticks={evenTicks(start, end, 4)}
                tickFormatter={shortDate}
                stroke={chartColors.axis}
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                stroke={chartColors.axis}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) => formatNumber(value, 0, language)}
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    label={typeof props.label === "number" ? longDate(props.label) : props.label}
                    unit={` ${t("trials.unitKlPerAcre")}`}
                    payload={props.payload?.map((row) => ({ name: row.name, color: row.color, value: format(Number(row.value)) }))}
                  />
                )}
              />
              <Line
                type="stepAfter"
                dataKey="treatment"
                name={treatmentLabel}
                stroke={plotColors.treatment}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.surface, strokeWidth: 2 }}
                animationDuration={800}
              />
              <Line
                type="stepAfter"
                dataKey="control"
                name={controlLabel}
                stroke={plotColors.control}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, stroke: chartColors.surface, strokeWidth: 2 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="flex h-64 items-center justify-center xl:h-80 rounded-xl border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">
          {t("trials.chartNoData")}
        </p>
      )}
    </ChartCard>
  );
}
