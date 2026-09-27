"use client";

import { CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatRupees } from "@/lib/format";
import type { SeasonReplay } from "@/lib/types";

export function ReplayCard({ replay, cropNames }: { replay: SeasonReplay; cropNames: Map<string, string> }) {
  const { t, number, language } = useI18n();
  const headline = replay.totals.conservative;
  const all = replay.totals.allFields;
  const millions = (litres: number) => t("validation.replayMillionLitres", { value: number(litres / 1e6, 2) });
  const rows = replay.fields
    .filter((field) => field.includedInTotals)
    .sort((a, b) => Number(b.inConservativeHeadline) - Number(a.inConservativeHeadline) || b.saved.pct - a.saved.pct);
  const excluded = headline.excludedFields.filter((field) => rows.some((row) => row.fieldId === field.fieldId));
  const year = replay.fields[0]?.season.year;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-navy-700" aria-hidden="true" />
            {t("validation.replayTitle")}
          </CardTitle>
          <Badge variant="warning">{t("validation.simulated")}</Badge>
        </div>
        <p className="text-sm text-slate-500">{t("validation.replaySubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-navy-950 p-5 text-white">
          <p className="font-display text-2xl font-bold text-sun-400">
            {t("validation.replayHeadline", { pct: number(headline.saved.pct, 1) })}
          </p>
          <p className="mt-1 text-sm text-white/80">{millions(headline.saved.litres)}</p>
          <p className="mt-1 text-sm text-white/65">
            {t("validation.replayEnergy", {
              kwh: number(headline.saved.kwh),
              rupees: formatRupees(headline.saved.rupees, language),
              co2: number(headline.saved.co2Kg),
            })}
          </p>
          <p className="mt-3 text-xs text-white/55">
            {t("validation.replayCropNeed", {
              pct: number(headline.agriguard.actualEtPctOfEtc, 2),
              stressA: number(headline.agriguard.stressFieldDays ?? 0),
              stressB: number(headline.rainBlindWeekly.stressFieldDays ?? 0),
            })}
          </p>
        </div>
        <p className="text-sm text-slate-600">{t("validation.replayAll", { pct: number(all.saved.pct, 1) })}</p>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("validation.replayColField")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("validation.replayColAgriGuard")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("validation.replayColSchedule")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("validation.replayColSaved")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("validation.replayColStress")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.fieldId} className={row.inConservativeHeadline ? undefined : "text-slate-400"}>
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">
                    <span className={row.inConservativeHeadline ? "text-ink" : undefined}>{row.field}</span>
                    <span className="block text-[11px] font-normal text-slate-400">
                      {cropNames.get(row.crop.key) ?? row.crop.name}
                      {row.inConservativeHeadline ? "" : ` · ${t("validation.replayNotCounted")}`}
                    </span>
                  </th>
                  <td className="px-3 py-2.5 text-right tabular-nums">{number(row.agriguard.litres / 1e6, 2)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{number(row.rainBlindWeekly.litres / 1e6, 2)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{t("validation.percent", { value: number(row.saved.pct, 1) })}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {number(row.agriguard.stressDays ?? 0)} / {number(row.rainBlindWeekly.stressDays ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">{t("validation.replayUnits")}</p>
        {excluded.length ? (
          <p className="text-xs leading-relaxed text-slate-500">{t("validation.replayExcluded", { fields: excluded.map((field) => field.field).join(", ") })}</p>
        ) : null}

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ink">{t("validation.replayAssumptions")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
            <li>{t("validation.replayAssumeBaseline")}</li>
            <li>{t("validation.replayAssumeForecast")}</li>
            <li>{t("validation.replayAssumePaddy")}</li>
            <li>{t("validation.replayAssumeStart")}</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            {t("validation.replaySource", { source: `Open-Meteo ${replay.source.model}${year ? ` · ${year}` : ""} (CC BY 4.0)` })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
