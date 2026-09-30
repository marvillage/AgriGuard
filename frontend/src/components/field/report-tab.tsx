"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Droplets, Gauge, HeartPulse, LoaderCircle, RefreshCw, ScanLine, Sparkles, Zap } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip, chartColors } from "@/components/charts/chart-tooltip";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatLitres } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { actionTone } from "./ops/decision-log";
import { NoteForm } from "./ops/note-form";
import { ReportText } from "./ops/report-text";
import { errorText, formatDay, opsKeys, StatTile, useCodeLabel } from "./ops/shared";

interface ReportStats {
  readings: number | null;
  moistureMin: number | null;
  moistureMax: number | null;
  irrigations: number | null;
  litres: number | null;
  kwh: number | null;
  decisions: Record<string, number>;
  healthStart: number | null;
  healthEnd: number | null;
  scans: number | null;
}

const numeric = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

function readStats(raw: Record<string, unknown>): ReportStats {
  const decisions =
    raw.decisions && typeof raw.decisions === "object"
      ? Object.fromEntries(Object.entries(raw.decisions as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number"))
      : {};
  return {
    readings: numeric(raw.readings),
    moistureMin: numeric(raw.moistureMin),
    moistureMax: numeric(raw.moistureMax),
    irrigations: numeric(raw.irrigations),
    litres: numeric(raw.litres),
    kwh: numeric(raw.kwh),
    decisions,
    healthStart: numeric(raw.healthStart),
    healthEnd: numeric(raw.healthEnd),
    scans: numeric(raw.scans),
  };
}

function readDaily(daily: string[]) {
  return daily
    .map((entry) => entry.match(/^(\d{4}-\d{2}-\d{2}):\s*([\d.]+)%?$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ day: match[1], moisture: Number(match[2]) }));
}

export function ReportTab({ overview }: { overview: FieldOverview }) {
  const { t, number, language } = useI18n();
  const { user } = useAuth();
  const codeLabel = useCodeLabel();
  const fieldId = overview.field.id;
  const canAdvise = overview.access === "advisor" || user?.role === "AGRONOMIST" || user?.role === "ADMIN";

  const query = useQuery({
    queryKey: opsKeys.report(fieldId),
    queryFn: async () => (await api.fieldReport(fieldId)).report,
    staleTime: 10 * 60 * 1000,
  });
  const report = query.data;
  const stats = report ? readStats(report.stats) : null;
  const daily = report ? readDaily(report.daily) : [];

  const healthDelta = stats && stats.healthStart !== null && stats.healthEnd !== null ? stats.healthEnd - stats.healthStart : null;
  const decisionEntries = stats ? Object.entries(stats.decisions).sort((a, b) => b[1] - a[1]) : [];
  const dailyName = t("fieldOps.reportDailyMoisture");
  const dailyRows = daily.map((row) => ({ ...row, label: formatDay(row.day, language, { weekday: "short", day: "numeric" }) }));
  const dailyTop = Math.max(10, Math.ceil(Math.max(overview.water.refillPoint, ...daily.map((row) => row.moisture)) / 10) * 10);
  const dailyTicks = Array.from({ length: dailyTop / 10 + 1 }, (value, index) => index * 10);

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-sun-600" aria-hidden="true" />
            {t("fieldOps.reportLoading")}
          </CardContent>
        </Card>
      ) : query.isError ? (
        <Alert variant="destructive">
          <p>{errorText(query.error, t("common.error"))}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => query.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.retry")}
          </Button>
        </Alert>
      ) : report && stats ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatTile icon={Activity} label={t("fieldOps.reportReadings")} value={stats.readings === null ? "–" : number(stats.readings)} />
            <StatTile
              icon={Droplets}
              label={t("fieldOps.reportMoisture")}
              value={
                stats.moistureMin !== null && stats.moistureMax !== null
                  ? t("fieldOps.reportRange", { min: number(stats.moistureMin, 1), max: number(stats.moistureMax, 1) })
                  : "–"
              }
            />
            <StatTile
              icon={Gauge}
              label={t("fieldOps.reportIrrigations")}
              value={stats.irrigations === null ? "–" : number(stats.irrigations)}
              hint={formatLitres(stats.litres ?? 0, language)}
            />
            <StatTile icon={Zap} label={t("fieldOps.reportEnergy")} value={t("fieldOps.kwhValue", { kwh: number(stats.kwh ?? 0, 1) })} />
            <StatTile
              icon={HeartPulse}
              label={t("fieldOps.reportHealth")}
              value={
                stats.healthStart !== null && stats.healthEnd !== null
                  ? t("fieldOps.reportHealthValue", { start: number(stats.healthStart), end: number(stats.healthEnd) })
                  : "–"
              }
              hint={
                healthDelta !== null ? (
                  <span className={cn("font-semibold", healthDelta < 0 ? "text-red-700" : healthDelta > 0 ? "text-emerald-700" : "text-slate-500")}>
                    {healthDelta > 0 ? "+" : healthDelta < 0 ? "−" : "±"}
                    {number(Math.abs(healthDelta))}
                  </span>
                ) : undefined
              }
            />
            <StatTile icon={ScanLine} label={t("fieldOps.reportScans")} value={stats.scans === null ? "–" : number(stats.scans)} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sun-600" aria-hidden="true" />
                    {t("fieldOps.reportTitle")}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{t("fieldOps.reportSubtitle", { field: overview.field.name })}</p>
                </div>
                {report.text ? <Badge variant="secondary">{t("common.poweredBy", { provider: report.provider })}</Badge> : null}
              </CardHeader>
              <CardContent className="space-y-5">
                {report.text ? (
                  <ReportText text={report.text} />
                ) : (
                  <Alert variant="info">
                    <p className="font-semibold">{t("fieldOps.reportNoAi")}</p>
                    <p className="mt-0.5">{t("fieldOps.reportNoAiBody")}</p>
                  </Alert>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-ink">{t("fieldOps.reportDecisions")}</p>
                  {decisionEntries.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {decisionEntries.map(([action, count]) => (
                        <Badge key={action} variant={actionTone(action)}>
                          {t("fieldOps.reportDecisionCount", { action: codeLabel("action", action), count: number(count) })}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t("fieldOps.reportNoDecisions")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {dailyRows.length ? (
              <ChartCard
                title={dailyName}
                description={t("fieldOps.reportDailySubtitle")}
                legend={[
                  { label: dailyName, color: chartColors.series1, shape: "square" },
                  { label: t("fieldOps.refillLine", { value: number(overview.water.refillPoint, 1) }), color: "var(--chart-text)" },
                ]}
                table={{
                  columns: [t("common.date"), dailyName],
                  rows: dailyRows.map((row) => [row.label, `${number(row.moisture, 1)}%`]),
                }}
              >
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRows} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={{ stroke: "var(--chart-muted)" }} interval="preserveStartEnd" />
                      <YAxis stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} domain={[0, dailyTop]} ticks={dailyTicks} />
                      <Tooltip
                        cursor={{ fill: "var(--chart-cursor)" }}
                        content={(props) => <ChartTooltip active={props.active} payload={props.payload} label={props.label} unit="%" />}
                      />
                      <ReferenceLine
                        y={overview.water.refillPoint}
                        stroke="var(--chart-text)"
                        strokeWidth={1}
                        ifOverflow="extendDomain"
                      />
                      <Bar dataKey="moisture" name={dailyName} fill={chartColors.series1} barSize={24} radius={[4, 4, 0, 0]} animationDuration={700} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            ) : null}
          </div>
        </>
      ) : null}

      {canAdvise ? <NoteForm fieldId={fieldId} fieldName={overview.field.name} /> : null}
    </div>
  );
}
