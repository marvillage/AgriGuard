"use client";

import { Cylinder, Droplets, Gauge, Sprout, TriangleAlert, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatLitres, timeAgo } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { actionTone } from "./decision-log";
import { useCodeLabel, useDuration } from "./shared";

export function DecisionCard({ overview }: { overview: FieldOverview }) {
  const { t, number, language } = useI18n();
  const codeLabel = useCodeLabel();
  const duration = useDuration();
  const { decision, latest, water } = overview;
  const device = overview.devices[0];
  const plan = decision.plan;
  const tankLevel = latest?.tankLevel ?? null;
  const dryRun = device?.dryRunLevelPct ?? null;
  const moisture = latest?.soilMoisture ?? null;
  const flow = latest?.flowRateLpm ?? null;
  const power = latest?.powerW ?? null;

  const showTank = tankLevel !== null || Boolean(device?.hasTankSensor);
  const showFlow = flow !== null || Boolean(device?.hasFlowMeter);
  const showPower = power !== null || Boolean(device?.hasEnergyMeter);
  const tankTone = tankLevel === null || dryRun === null ? "navy" : tankLevel <= dryRun ? "critical" : tankLevel <= dryRun + 10 ? "warning" : "good";

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{t("fieldOps.decisionTitle")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {overview.latestAgeMinutes !== null && latest
              ? t("fieldOps.decisionBasedOn", { ago: timeAgo(latest.observedAt, language) })
              : t("fieldOps.decisionNoReading")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {decision.critical ? (
            <Badge variant="danger">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" />
              {t("common.critical")}
            </Badge>
          ) : null}
          <Badge variant={actionTone(decision.action)}>{codeLabel("action", decision.action)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="rounded-2xl bg-sun-50 px-4 py-3 text-sm font-medium text-sun-900 ring-1 ring-sun-300/60">{decision.message}</p>
        {decision.watering ? (
          <p className="rounded-xl bg-navy-50/70 px-3 py-2 text-xs text-navy-900 ring-1 ring-navy-100">
            {t("fieldOps.wateringCredit", {
              litres: formatLitres(decision.watering.litres, language),
              time: formatDate(decision.watering.endedAt, language, { hour: "numeric", minute: "2-digit" }),
              moisture: number(decision.watering.moisture, 1),
            })}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-xs font-medium text-slate-500">{t("fieldOps.planLitres")}</p>
            <p className="mt-1 truncate font-display text-xl font-bold text-ink tabular-nums">{formatLitres(plan.litres, language)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("fieldOps.planDepth", { gross: number(plan.grossMm, 1), net: number(plan.netMm, 1) })}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-xs font-medium text-slate-500">{t("fieldOps.planDuration")}</p>
            <p className="mt-1 truncate font-display text-xl font-bold text-ink tabular-nums">
              {plan.runMinutes !== null ? duration(plan.runMinutes) : plan.duration}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("fieldOps.planFlow", { flow: number(plan.flowLpm), efficiency: number(plan.efficiency * 100) })}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Reading icon={Droplets} label={t("fieldOps.soilMoisture")} value={moisture === null ? "–" : `${number(moisture, 1)}%`}>
            {moisture !== null ? (
              <>
                <Meter value={moisture} tone={moisture < water.refillPoint ? "warning" : "good"} label={t("fieldOps.soilMoisture")} className="mt-2" />
                <p className="mt-1 text-xs text-slate-500">
                  {t("fieldOps.moistureTargets", { refill: number(water.refillPoint, 1), capacity: number(water.fieldCapacity, 1) })}
                </p>
              </>
            ) : null}
          </Reading>

          {showTank ? (
            <Reading icon={Cylinder} label={t("fieldOps.tankLevel")} value={tankLevel === null ? "–" : `${number(tankLevel)}%`}>
              {tankLevel !== null ? (
                <>
                  <div className="relative mt-2">
                    <Meter value={tankLevel} tone={tankTone} label={t("fieldOps.tankLevel")} />
                    {dryRun !== null ? (
                      <span
                        className="absolute -top-1 h-4 w-0.5 rounded-full bg-red-600"
                        style={{ left: `calc(${Math.min(100, Math.max(0, dryRun))}% - 1px)` }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <p className={cn("mt-1 text-xs", tankTone === "critical" ? "font-semibold text-red-700" : "text-slate-500")}>
                    {tankTone === "critical"
                      ? t("fieldOps.tankLocked", { limit: number(dryRun ?? 0) })
                      : t("fieldOps.tankDryRun", { limit: number(dryRun ?? 0) })}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-500">{t("fieldOps.tankWaiting")}</p>
              )}
            </Reading>
          ) : null}

          {showFlow || showPower ? (
            <div className="grid grid-cols-2 gap-3">
              {showFlow ? (
                <MiniReading icon={Gauge} label={t("fieldOps.flowNow")} value={flow === null ? "–" : t("fieldOps.flowValue", { flow: number(flow, 1) })} />
              ) : null}
              {showPower ? (
                <MiniReading icon={Zap} label={t("fieldOps.powerNow")} value={power === null ? "–" : t("fieldOps.powerValue", { kw: number(power / 1000, 2) })} />
              ) : null}
            </div>
          ) : null}

          {decision.et0 !== null ? (
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Sprout className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("fieldOps.cropWaterUse", { et0: number(decision.et0, 1), etc: number(decision.etc ?? 0, 1) })}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Reading({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Icon className="h-4 w-4 text-navy-600" aria-hidden="true" />
          {label}
        </p>
        <p className="font-display text-lg font-bold text-ink tabular-nums">{value}</p>
      </div>
      {children}
    </div>
  );
}

function MiniReading({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}
