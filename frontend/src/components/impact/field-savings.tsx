"use client";

import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatLitres, formatNumber } from "@/lib/format";
import type { ImpactSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { baselineLabel, fieldSource } from "./impact-labels";

type ImpactField = ImpactSummary["fields"][number];

const sourceVariants = { measured: "success", estimated: "info", none: "secondary", control: "warning" } as const;

export function FieldSavings({ fields, className }: { fields: ImpactField[]; className?: string }) {
  const { t, tx, language } = useI18n();
  const hasControl = fields.some((field) => field.control);

  const sourceLabel = (field: ImpactField) => {
    const source = fieldSource(field);
    if (source === "control") return t("sustainability.controlBadge");
    if (source === "measured") return t("sustainability.methodMeasured");
    if (source === "estimated") return t("sustainability.methodEstimated");
    return t("sustainability.methodNone");
  };

  const sourceBadge = (field: ImpactField) => (
    <Badge variant={sourceVariants[fieldSource(field)]} className="whitespace-nowrap">
      {field.control ? <FlaskConical className="h-3 w-3" aria-hidden="true" /> : null}
      {sourceLabel(field)}
    </Badge>
  );

  const meta = (field: ImpactField) =>
    t("sustainability.fieldMeta", { farm: field.farmName, area: formatNumber(field.areaAcres, 2, language) });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("sustainability.fieldsTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("sustainability.fieldsDescription")}</p>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <p className="text-sm text-slate-500">{t("sustainability.noFields")}</p>
        ) : (
          <>
            <ul className="space-y-3 sm:hidden">
              {fields.map((field) => (
                <li
                  key={field.fieldId}
                  className={cn("rounded-xl border p-4", field.control ? "border-amber-200 bg-amber-50/50" : "border-slate-200")}
                >
                  <p className="font-semibold text-ink">{field.name}</p>
                  <p className="text-xs text-slate-500">{meta(field)}</p>
                  <div className="mt-2">{sourceBadge(field)}</div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">{t("sustainability.colUsed")}</dt>
                      <dd className="font-semibold text-ink tabular-nums">{formatLitres(field.litresUsed, language)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t("sustainability.colSaved")}</dt>
                      <dd className="font-semibold text-ink tabular-nums">{field.control ? "–" : formatLitres(field.litresSaved, language)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">{t("sustainability.colBaseline")}</dt>
                      <dd className="text-slate-700">{baselineLabel(tx, field.baseline, language)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t("sustainability.colField")}</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("sustainability.colUsed")}</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("sustainability.colSaved")}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t("sustainability.colMethod")}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t("sustainability.colBaseline")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field) => (
                    <tr key={field.fieldId} className={cn("transition-colors", field.control ? "bg-amber-50/50" : "hover:bg-slate-50/70")}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{field.name}</p>
                        <p className="text-xs text-slate-500">{meta(field)}</p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700 tabular-nums">{formatLitres(field.litresUsed, language)}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
                        {field.control ? <span className="font-normal text-slate-400">–</span> : formatLitres(field.litresSaved, language)}
                      </td>
                      <td className="px-4 py-3">{sourceBadge(field)}</td>
                      <td className="px-4 py-3 text-slate-600">{baselineLabel(tx, field.baseline, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasControl ? (
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                {t("sustainability.controlNote")}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
