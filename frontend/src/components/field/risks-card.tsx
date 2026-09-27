"use client";

import { ShieldCheck } from "lucide-react";
import { AiExplain } from "@/components/ai/ai-explain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { levelTone } from "@/lib/format";
import type { FieldOverview, Level } from "@/lib/types";
import { InfoRow, SectionTitle, levelKey, levelVariant } from "./field-ui";

export function RisksCard({ overview }: { overview: FieldOverview }) {
  const { t, number } = useI18n();
  const { risks } = overview;
  const rows: Array<{ key: string; label: string; level: Level | null; score: number | null }> = [
    { key: "water", label: t("field.riskWater"), level: risks.levels.water, score: risks.waterStress },
    { key: "disease", label: t("field.riskDisease"), level: risks.levels.disease, score: risks.diseaseRisk },
    { key: "weather", label: t("field.riskWeather"), level: risks.levels.weather, score: risks.weatherRisk },
    { key: "nutrient", label: t("field.riskNutrient"), level: risks.levels.nutrient, score: risks.nutrientStress },
  ];
  const healthTone = risks.cropHealth >= 70 ? "good" : risks.cropHealth >= 45 ? "warning" : "critical";

  return (
    <Card className="h-full">
      <CardHeader>
        <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-navy-700" />} title={t("field.risksTitle")} />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4 rounded-xl bg-slate-50 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-slate-500">{t("field.cropHealth")}</span>
            <span className="font-display text-lg font-semibold text-ink tabular-nums">{t("field.score", { value: number(risks.cropHealth) })}</span>
          </div>
          <Meter value={risks.cropHealth} tone={healthTone} label={t("field.cropHealth")} className="mt-2" />
        </div>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{row.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 tabular-nums">{row.score === null ? "–" : t("field.score", { value: number(row.score) })}</span>
                  <Badge variant={levelVariant(row.level)}>{row.level ? t(levelKey(row.level)) : t("field.noSignal")}</Badge>
                </span>
              </div>
              {row.score !== null ? <Meter value={row.score} tone={levelTone(row.level)} label={row.label} className="mt-1.5 h-1.5" /> : null}
            </li>
          ))}
        </ul>
        <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          <InfoRow label={t("field.humidHours")} value={t("field.hoursValue", { value: number(risks.humidHours) })} />
          <InfoRow label={t("field.meanTemp")} value={t("field.degrees", { value: number(risks.meanTemp, 1) })} />
        </dl>
        <AiExplain
          className="mt-4"
          id={[overview.field.id, "risk", risks.cropHealth, risks.diseaseRisk]}
          load={async () => (await api.explainField(overview.field.id, "risk")).explanation}
        />
      </CardContent>
    </Card>
  );
}
