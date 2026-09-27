"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, HeartPulse, Sprout, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { DashboardField } from "@/lib/types";
import { RiskCard } from "./risk-card";
import { levelFromScore } from "./risk-level";
import { StatsGrid } from "./stats-grid";
import { useDashboard } from "./use-dashboard";

function worstScore(field: DashboardField) {
  return Math.max(field.waterStress ?? -1, field.diseaseRisk ?? -1, field.weatherRisk ?? -1);
}

export function RiskCenter() {
  const { t, number } = useI18n();
  const query = useDashboard();
  const fields = [...(query.data?.fields ?? [])].sort(
    (a, b) => worstScore(b) - worstScore(a) || (a.cropHealth ?? 101) - (b.cropHealth ?? 101)
  );
  const high = fields.filter((field) => levelFromScore(worstScore(field)) === "High").length;
  const moderate = fields.filter((field) => levelFromScore(worstScore(field)) === "Moderate").length;
  const avgHealth = query.data?.stats.avgCropHealth ?? null;

  return (
    <div>
      <PageHeader eyebrow={t("nav.intelligence")} title={t("nav.risk")} description={t("risk.description")} />

      {query.isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label={t("common.loading")}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <p className="font-semibold">{t("risk.loadError")}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => query.refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      ) : fields.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sprout className="mx-auto h-8 w-8 text-sun-500" aria-hidden="true" />
          <p className="mt-3 font-display text-lg font-semibold text-ink">{t("risk.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("risk.emptyBody")}</p>
          <Link href="/farms" className={buttonVariants({ className: "mt-5" })}>
            {t("risk.emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          <StatsGrid
            stats={[
              { label: t("risk.statFields"), value: number(fields.length), hint: t("risk.statFieldsHint"), icon: Sprout, tone: "navy" },
              { label: t("risk.statHigh"), value: number(high), hint: t("risk.statHighHint"), icon: high ? TriangleAlert : CircleCheck, tone: high ? "critical" : "good" },
              { label: t("risk.statModerate"), value: number(moderate), hint: t("risk.statModerateHint"), icon: moderate ? CircleAlert : CircleCheck, tone: moderate ? "warning" : "good" },
              {
                label: t("risk.statHealth"),
                value: avgHealth === null ? "–" : `${number(avgHealth)}%`,
                hint: t("risk.statHealthHint"),
                icon: HeartPulse,
                tone: "good",
              },
            ]}
          />

          <p className="mt-6 mb-3 text-xs text-slate-500">{t("risk.scale")}</p>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            {fields.map((field) => (
              <RiskCard key={field.id} field={field} />
            ))}
          </div>

          <Link
            href="/recommendations"
            className="group mt-6 flex items-center justify-between gap-4 rounded-2xl bg-navy-950 p-5 text-white transition-all duration-300 hover:shadow-lift"
          >
            <span>
              <span className="block font-display font-semibold">{t("risk.ctaTitle")}</span>
              <span className="text-sm text-white/60">{t("risk.ctaBody")}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-sun-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  );
}
