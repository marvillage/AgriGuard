"use client";

import { CalendarClock, CircleCheck, IndianRupee, Info, LoaderCircle, Save, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatRupees } from "@/lib/format";
import type { FertilizerPlanPreview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { bagKg, statusTone, useFertilizerLabels } from "./fertilizer-labels";
import { formatDay } from "./shared";

const nutrients = ["n", "p", "k"] as const;
const products = ["urea", "dap", "mop"] as const;

export function FertilizerResult({
  plan,
  canSave,
  saving,
  saved,
  onSave,
}: {
  plan: FertilizerPlanPreview;
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const { t, number, language } = useI18n();
  const labels = useFertilizerLabels();
  const perAcre = (kg: number) => (plan.areaAcres > 0 ? kg / plan.areaAcres : 0);
  const difference = plan.savingRupees;
  const cheaper = difference >= 0;

  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{t("fertilizer.resultTitle", { crop: plan.crop.name })}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t("fertilizer.resultSubtitle", { area: number(plan.areaAcres, 2) })}
          </p>
        </div>
        <Badge variant="navy">{labels.source(plan.source)}</Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-ink">{t("fertilizer.soilRating")}</h4>
          <div className="grid grid-cols-3 gap-2">
            {nutrients.map((nutrient) => (
              <div key={nutrient} className="min-w-0 rounded-2xl border border-slate-200/80 p-3 text-center">
                <p className="truncate text-xs text-slate-500">{labels.nutrient(nutrient)}</p>
                <p className="mt-1 font-display text-lg font-bold text-ink tabular-nums">{number(plan.soil[nutrient], 1)}</p>
                <p className="text-[11px] text-slate-400">{t("fertilizer.kgHa")}</p>
                <Badge variant={statusTone(plan.status[nutrient])} className="mt-2">
                  {labels.status(plan.status[nutrient])}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-ink">{t("fertilizer.required")}</h4>
          <ul className="grid grid-cols-3 gap-2">
            {nutrients.map((nutrient) => (
              <li key={nutrient} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500">{t(nutrient === "n" ? "fertilizer.nutrientN" : nutrient === "p" ? "fertilizer.nutrientP" : "fertilizer.nutrientK")}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">{t("fertilizer.kgHaValue", { value: number(plan.required[nutrient]) })}</p>
                <p className="text-[11px] text-slate-400">{t("fertilizer.standardDose", { value: number(plan.crop.dose[nutrient]) })}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-ink">{t("fertilizer.products")}</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[18rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{t("fertilizer.product")}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t("fertilizer.thisField")}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t("fertilizer.perAcre")}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t("fertilizer.blanket")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {products.map((product) => {
                  const kg = plan.plan[product];
                  return (
                    <tr key={product}>
                      <th scope="row" className="px-3 py-2.5 font-semibold text-ink">{labels.product(product)}</th>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-semibold text-ink">{t("fertilizer.kgValue", { value: number(kg, 1) })}</span>
                        <span className="block text-[11px] text-slate-400">{t("fertilizer.bags", { bags: number(kg / bagKg[product], 1), size: bagKg[product] })}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{t("fertilizer.kgValue", { value: number(perAcre(kg), 1) })}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">
                        {t("fertilizer.kgValue", { value: number(plan.blanket[product], 1) })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-xs text-slate-500">{t("fertilizer.planCost")}</p>
            <p className="mt-1 font-display text-xl font-bold text-ink tabular-nums">{formatRupees(plan.cost, language)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 p-3.5">
            <p className="text-xs text-slate-500">{t("fertilizer.blanketCost")}</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-500 tabular-nums">{formatRupees(plan.blanketCost, language)}</p>
          </div>
          <div className={cn("rounded-2xl p-3.5 ring-1", cheaper ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200")}>
            <p className={cn("flex items-center gap-1 text-xs", cheaper ? "text-emerald-800" : "text-amber-800")}>
              <IndianRupee className="h-3 w-3" aria-hidden="true" />
              {cheaper ? t("fertilizer.saving") : t("fertilizer.extraCost")}
            </p>
            <p className={cn("mt-1 font-display text-xl font-bold tabular-nums", cheaper ? "text-emerald-700" : "text-amber-800")}>
              {formatRupees(Math.abs(difference), language)}
            </p>
            <p className={cn("text-[11px]", cheaper ? "text-emerald-800/80" : "text-amber-800/80")}>
              {plan.ureaSavedKg >= 0
                ? t("fertilizer.ureaSaved", { kg: number(plan.ureaSavedKg, 1) })
                : t("fertilizer.ureaExtra", { kg: number(Math.abs(plan.ureaSavedKg), 1) })}
            </p>
          </div>
        </section>
        {!cheaper ? <p className="-mt-3 text-xs text-amber-800">{t("fertilizer.extraCostWhy")}</p> : null}

        <section className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarClock className="h-4 w-4 text-navy-600" aria-hidden="true" />
            {t("fertilizer.schedule")}
          </h4>
          <ol className="space-y-2">
            {plan.schedule.map((split) => (
              <li key={split.stage} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{labels.stage(split.stage)}</p>
                  <p className="text-xs text-slate-500">
                    {split.date
                      ? t("fertilizer.splitDate", { date: formatDay(split.date, language, { day: "numeric", month: "short", year: "numeric" }), day: number(split.day) })
                      : t("fertilizer.splitDay", { day: number(split.day) })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {products
                    .filter((product) => split[product] > 0)
                    .map((product) => (
                      <Badge key={product} variant="secondary">
                        {t("fertilizer.productKg", { product: labels.product(product), kg: number(split[product], 1) })}
                      </Badge>
                    ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {plan.notes.length ? (
          <section className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Sprout className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              {t("fertilizer.notes")}
            </h4>
            <ul className="space-y-1.5">
              {plan.notes.map((note) => (
                <li key={note} className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" aria-hidden="true" />
                  {labels.note(note)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("fertilizer.priceNote")}
        </p>

        {canSave ? (
          <Button type="button" onClick={onSave} disabled={saving || saved}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : saved ? <CircleCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? t("fertilizer.saved") : t("fertilizer.save")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
