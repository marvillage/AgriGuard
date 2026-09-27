"use client";

import { Hourglass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatLitres, formatNumber } from "@/lib/format";
import type { ImpactSummary } from "@/lib/types";

export function CurrentPeriods({
  pending,
  fields,
  className,
}: {
  pending: ImpactSummary["pending"];
  fields: ImpactSummary["fields"];
  className?: string;
}) {
  const { t, language } = useI18n();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-sun-600" aria-hidden="true" />
          {t("sustainability.pendingTitle")}
        </CardTitle>
        <p className="text-sm text-slate-500">{t("sustainability.pendingDescription")}</p>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">{t("sustainability.pendingEmpty")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((period) => {
              const field = fields.find((item) => item.fieldId === period.fieldId);
              const pct = Math.round(period.elapsed * 100);
              const name = field?.name ?? `#${period.fieldId}`;
              return (
                <li key={`${period.fieldId}-${period.periodStart}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold text-ink">{name}</p>
                    <p className="shrink-0 text-xs text-slate-500">
                      {t("sustainability.pendingPeriod", {
                        start: formatDate(period.periodStart, language),
                        end: formatDate(period.periodEnd, language),
                      })}
                    </p>
                  </div>
                  <Meter value={pct} tone="sun" label={`${name}: ${t("sustainability.pendingElapsed", { pct })}`} className="mt-2" />
                  <p className="mt-1 text-xs text-slate-400">{t("sustainability.pendingElapsed", { pct: formatNumber(pct, 0, language) })}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">{t("sustainability.pendingUsed")}</dt>
                      <dd className="font-semibold text-ink tabular-nums">{formatLitres(period.usedSoFar, language)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t("sustainability.pendingSaved")}</dt>
                      <dd className="font-semibold text-ink tabular-nums">{formatLitres(period.savedSoFar, language)}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
