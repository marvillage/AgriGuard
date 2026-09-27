"use client";

import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import type { FieldOverview } from "@/lib/types";
import { InfoRow, SectionTitle } from "./field-ui";
import { RefillText } from "./moisture-forecast-chart";

export function WaterBudgetCard({ overview }: { overview: FieldOverview }) {
  const { t, number } = useI18n();
  const { water, stage, decision, soil, forecast } = overview;
  const mm = (value: number | null) => (value === null ? "–" : t("field.mm", { value: number(value, 1) }));
  const perDay = (value: number | null) => (value === null ? "–" : t("field.mmPerDay", { value: number(value, 1) }));
  const depletionShare = water.depletionMm !== null && water.tawMm > 0 ? (water.depletionMm / water.tawMm) * 100 : null;
  const rawShare = water.tawMm > 0 ? Math.min(100, (water.rawMm / water.tawMm) * 100) : 0;
  const pastRaw = water.depletionMm !== null && water.depletionMm > water.rawMm;

  return (
    <Card className="h-full">
      <CardHeader>
        <SectionTitle icon={<Layers className="h-4 w-4 text-navy-700" />} title={t("field.waterTitle")} />
        <p className="text-sm text-slate-500">{t("field.waterIntro")}</p>
      </CardHeader>
      <CardContent className="pt-4">
        {depletionShare !== null ? (
          <div className="mb-4 rounded-xl bg-slate-50 p-3.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-500">{t("field.depletion")}</span>
              <span className="font-display text-lg font-semibold text-ink tabular-nums">{mm(water.depletionMm)}</span>
            </div>
            <div className="relative mt-2">
              <Meter value={depletionShare} tone={pastRaw ? "warning" : "good"} label={t("field.depletion")} />
              <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" style={{ left: `${rawShare}%` }} aria-hidden="true" />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{t("field.depletionScale", { raw: number(water.rawMm, 1), taw: number(water.tawMm, 1) })}</p>
          </div>
        ) : null}
        <dl className="divide-y divide-slate-100">
          <InfoRow label={t("field.soil")} value={soil.name} />
          <InfoRow label={t("field.rootDepth")} value={t("field.metres", { value: number(stage.rootDepthM, 2) })} />
          <InfoRow label={t("field.taw")} value={mm(water.tawMm)} />
          <InfoRow label={t("field.raw")} value={mm(water.rawMm)} />
          <InfoRow label={t("field.kc")} value={number(stage.kc, 2)} />
          <InfoRow label={t("field.et0")} value={perDay(decision.et0)} />
          <InfoRow label={t("field.etc")} value={perDay(decision.etc)} />
          {water.stressPct !== null ? <InfoRow label={t("field.stress")} value={t("field.percent", { value: number(water.stressPct) })} /> : null}
        </dl>
        {forecast ? (
          <p className="mt-3 rounded-xl bg-navy-50/70 px-3.5 py-2.5 text-xs text-navy-900">
            <RefillText forecast={forecast} />
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
