"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Eye, Layers, LoaderCircle, Ruler, Sparkles, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { errorMessage } from "./field-ui";

export function FieldHeader({ overview }: { overview: FieldOverview }) {
  const { t, tx, language, number } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { field, farm, crop, stage, latest } = overview;
  const method = field.irrigationMethod ?? farm.irrigationMethod;
  const stale = overview.latestAgeMinutes !== null && overview.latestAgeMinutes > 60;

  const analyze = useMutation({
    mutationFn: () => api.analyzeField(field.id),
    onSuccess: async ({ action }) => {
      toast({ title: t("field.analysisDone"), body: tx(`field.action_${action}`), tone: "success" });
      await queryClient.invalidateQueries({ queryKey: ["field", field.id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (error) => toast({ title: t("field.analysisFailed"), body: errorMessage(error, t("common.error")), tone: "critical" }),
  });

  return (
    <div className="mb-6">
      <Link
        href={`/farms/${farm.id}`}
        className="mb-4 inline-flex max-w-full items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="truncate">{farm.name}</span>
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-widest text-sun-600 uppercase">{t("common.field")}</p>
            {overview.access === "advisor" ? (
              <Badge variant="navy">
                <Eye className="h-3 w-3" />
                {t("field.readOnly")}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight break-words text-ink sm:text-3xl">{field.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {crop ? (
              <Badge variant="default">
                <Sprout className="h-3 w-3" />
                {crop.name}
                {stage.label ? ` · ${stage.label}` : ""}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("field.noCrop")}</Badge>
            )}
            {crop && stage.day !== null && stage.seasonDays !== null ? (
              <Badge variant="navy">{t("field.stageDay", { day: number(stage.day), total: number(stage.seasonDays) })}</Badge>
            ) : null}
            <Badge variant="secondary">
              <Ruler className="h-3 w-3" />
              {t("field.areaValue", { area: number(field.area, 2) })}
            </Badge>
            <Badge variant="secondary">
              <Layers className="h-3 w-3" />
              {field.soilType ?? overview.soil.name}
            </Badge>
            <Badge variant="secondary">{tx(`farms.method_${method}`)}</Badge>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <Button onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            {analyze.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {analyze.isPending ? t("field.analyzing") : t("field.runAnalysis")}
          </Button>
          <p className={stale ? "flex items-center gap-1.5 text-xs font-medium text-amber-700" : "flex items-center gap-1.5 text-xs text-slate-500"}>
            <Clock className="h-3.5 w-3.5" />
            {latest ? t("field.lastReading", { age: timeAgo(latest.observedAt, language) }) : t("field.noReadings")}
          </p>
        </div>
      </div>
    </div>
  );
}
