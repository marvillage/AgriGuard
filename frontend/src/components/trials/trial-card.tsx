"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CircleCheck, LoaderCircle, Trash } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Trial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlotStats, TrialComparison } from "./trial-comparison";
import { TrialCumulativeChart } from "./trial-cumulative-chart";
import { TrialHarvest } from "./trial-harvest";

const longDate: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export function TrialCard({ trial, canEdit, asOf }: { trial: Trial; canEdit: boolean; asOf: number }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<"complete" | "delete" | null>(null);
  const [completing, setCompleting] = useState(false);
  const { treatment, control, savingPct, energySavingPct, yieldChangePct, days } = trial.results;
  const active = trial.status === "ACTIVE";

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trials", trial.farmId] }),
      queryClient.invalidateQueries({ queryKey: ["impact"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  const fail = (error: unknown) =>
    toast({ title: t("trials.actionFailed"), body: error instanceof Error ? error.message : undefined, tone: "critical" });

  const complete = async () => {
    setCompleting(true);
    try {
      await api.updateTrial(trial.id, { status: "COMPLETED" });
      toast({ title: t("trials.completed"), tone: "success" });
      setConfirming(null);
      await refresh();
    } catch (error) {
      fail(error);
    } finally {
      setCompleting(false);
    }
  };

  const remove = async () => {
    try {
      await api.deleteTrial(trial.id);
      toast({ title: t("trials.deleted"), tone: "success" });
      setConfirming(null);
      await refresh();
    } catch (error) {
      fail(error);
    }
  };

  const start = formatDate(trial.startDate, language, longDate);
  const end = formatDate(trial.endDate, language, longDate);
  const duration = days === 1 ? t("trials.durationOneDay") : t("trials.durationDays", { count: formatNumber(days, 0, language) });
  const dates = active
    ? t("trials.startedOn", { date: start, days: formatNumber(days, 0, language) })
    : start === end
      ? t("trials.dateSingle", { date: start, duration })
      : t("trials.dateRange", { start, end, duration });

  const metrics = [
    {
      label: t("trials.waterSaving"),
      value: savingPct,
      hint: savingPct === null ? t("trials.notYet") : savingPct >= 0 ? t("trials.lessWater") : t("trials.moreWater"),
    },
    {
      label: t("trials.energySaving"),
      value: energySavingPct,
      hint: energySavingPct === null ? t("trials.notYet") : energySavingPct >= 0 ? t("trials.lessEnergy") : t("trials.moreEnergy"),
    },
    {
      label: t("trials.yieldChange"),
      value: yieldChangePct,
      signed: true,
      hint:
        yieldChangePct === null
          ? t("trials.yieldPending")
          : yieldChangePct > 0
            ? t("trials.moreYield")
            : yieldChangePct < 0
              ? t("trials.lessYield")
              : t("trials.sameYield"),
    },
  ];

  const percent = (value: number | null, signed?: boolean) => {
    if (value === null) return "–";
    const number = formatNumber(signed ? value : Math.abs(value), 1, language);
    return t("trials.percent", { value: signed && value > 0 ? `+${number}` : number });
  };

  return (
    <article>
      <Card className="overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{trial.name}</h2>
              <Badge variant={active ? "info" : "secondary"}>
                {active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-600" aria-hidden="true" /> : <CircleCheck className="h-3 w-3" aria-hidden="true" />}
                {active ? t("trials.statusActive") : t("trials.statusCompleted")}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              {dates}
            </p>
            {trial.notes ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{trial.notes}</p> : null}
          </div>
          {canEdit ? (
            <div className="flex shrink-0 gap-2">
              {active ? (
                <Button variant="secondary" size="sm" onClick={() => setConfirming("complete")}>
                  <CircleCheck className="h-4 w-4" />
                  {t("trials.markComplete")}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming("delete")}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash className="h-4 w-4" />
                {t("trials.deleteTrial")}
              </Button>
            </div>
          ) : null}
        </header>

        {treatment && control ? (
          <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
            <div className="min-w-0 space-y-6">
              <dl className="grid grid-cols-3 gap-2 sm:gap-3">
                {metrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    className={cn("rounded-xl p-3 sm:p-4", index === 0 ? "bg-navy-950 text-white" : "bg-slate-50")}
                  >
                    <dt className={cn("text-xs font-medium", index === 0 ? "text-white/70" : "text-slate-500")}>{metric.label}</dt>
                    <dd className="mt-1 font-display text-xl font-bold tracking-tight sm:text-3xl">{percent(metric.value, metric.signed)}</dd>
                    <dd className={cn("mt-0.5 text-xs leading-snug", index === 0 ? "text-white/60" : "text-slate-400")}>{metric.hint}</dd>
                  </div>
                ))}
              </dl>
              <TrialComparison treatment={treatment} control={control} />
              <PlotStats treatment={treatment} control={control} />
            </div>
            <TrialCumulativeChart trial={trial} asOf={asOf} className="min-w-0 shadow-none" />
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <Alert variant="destructive">{t("trials.missingPlot")}</Alert>
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-ink">{t("trials.yieldTitle")}</h3>
          <p className="mt-0.5 mb-4 text-sm text-slate-500">{t("trials.yieldDescription")}</p>
          <TrialHarvest key={`${trial.treatmentYieldKg}-${trial.controlYieldKg}`} trial={trial} canEdit={canEdit} />
        </div>
      </Card>

      {confirming === "complete" ? (
        <Modal title={t("trials.completeTitle")} description={t("trials.completeBody")} onClose={() => setConfirming(null)}>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={completing}>
              {t("common.cancel")}
            </Button>
            <Button variant="dark" onClick={complete} disabled={completing}>
              {completing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
              {t("trials.markComplete")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {confirming === "delete" ? (
        <ConfirmDialog
          title={t("trials.deleteTitle")}
          description={t("trials.deleteBody", { name: trial.name })}
          confirmLabel={t("trials.deleteTrial")}
          onConfirm={remove}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </article>
  );
}
