"use client";

import { FlaskConical, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { plotColors } from "./plot-colors";

export function ControlPlotExplainer({ className }: { className?: string }) {
  const { t } = useI18n();

  const plots = [
    { color: plotColors.treatment, title: t("trials.explainerTreatment"), body: t("trials.explainerTreatmentBody") },
    { color: plotColors.control, title: t("trials.explainerControl"), body: t("trials.explainerControlBody") },
  ];

  return (
    <Card className={className}>
      <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">{t("trials.explainerTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t("trials.explainerBody")}</p>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-navy-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("trials.explainerExcluded")}
            </p>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {plots.map((plot) => (
            <li key={plot.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: plot.color }} aria-hidden="true" />
                {plot.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{plot.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
