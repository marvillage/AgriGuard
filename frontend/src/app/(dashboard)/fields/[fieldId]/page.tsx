"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { CropTab } from "@/components/field/crop-tab";
import { DevicesTab } from "@/components/field/devices-tab";
import { FertilizerTab } from "@/components/field/fertilizer-tab";
import { FieldHeader } from "@/components/field/field-header";
import { FieldSkeleton } from "@/components/field/field-skeleton";
import { FieldTabs, useFieldTab, type FieldTab } from "@/components/field/field-tabs";
import { MapTab } from "@/components/field/map-tab";
import { OverviewTab } from "@/components/field/overview-tab";
import { PumpTab } from "@/components/field/pump-tab";
import { ReadingsTab } from "@/components/field/readings-tab";
import { ReportTab } from "@/components/field/report-tab";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { FieldOverview } from "@/lib/types";

const panels: Record<FieldTab, (props: { overview: FieldOverview }) => React.ReactNode> = {
  overview: OverviewTab,
  pump: PumpTab,
  devices: DevicesTab,
  crop: CropTab,
  map: MapTab,
  fertilizer: FertilizerTab,
  readings: ReadingsTab,
  report: ReportTab,
};

export default function FieldPage() {
  return (
    <Suspense fallback={<FieldSkeleton />}>
      <FieldView />
    </Suspense>
  );
}

function FieldView() {
  const { t } = useI18n();
  const params = useParams<{ fieldId: string }>();
  const fieldId = Number(params.fieldId);
  const valid = Number.isInteger(fieldId) && fieldId > 0;
  const tab = useFieldTab();
  const query = useQuery({
    queryKey: ["field", fieldId],
    queryFn: () => api.fieldOverview(fieldId),
    enabled: valid,
    refetchInterval: 60_000,
  });

  if (valid && query.isLoading) return <FieldSkeleton />;

  if (!valid || !query.data) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <Alert variant="destructive">
          <p className="font-semibold">{t("field.loadError")}</p>
          {query.error ? <p className="mt-1">{query.error.message}</p> : null}
        </Alert>
        <div className="flex flex-wrap gap-2">
          {valid ? (
            <Button variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {t("common.retry")}
            </Button>
          ) : null}
          <Link href="/farms" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft className="h-4 w-4" />
            {t("field.backToFarms")}
          </Link>
        </div>
      </div>
    );
  }

  const overview = query.data;
  const Panel = panels[tab];

  return (
    <div>
      <FieldHeader overview={overview} />
      <FieldTabs active={tab} />
      <div role="tabpanel" id="field-tab-panel" aria-labelledby={`field-tab-${tab}`} key={tab} className="animate-fade-up">
        <Panel overview={overview} />
      </div>
    </div>
  );
}
