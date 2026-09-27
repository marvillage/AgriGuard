"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, Sprout } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { CurrentPeriods } from "./current-periods";
import { FarmSelect } from "./farm-select";
import { FieldSavings } from "./field-savings";
import { ImpactCalculator } from "./impact-calculator";
import { ImpactKpis } from "./impact-kpis";
import { Methodology } from "./methodology";
import { ReportDownloads } from "./report-downloads";
import { SavingsLedger } from "./savings-ledger";
import { SustainabilityScore } from "./sustainability-score";
import { WaterUsageChart } from "./water-usage-chart";

export function SustainabilityReport() {
  const { t } = useI18n();
  const [farmId, setFarmId] = useState<number | null>(null);

  const farmsQuery = useQuery({
    queryKey: ["farms"],
    queryFn: async () => (await api.listFarms()).farms,
  });

  const impactQuery = useQuery({
    queryKey: ["impact", farmId ?? "all"],
    queryFn: () => api.impact(farmId ?? undefined),
    placeholderData: keepPreviousData,
  });

  const farms = farmsQuery.data ?? [];
  const selectedFarms = farmId ? farms.filter((farm) => farm.id === farmId) : farms;
  const impact = impactQuery.data;
  const isEmpty = impact ? impact.entries.length === 0 && impact.pending.length === 0 && impact.totals.litresUsed === 0 : false;

  return (
    <div>
      <PageHeader
        eyebrow={t("sustainability.eyebrow")}
        title={t("sustainability.title")}
        description={t("sustainability.description")}
        action={
          <>
            {farms.length > 1 ? (
              <FarmSelect
                label={t("sustainability.farmLabel")}
                allLabel={t("sustainability.allFarms")}
                farms={farms}
                value={farmId}
                onChange={setFarmId}
                className="w-full sm:w-auto"
              />
            ) : null}
            <ReportDownloads farmId={farmId} />
          </>
        }
      />

      {impactQuery.isError ? (
        <Alert variant="destructive" className="mb-6">
          <p className="font-semibold">{t("sustainability.loadFailed")}</p>
          <p className="mt-0.5">{impactQuery.error instanceof Error ? impactQuery.error.message : t("common.error")}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => impactQuery.refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      ) : null}

      {impactQuery.isPending ? <ReportSkeleton /> : null}

      {impact ? (
        <div className={impactQuery.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {isEmpty ? (
            <Card className="mb-6">
              <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
                    <Sprout className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-ink">{t("sustainability.emptyTitle")}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{t("sustainability.emptyBody")}</p>
                  </div>
                </div>
                <Link href="/farms" className={buttonVariants({ variant: "default" })}>
                  {t("sustainability.emptyAction")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <ImpactKpis totals={impact.totals} />

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <WaterUsageChart monthly={impact.monthly} entries={impact.entries} className="min-w-0 xl:col-span-2" />
            <SustainabilityScore score={impact.score} />
          </div>

          <FieldSavings fields={impact.fields} className="mt-6" />

          <CurrentPeriods pending={impact.pending} fields={impact.fields} className="mt-6" />

          <SavingsLedger key={farmId ?? "all"} ledger={impact.ledger} entries={impact.entries} fields={impact.fields} className="mt-6" />

          <Methodology farms={selectedFarms} className="mt-6" />
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">{t("sustainability.planTitle")}</h2>
        <p className="mt-1 mb-5 text-sm text-slate-500">{t("sustainability.planDescription")}</p>
        <ImpactCalculator />
      </section>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[...Array(8).keys()].map((index) => (
          <div key={index} className="h-32 rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="h-96 rounded-2xl bg-slate-200/60 xl:col-span-2" />
        <div className="h-96 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}
