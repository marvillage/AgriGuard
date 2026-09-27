"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FlaskConical, Plus } from "lucide-react";
import { FarmSelect } from "@/components/impact/farm-select";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { ControlPlotExplainer } from "./control-plot-explainer";
import { NewTrialDialog } from "./new-trial-dialog";
import { TrialCard } from "./trial-card";

export function TrialsWorkspace() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);

  const farmsQuery = useQuery({
    queryKey: ["farms"],
    queryFn: async () => (await api.listFarms()).farms,
  });
  const farms = farmsQuery.data ?? [];
  const requested = Number(searchParams.get("farm"));
  const farm = farms.find((item) => item.id === requested) ?? farms.find((item) => item.access !== "advisor") ?? farms[0];
  const farmId = farm?.id ?? null;
  const canEdit = farm ? farm.access !== "advisor" : false;

  const trialsQuery = useQuery({
    queryKey: ["trials", farmId],
    queryFn: async () => (await api.trials(farmId as number)).trials,
    enabled: farmId !== null,
  });
  const trials = trialsQuery.data ?? [];

  const selectFarm = (id: number | null) => {
    if (id) router.replace(`${pathname}?farm=${id}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("trials.eyebrow")}
        title={t("trials.title")}
        description={t("trials.description")}
        action={
          <>
            {farms.length > 1 ? (
              <FarmSelect label={t("trials.farmLabel")} farms={farms} value={farmId} onChange={selectFarm} className="w-full sm:w-auto" />
            ) : null}
            {canEdit ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t("trials.newTrial")}
              </Button>
            ) : null}
          </>
        }
      />

      {farm && !canEdit ? (
        <Alert variant="info" className="mb-6">
          <p className="font-semibold">{t("trials.viewOnly")}</p>
          <p className="mt-0.5">{t("trials.viewOnlyBody")}</p>
        </Alert>
      ) : null}

      <ControlPlotExplainer className="mb-6" />

      {farmsQuery.isError || trialsQuery.isError ? (
        <Alert variant="destructive" className="mb-6">
          <p className="font-semibold">{t("trials.loadFailed")}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => (farmsQuery.isError ? farmsQuery.refetch() : trialsQuery.refetch())}
          >
            {t("common.retry")}
          </Button>
        </Alert>
      ) : null}

      {farmsQuery.isPending || (farmId !== null && trialsQuery.isPending) ? (
        <div aria-hidden="true" className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : null}

      {farmsQuery.isSuccess && farms.length === 0 ? (
        <EmptyState
          title={t("trials.noFarms")}
          action={
            <Link href="/farms" className={buttonVariants({ variant: "default" })}>
              {t("trials.noFarmsAction")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : null}

      {trialsQuery.isSuccess && trials.length === 0 ? (
        <EmptyState
          title={t("trials.emptyTitle")}
          body={canEdit ? t("trials.emptyBody") : t("trials.emptyBodyAdvisor")}
          action={
            canEdit ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t("trials.newTrial")}
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="space-y-6">
        {trials.map((trial) => (
          <TrialCard key={trial.id} trial={trial} canEdit={canEdit} asOf={trialsQuery.dataUpdatedAt} />
        ))}
      </div>

      {creating && farmId !== null ? <NewTrialDialog farmId={farmId} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
          <FlaskConical className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-ink">{title}</p>
        {body ? <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
