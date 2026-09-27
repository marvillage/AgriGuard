"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleCheck, ListFilter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { RecType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecommendationActions } from "./recommendation-actions";
import { RecommendationCard } from "./recommendation-card";
import { priorities, priorityMeta, recStatuses, recTypes, typeMeta, type RecStatus } from "./recommendation-meta";

type TypeFilter = RecType | "ALL";

export function RecommendationList() {
  const { t, tx, language, number } = useI18n();
  const [status, setStatus] = useState<RecStatus>("OPEN");
  const [type, setType] = useState<TypeFilter>("ALL");

  const query = useQuery({
    queryKey: ["recommendations", status, type, language],
    queryFn: async () =>
      (await api.recommendations({ status, type: type === "ALL" ? undefined : type })).recommendations,
    placeholderData: keepPreviousData,
  });

  const recommendations = query.data ?? [];
  const counts = priorities.map((priority) => ({
    priority,
    count: recommendations.filter((rec) => rec.priority === priority).length,
  }));

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.intelligence")}
        title={t("nav.recommendations")}
        description={t("recommendations.description")}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ priority, count }) => {
          const meta = priorityMeta[priority];
          const Icon = meta.icon;
          return (
            <div
              key={priority}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-600">{tx(meta.label)}</p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", meta.tile)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
                {query.isLoading ? "…" : number(count)}
              </p>
              <p className="text-xs text-slate-400">{tx(`recommendations.countHint_${status}`)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
        <FilterGroup label={t("recommendations.statusFilter")}>
          {recStatuses.map((item) => (
            <Chip key={item} active={status === item} onClick={() => setStatus(item)}>
              {tx(`recommendations.status_${item}`)}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label={t("recommendations.typeFilter")}>
          <Chip active={type === "ALL"} onClick={() => setType("ALL")}>
            <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
            {t("recommendations.allTypes")}
          </Chip>
          {recTypes.map((item) => {
            const Icon = typeMeta[item].icon;
            return (
              <Chip key={item} active={type === item} onClick={() => setType(item)}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tx(`recommendations.type_${item}`)}
              </Chip>
            );
          })}
        </FilterGroup>
      </div>

      <div className={cn("mt-6 space-y-3 transition-opacity", query.isPlaceholderData && "opacity-60")}>
        {query.isLoading ? (
          [0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)
        ) : query.isError ? (
          <Alert variant="destructive">
            <p>{t("recommendations.loadError")}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => query.refetch()}>
              {t("common.retry")}
            </Button>
          </Alert>
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <CircleCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">{tx(`recommendations.empty_${status}`)}</p>
            <p className="mt-1 text-sm text-slate-500">{t("recommendations.emptyHint")}</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} footer={<RecommendationActions rec={rec} />} />
          ))
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="shrink-0 text-xs font-semibold tracking-wide text-slate-400 uppercase sm:w-20">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
        active
          ? "border-navy-950 bg-navy-950 text-white shadow-soft"
          : "border-slate-200 bg-white text-slate-600 hover:border-navy-200 hover:bg-navy-50/60 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
