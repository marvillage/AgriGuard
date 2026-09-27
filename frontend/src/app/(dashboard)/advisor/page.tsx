"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sprout } from "lucide-react";
import { FarmCard } from "@/components/advisor/farm-card";
import { FarmerNotice } from "@/components/advisor/farmer-notice";
import { JoinFarmCard } from "@/components/advisor/join-farm-card";
import { SummaryTiles } from "@/components/advisor/summary-tiles";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

function AdvisorDesk() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["advisor"],
    queryFn: async () => (await api.advisorOverview()).farms,
    refetchInterval: 60_000,
  });
  const farms = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.criticalAlerts - a.criticalAlerts || b.worstRisk - a.worstRisk),
    [query.data]
  );

  return (
    <div className="space-y-6">
      {query.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : farms.length > 0 ? (
        <SummaryTiles farms={farms} />
      ) : null}

      <JoinFarmCard />

      {query.isPending ? (
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : query.isError ? (
        <Alert variant="destructive">
          <p>{t("advisor.loadError")}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => query.refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      ) : farms.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
            <Sprout className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">{t("advisor.emptyTitle")}</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">{t("advisor.emptyBody")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {farms.map((item) => (
            <FarmCard key={item.farm.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdvisorPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdvisor = user?.role === "AGRONOMIST" || user?.role === "ADMIN";

  return (
    <div>
      <PageHeader eyebrow={t("advisor.eyebrow")} title={t("advisor.title")} description={isAdvisor ? t("advisor.description") : undefined} />
      {isAdvisor ? <AdvisorDesk /> : <FarmerNotice />}
    </div>
  );
}
