"use client";

import Link from "next/link";
import { CircleCheck, CloudSun, Droplets, Satellite, Sun, TriangleAlert } from "lucide-react";
import { AiExplain } from "@/components/ai/ai-explain";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate, formatLitres, formatTime, timeAgo } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatFixed, type BadgeVariant } from "./field-ui";

const actionVariants: Record<string, BadgeVariant> = {
  IRRIGATE: "default",
  SKIP_RAIN: "info",
  SKIP_WET: "success",
  WAIT_SOLAR: "navy",
  BLOCKED_TANK: "danger",
  OUTSIDE_WINDOW: "secondary",
  NO_DATA: "secondary",
  RUNNING: "info",
};

export function DecisionCard({ overview }: { overview: FieldOverview }) {
  const { t, tx, language, number } = useI18n();
  const { decision, ndvi, solar } = overview;
  const { plan } = decision;
  const irrigating = decision.action === "IRRIGATE";
  const lastDecision = overview.decisions[0];
  const methodLabel = tx(`farms.method_${plan.method}`);

  return (
    <Card className={cn("overflow-hidden", decision.critical && "border-red-300 ring-1 ring-red-200")}>
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        <div className={cn("p-5 sm:p-6", decision.critical ? "bg-red-50" : "bg-gradient-to-br from-sun-50 via-white to-white")}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                decision.critical ? "bg-red-600 text-white" : irrigating ? "bg-sun-400 text-ink" : "bg-navy-950 text-sun-400"
              )}
            >
              {decision.critical ? <TriangleAlert className="h-4 w-4" /> : irrigating ? <Droplets className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
            </span>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">{t("field.decisionTitle")}</p>
            <Badge variant={decision.critical ? "danger" : actionVariants[decision.action] ?? "secondary"}>
              {tx(`field.action_${decision.action}`)}
            </Badge>
          </div>
          {decision.critical ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {t("field.criticalWarning")}
            </p>
          ) : null}
          <p className={cn("mt-3 font-display text-lg leading-snug font-semibold sm:text-xl", decision.critical ? "text-red-900" : "text-ink")}>
            {decision.message}
          </p>
          {decision.watering ? (
            <p className="mt-2 text-xs text-slate-600">
              {t("fieldOps.wateringCredit", {
                litres: formatLitres(decision.watering.litres, language),
                time: formatTime(decision.watering.endedAt, language),
                moisture: number(decision.watering.moisture, 1),
              })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {decision.et0 !== null ? <Badge variant="secondary">{t("field.et0Chip", { value: number(decision.et0, 1) })}</Badge> : null}
            {decision.etc !== null ? <Badge variant="secondary">{t("field.etcChip", { value: number(decision.etc, 1) })}</Badge> : null}
            {ndvi ? (
              <Link href="?tab=map" scroll={false} className="rounded-full transition-transform hover:-translate-y-0.5">
                <Badge variant="success">
                  <Satellite className="h-3 w-3" />
                  {t("field.ndviChip", { value: formatFixed(ndvi.meanNdvi, 2, language), date: formatDate(ndvi.sceneDate, language) })}
                </Badge>
              </Link>
            ) : null}
            {solar?.start && solar.end ? (
              <Badge variant={solar.activeNow ? "default" : "navy"}>
                <Sun className="h-3 w-3" />
                {t("field.solarWindowChip", { start: formatTime(solar.start, language), end: formatTime(solar.end, language) })}
              </Badge>
            ) : null}
          </div>
          {overview.latest?.source === "OPEN_METEO" ? (
            <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
              <CloudSun className="mt-px h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden="true" />
              {t("field.modelDecisionNote")}
            </p>
          ) : null}
          {lastDecision ? (
            <p className="mt-2 text-xs text-slate-500">{t("field.decidedAt", { age: timeAgo(lastDecision.decidedAt, language) })}</p>
          ) : null}
          <AiExplain
            className="mt-4"
            id={[overview.field.id, "irrigation", decision.action]}
            load={async () => (await api.explainField(overview.field.id, "irrigation")).explanation}
          />
        </div>

        <div className="border-t border-slate-100 p-5 sm:p-6 lg:border-t-0 lg:border-l">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            {irrigating ? t("field.planIrrigate") : t("field.planDeficit")}
          </p>
          {plan.litres > 0 ? (
            <>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink tabular-nums">{formatLitres(plan.litres, language)}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <PlanItem label={t("field.planDuration")} value={plan.duration} />
                <PlanItem label={t("field.planDepth")} value={t("field.planDepthValue", { gross: number(plan.grossMm, 1), net: number(plan.netMm, 1) })} />
                <PlanItem label={t("field.planMethod")} value={t("field.planMethodValue", { method: methodLabel, efficiency: number(plan.efficiency * 100) })} />
                <PlanItem label={t("field.planFlow")} value={t("field.flowValue", { value: number(plan.flowLpm) })} />
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t("field.planNone")}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
