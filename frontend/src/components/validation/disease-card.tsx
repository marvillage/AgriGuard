"use client";

import { Microscope } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { cropLabel } from "@/components/scan/scan-helpers";
import { useI18n } from "@/i18n/provider";
import type { ValidationRatio, ValidationSummary } from "@/lib/types";

type Disease = NonNullable<ValidationSummary["diseaseModel"]>;

export function DiseaseCard({ result, cropNames }: { result: Disease; cropNames: Map<string, string> }) {
  const { t, tx, number } = useI18n();
  const { metrics, dataset, model } = result;
  const pct = (ratio: ValidationRatio) => (ratio.pct === null ? "–" : t("validation.percent", { value: number(ratio.pct, 1) }));
  const of = (ratio: ValidationRatio) => t("validation.correctOf", { correct: number(ratio.correct), n: number(ratio.n) });
  const rows = [
    { label: t("validation.rowNoCrop"), top1: metrics.noCrop.top1, top3: metrics.noCrop.top3 },
    { label: t("validation.rowCrop"), top1: metrics.cropFiltered.top1, top3: metrics.cropFiltered.top3, highlight: true },
    ...(metrics.multiLabelCrops ? [{ label: t("validation.rowMulti"), top1: metrics.multiLabelCrops.top1, top3: metrics.multiLabelCrops.top3 }] : []),
  ];
  const crops = [...result.perCrop].sort((a, b) => (b.cropFilteredTop1.pct ?? 0) - (a.cropFilteredTop1.pct ?? 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-navy-700" aria-hidden="true" />
            {t("validation.modelTitle")}
          </CardTitle>
          <Badge variant="success">{t("validation.measured")}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          {t("validation.modelSubtitle", { count: number(dataset.imagesEvaluated), classes: number(dataset.classesEvaluated) })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("validation.colSetting")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("validation.colTop1")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("validation.colTop3")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.label} className={row.highlight ? "bg-sun-50/60" : undefined}>
                  <th scope="row" className={`px-4 py-3 text-left font-medium ${row.highlight ? "text-ink" : "text-slate-600"}`}>{row.label}</th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-ink">{pct(row.top1)}</span>
                    <span className="block text-[11px] text-slate-400">{of(row.top1)}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-ink">{pct(row.top3)}</span>
                    <span className="block text-[11px] text-slate-400">{of(row.top3)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-navy-50/60 p-4">
          <p className="text-sm font-semibold text-navy-900">{t("validation.confidenceTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {t("validation.confidenceBody", {
              confidentPct: number(metrics.lowConfidence.confident.pct ?? 0, 1),
              confident: number(metrics.lowConfidence.confident.correct),
              confidentN: number(metrics.lowConfidence.confident.n),
              lowPct: number(metrics.lowConfidence.flagged.pct ?? 0, 1),
              low: number(metrics.lowConfidence.flagged.correct),
              lowN: number(metrics.lowConfidence.flagged.n),
            })}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">{t("validation.perCropTitle")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("validation.perCropHint")}</p>
          <ul className="mt-3 space-y-2.5">
            {crops.map((crop) => {
              const name = cropLabel(tx, { key: crop.cropKey, name: cropNames.get(crop.cropKey) ?? crop.crop });
              return (
                <li key={crop.cropKey}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-700">
                      {name} <span className="text-xs text-slate-400">· {t("validation.photosCount", { n: number(crop.n) })}</span>
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{pct(crop.cropFilteredTop1)}</span>
                  </div>
                  <Meter value={crop.cropFilteredTop1.pct ?? 0} tone="navy" label={name} className="mt-1 h-1.5" />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-2 text-xs leading-relaxed text-slate-500">
          <p>{t("validation.baseline")}</p>
          {dataset.labelConflicts > 0 ? <p>{t("validation.labelNoise", { count: number(dataset.labelConflicts) })}</p> : null}
          <p>{t("validation.modelSource", { name: "PlantDoc", license: dataset.license, model: model.id, dtype: model.dtype })}</p>
        </div>
        {result.gemini.imagesEvaluated === 0 ? <Alert variant="info">{t("validation.geminiPending")}</Alert> : null}
      </CardContent>
    </Card>
  );
}
