"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, FileText, LoaderCircle, ShieldCheck } from "lucide-react";
import { AiExplain } from "@/components/ai/ai-explain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate, formatRupees } from "@/lib/format";
import type { CropOption, FertilizerPlan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusTone, useFertilizerLabels } from "./fertilizer-labels";
import { EmptyState, errorText, opsKeys } from "./shared";

export function FertilizerHistory({ fieldId, crops, canEdit }: { fieldId: number; crops: CropOption[]; canEdit: boolean }) {
  const { t, number, language } = useI18n();
  const toast = useToast();
  const labels = useFertilizerLabels();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: opsKeys.fertilizer(fieldId),
    queryFn: async () => (await api.fertilizerPlans(fieldId)).plans,
  });
  const plans = query.data ?? [];

  const markApplied = useMutation({
    mutationFn: (plan: FertilizerPlan) => api.markFertilizerApplied(fieldId, plan.id),
    onSuccess: async (result, plan) => {
      toast({
        tone: "success",
        title: t("fertilizer.appliedToast"),
        body: t("fertilizer.appliedToastBody", { saving: formatRupees(Math.max(0, plan.blanketCostRupees - plan.costRupees), language) }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: opsKeys.fertilizer(fieldId) }),
        queryClient.invalidateQueries({ queryKey: ["impact"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast({ tone: "critical", title: t("fertilizer.appliedFailed"), body: errorText(error, t("common.error")) }),
  });

  const cropName = (key: string) => crops.find((crop) => crop.key === key)?.name ?? key;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("fertilizer.historyTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("fertilizer.historySubtitle")}</p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("common.loading")}
          </p>
        ) : plans.length === 0 ? (
          <EmptyState icon={FileText} title={t("fertilizer.historyEmpty")}>
            {t("fertilizer.historyEmptyBody")}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {plans.map((plan) => {
              const saving = plan.blanketCostRupees - plan.costRupees;
              const pending = markApplied.isPending && markApplied.variables?.id === plan.id;
              return (
                <li key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-ink">
                        {cropName(plan.cropType)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(plan.createdAt, language, { day: "numeric", month: "short", year: "numeric" })} · {labels.source(plan.source)}
                      </p>
                    </div>
                    {plan.applied ? (
                      <Badge variant="success">
                        <CircleCheck className="h-3 w-3" aria-hidden="true" />
                        {t("fertilizer.appliedOn", { date: formatDate(plan.appliedAt, language, { day: "numeric", month: "short" }) })}
                      </Badge>
                    ) : canEdit ? (
                      <Button type="button" size="sm" variant="dark" disabled={pending} onClick={() => markApplied.mutate(plan)}>
                        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />}
                        {t("fertilizer.markApplied")}
                      </Button>
                    ) : (
                      <Badge variant="secondary">{t("fertilizer.notApplied")}</Badge>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["n", plan.soilN, plan.nStatus],
                        ["p", plan.soilP, plan.pStatus],
                        ["k", plan.soilK, plan.kStatus],
                      ] as const
                    ).map(([nutrient, value, status]) => (
                      <Badge key={nutrient} variant={statusTone(status)}>
                        {t("fertilizer.statusChip", { nutrient: nutrient.toUpperCase(), value: number(value), status: labels.status(status) })}
                      </Badge>
                    ))}
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <Amount label={labels.product("urea")} value={t("fertilizer.kgValue", { value: number(plan.ureaKg, 1) })} />
                    <Amount label={labels.product("dap")} value={t("fertilizer.kgValue", { value: number(plan.dapKg, 1) })} />
                    <Amount label={labels.product("mop")} value={t("fertilizer.kgValue", { value: number(plan.mopKg, 1) })} />
                  </dl>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <Amount
                      label={t("fertilizer.planCost")}
                      value={formatRupees(plan.costRupees, language)}
                      hint={t("fertilizer.vsBlanket", { cost: formatRupees(plan.blanketCostRupees, language) })}
                    />
                    <Amount
                      label={saving >= 0 ? t("fertilizer.saving") : t("fertilizer.extraCost")}
                      value={formatRupees(Math.abs(saving), language)}
                      tone={saving >= 0 ? "good" : "warn"}
                    />
                  </dl>

                  {plan.applied ? (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("fertilizer.ledgerRecorded")}
                    </p>
                  ) : null}
                  <AiExplain
                    className="mt-3"
                    id={[fieldId, "fertilizer", plan.id]}
                    load={async () => (await api.explainField(fieldId, "fertilizer", { planId: plan.id })).explanation}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Amount({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <dt className="truncate text-[11px] text-slate-500">{label}</dt>
      <dd className={cn("truncate font-semibold tabular-nums", tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-800" : "text-ink")}>{value}</dd>
      {hint ? <dd className="truncate text-[11px] text-slate-400">{hint}</dd> : null}
    </div>
  );
}
