"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/format";
import type { Observation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SectionTitle, errorMessage, type BadgeVariant } from "./field-ui";

export const sourceVariants: Record<Observation["source"], BadgeVariant> = {
  DEVICE: "navy",
  SIMULATOR: "info",
  OPEN_METEO: "success",
  MANUAL: "default",
};

type SourceFilter = Observation["source"] | "ALL";

const filters: SourceFilter[] = ["ALL", "OPEN_METEO", "DEVICE", "MANUAL", "SIMULATOR"];
const pageSize = 50;

export function RawReadings({ fieldId }: { fieldId: number }) {
  const { t, tx, language, number } = useI18n();
  const [source, setSource] = useState<SourceFilter>("ALL");
  const query = useInfiniteQuery({
    queryKey: ["field", fieldId, "raw-readings", source],
    queryFn: ({ pageParam }) =>
      api.rawObservations(fieldId, { before: pageParam ?? undefined, limit: pageSize, source: source === "ALL" ? undefined : source }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? (last.readings[last.readings.length - 1]?.observedAt ?? null) : null),
  });
  const readings = query.data?.pages.flatMap((page) => page.readings) ?? [];
  const cell = (value: number | null, digits = 1) => (value === null ? "–" : number(value, digits));
  const pump = (value: boolean | null) => (value === null ? "–" : value ? t("field.pumpOn") : t("field.pumpOff"));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle icon={<History className="h-4 w-4 text-navy-700" />} title={t("field.recentTitle")} />
          <p className="text-sm text-slate-500">{t("field.recentIntro")}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("field.columnSource")}>
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSource(filter)}
              aria-pressed={source === filter}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                source === filter ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink"
              )}
            >
              {filter === "ALL" ? t("field.rawFilterAll") : tx(`field.source_${filter}`)}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {query.isError ? (
          <Alert variant="destructive">{errorMessage(query.error, t("common.error"))}</Alert>
        ) : query.isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        ) : readings.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{t("field.noRawReadings")}</p>
        ) : (
          <>
            <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.columnTime")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.columnSource")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.soilMoisture")} ({t("field.unitPercent")})</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.airTemperature")} ({t("field.unitCelsius")})</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.humidity")} ({t("field.unitPercent")})</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.flowRate")} ({t("field.unitLpm")})</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.tankLevel")} ({t("field.unitPercent")})</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("field.pump")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {readings.map((reading) => (
                    <tr key={reading.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium whitespace-nowrap text-ink">
                        {formatDate(reading.observedAt, language)} {formatTime(reading.observedAt, language)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex flex-col items-start gap-0.5">
                          <Badge variant={sourceVariants[reading.source]}>{tx(`field.source_${reading.source}`)}</Badge>
                          {reading.deviceName ? <span className="text-xs text-slate-400">{reading.deviceName}</span> : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{cell(reading.soilMoisture)}</td>
                      <td className="px-3 py-2 text-slate-700">{cell(reading.temperature)}</td>
                      <td className="px-3 py-2 text-slate-700">{cell(reading.humidity, 0)}</td>
                      <td className="px-3 py-2 text-slate-700">{cell(reading.flowRateLpm, 0)}</td>
                      <td className="px-3 py-2 text-slate-700">{cell(reading.tankLevel, 0)}</td>
                      <td className="px-3 py-2 text-slate-700">{pump(reading.pumpOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {query.hasNextPage ? (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {t("field.loadOlder")}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
