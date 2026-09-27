"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { ImpactSummary } from "@/lib/types";
import { scoreLabel } from "./impact-labels";

export function SustainabilityScore({ score, className }: { score: ImpactSummary["score"]; className?: string }) {
  const { t, tx, language } = useI18n();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("sustainability.scoreTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("sustainability.scoreDescription")}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="font-display text-6xl font-bold tracking-tight text-ink">
            {score.value === null ? "–" : formatNumber(score.value, 0, language)}
          </span>
          <span className="mb-2 text-lg font-medium text-slate-400">{t("sustainability.scoreOutOf")}</span>
        </div>
        <Meter value={score.value ?? 0} tone="sun" label={t("sustainability.scoreTitle")} className="mt-3 h-2.5" />
        {score.value === null ? <p className="mt-3 text-sm text-slate-500">{t("sustainability.scoreEmpty")}</p> : null}
        <ul className="mt-6 space-y-4">
          {score.parts.map((part) => {
            const label = scoreLabel(tx, part);
            return (
              <li key={part.key}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {part.value === null ? t("sustainability.scoreNoData") : formatNumber(part.value, 0, language)}
                  </span>
                </div>
                <Meter value={part.value ?? 0} tone="navy" label={label} className="mt-1.5" />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
