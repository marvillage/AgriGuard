"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { DiseaseCard } from "./disease-card";
import { ImprovementsLog } from "./improvements-log";
import { ReplayCard } from "./replay-card";
import { TestsCard } from "./tests-card";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-navy-950 p-5 text-white shadow-soft">
      <p className="font-display text-3xl font-bold tracking-tight text-sun-400 tabular-nums">{value}</p>
      <p className="mt-1 text-sm leading-snug text-white/70">{label}</p>
    </div>
  );
}

export function ValidationWorkspace() {
  const { t, number, language } = useI18n();
  const query = useQuery({ queryKey: ["validation"], queryFn: api.validation, staleTime: 5 * 60 * 1000 });
  const cropsQuery = useQuery({ queryKey: ["meta-crops", language], queryFn: api.cropOptions, staleTime: 60 * 60 * 1000 });
  const cropNames = useMemo(() => new Map((cropsQuery.data?.scanCrops ?? []).map((crop) => [crop.key, crop.name])), [cropsQuery.data]);
  const profileNames = useMemo(() => new Map((cropsQuery.data?.crops ?? []).map((crop) => [crop.key, crop.name])), [cropsQuery.data]);
  const data = query.data;
  const percent = (value: number | null | undefined) => (value === null || value === undefined ? "–" : t("validation.percent", { value: number(value, 1) }));

  return (
    <div>
      <PageHeader eyebrow={t("validation.eyebrow")} title={t("validation.title")} description={t("validation.description")} />

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : query.isError || !data ? (
        <Alert variant="destructive">{t("validation.loadError")}</Alert>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat value={percent(data.diseaseModel?.metrics.cropFiltered.top1.pct)} label={t("validation.statPhotos")} />
            <Stat value={percent(data.diseaseModel?.metrics.cropFiltered.top3.pct)} label={t("validation.statTop3")} />
            <Stat value={percent(data.seasonReplay?.totals.conservative.saved.pct)} label={t("validation.statReplay")} />
            <Stat
              value={data.tests ? `${number(data.tests.passed)}/${number(data.tests.total)}` : "–"}
              label={t("validation.statTests")}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
            <div className="min-w-0 space-y-6">
              {data.diseaseModel ? <DiseaseCard result={data.diseaseModel} cropNames={cropNames} /> : null}
              {data.seasonReplay ? <ReplayCard replay={data.seasonReplay} cropNames={profileNames} /> : null}
            </div>
            <div className="min-w-0 space-y-6">
              <TestsCard tests={data.tests} />
              <ImprovementsLog tests={data.tests} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
