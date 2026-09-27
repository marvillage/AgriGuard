"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/provider";
import { formatLitres, formatNumber } from "@/lib/format";
import type { TrialPlot } from "@/lib/types";
import { plotColors } from "./plot-colors";

type Role = "treatment" | "control";

export function TrialComparison({ treatment, control }: { treatment: TrialPlot; control: TrialPlot }) {
  const { t, language } = useI18n();
  const max = Math.max(treatment.litresPerAcre, control.litresPerAcre, 1);

  const rows: Array<{ role: Role; plot: TrialPlot; label: string }> = [
    { role: "treatment", plot: treatment, label: t("trials.treatment") },
    { role: "control", plot: control, label: t("trials.control") },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold text-ink">{t("trials.litresPerAcreTitle")}</h3>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <li key={row.role} className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: plotColors[row.role] }} aria-hidden="true" />
              {row.label}
            </li>
          ))}
        </ul>
      </div>
      <ul className="mt-4 space-y-4">
        {rows.map((row) => (
          <li key={row.role}>
            <p className="mb-1.5 truncate text-xs font-medium text-slate-500">{row.plot.name}</p>
            <div className="flex items-center gap-2">
              <div
                role="img"
                aria-label={`${row.label}: ${t("trials.litresPerAcreValue", { value: formatNumber(row.plot.litresPerAcre, 0, language) })}`}
                className="h-5 min-w-1 rounded-r-[4px] transition-[width] duration-700 ease-out"
                style={{
                  backgroundColor: plotColors[row.role],
                  width: `calc((100% - 8.5rem) * ${row.plot.litresPerAcre / max})`,
                }}
              />
              <span className="shrink-0 text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
                {t("trials.litresPerAcreValue", { value: formatNumber(row.plot.litresPerAcre, 0, language) })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlotStats({ treatment, control }: { treatment: TrialPlot; control: TrialPlot }) {
  const { t, language } = useI18n();
  const plots: Array<{ role: Role; plot: TrialPlot }> = [
    { role: "treatment", plot: treatment },
    { role: "control", plot: control },
  ];

  const rows: Array<{ label: string; value: (plot: TrialPlot) => React.ReactNode }> = [
    { label: t("trials.irrigations"), value: (plot) => formatNumber(plot.irrigations, 0, language) },
    {
      label: t("trials.meanMoisture"),
      value: (plot) => (plot.meanMoisture === null ? "–" : t("trials.moisturePct", { value: formatNumber(plot.meanMoisture, 1, language) })),
    },
    { label: t("trials.energyPerAcre"), value: (plot) => t("trials.kwhPerAcre", { value: formatNumber(plot.kwhPerAcre, 1, language) }) },
    { label: t("trials.totalWater"), value: (plot) => formatLitres(plot.litres, language) },
    {
      label: t("trials.dataSource"),
      value: (plot) =>
        plot.irrigations === 0 ? (
          "–"
        ) : (
          <Badge variant={plot.measured ? "success" : "info"}>{plot.measured ? t("common.measured") : t("common.estimated")}</Badge>
        ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <td className="w-[34%] px-3 py-2.5" />
            {plots.map(({ role, plot }) => (
              <th key={role} scope="col" className="px-3 py-2.5 font-semibold">
                <span className="flex items-start gap-1.5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: plotColors[role] }} aria-hidden="true" />
                  <span className="min-w-0 leading-snug break-words text-ink">{plot.name}</span>
                </span>
                <span className="mt-0.5 block font-normal">{t("trials.plotArea", { area: formatNumber(plot.areaAcres, 2, language) })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="px-3 py-2.5 text-xs font-medium text-slate-500">
                {row.label}
              </th>
              {plots.map(({ role, plot }) => (
                <td key={role} className="px-3 py-2.5 font-medium text-ink">
                  {row.value(plot)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
