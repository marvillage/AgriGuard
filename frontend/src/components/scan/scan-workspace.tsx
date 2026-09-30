"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Camera, LoaderCircle, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Scan } from "@/lib/types";
import { scanConfidence, scanTitle, shouldPoll } from "./scan-helpers";
import { ScanHistory } from "./scan-history";
import { DiseaseResult, PestResult } from "./scan-result";
import { ScanUploader, type ScanRequest } from "./scan-uploader";

function Placeholder({ title, body, busy = false }: { title: string; body?: string; busy?: boolean }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl bg-mist px-6 text-center lg:min-h-[28rem]">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft">
        {busy ? <LoaderCircle className="h-7 w-7 animate-spin text-sun-500" /> : <Camera className="h-7 w-7 text-slate-300" />}
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-xs text-sm text-slate-500">{body}</p> : null}
    </div>
  );
}

export function ScanWorkspace() {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const resultRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const dashboard = useQuery({ queryKey: ["dashboard", language], queryFn: () => api.dashboard() });
  const cropOptions = useQuery({ queryKey: ["meta", "crops"], queryFn: () => api.cropOptions(), staleTime: Infinity });
  const history = useQuery({ queryKey: ["scans", language], queryFn: () => api.scans().then((data) => data.scans) });

  const scans = useMemo(() => history.data ?? [], [history.data]);
  const fields = useMemo(() => dashboard.data?.fields ?? [], [dashboard.data]);
  const fieldNames = useMemo(() => new Map(fields.map((field) => [field.id, field.name])), [fields]);
  const crops = cropOptions.data?.scanCrops ?? [];

  const loadScan = async (id: number) => {
    const { scan } = await api.scan(id);
    queryClient.setQueryData<Scan[]>(["scans", language], (list) => list?.map((item) => (item.id === scan.id ? scan : item)));
    return scan;
  };

  const selected = useQuery({
    queryKey: ["scan", selectedId, language],
    queryFn: () => loadScan(selectedId as number),
    enabled: selectedId !== null,
    placeholderData: () => scans.find((item) => item.id === selectedId),
    refetchInterval: (query) => (query.state.data && shouldPoll(query.state.data) ? 3000 : false),
  });

  const revealResult = (always: boolean) => {
    window.requestAnimationFrame(() => {
      if (always || window.matchMedia("(max-width: 1023px)").matches) {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const createScan = useMutation({
    mutationFn: (request: ScanRequest) => api.createScan(request).then((data) => data.scan),
    onSuccess: (scan) => {
      queryClient.setQueryData(["scan", scan.id, language], scan);
      setSelectedId(scan.id);
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      const name = scanTitle(scan);
      toast({
        title: t("scan.scanDone"),
        body: name ? t("scan.scanDoneBody", { name, confidence: scanConfidence(scan) ?? "–" }) : undefined,
        tone: "success",
      });
      revealResult(false);
    },
    onError: (error) => toast({ title: t("scan.scanFailed"), body: error.message, tone: "critical" }),
  });

  const selectScan = (id: number) => {
    setSelectedId(id);
    revealResult(true);
  };

  const renderResult = (scan: Scan) => {
    const fieldName = fieldNames.get(scan.fieldId) ?? t("common.field");
    if (scan.mode === "pest") return <PestResult scan={scan} fieldName={fieldName} />;
    return <DiseaseResult scan={scan} crops={crops} fieldName={fieldName} />;
  };

  const result =
    selectedId === null ? (
      <Card>
        <CardHeader>
          <CardTitle>{t("scan.stepResult")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Placeholder
            busy={createScan.isPending}
            title={createScan.isPending ? t("scan.analysing") : t("scan.emptyTitle")}
            body={createScan.isPending ? undefined : t("scan.emptyBody")}
          />
        </CardContent>
      </Card>
    ) : selected.data ? (
      renderResult(selected.data)
    ) : selected.isError ? (
      <Alert variant="destructive">{t("scan.loadFailed")}</Alert>
    ) : (
      <Card>
        <CardContent>
          <Placeholder busy title={t("scan.loadingScan")} />
        </CardContent>
      </Card>
    );

  return (
    <div>
      <PageHeader eyebrow={t("nav.intelligence")} title={t("scan.title")} description={t("scan.description")} />

      {dashboard.isPending ? (
        <Card>
          <CardContent>
            <Placeholder busy title={t("common.loading")} />
          </CardContent>
        </Card>
      ) : dashboard.isError ? (
        <Alert variant="destructive">
          <p>{t("common.error")}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => dashboard.refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      ) : fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-950 text-sun-400 shadow-lift">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-ink">{t("scan.noFieldsTitle")}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{t("scan.noFieldsBody")}</p>
            <Link href="/farms" className={buttonVariants({ className: "mt-5" })}>
              {t("scan.goToFarms")} <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <ScanUploader
            fields={fields}
            crops={crops}
            pending={createScan.isPending}
            error={createScan.error?.message ?? null}
            onAnalyse={(request) => createScan.mutate(request)}
          />
          <div ref={resultRef} className="min-w-0 scroll-mt-24 space-y-6">
            {result}
          </div>
        </div>
      )}

      <div className="mt-6">
        <ScanHistory scans={scans} loading={history.isPending} selectedId={selectedId} fieldNames={fieldNames} onSelect={selectScan} />
      </div>
    </div>
  );
}
