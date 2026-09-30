"use client";

import Link from "next/link";
import { Camera, CircleCheck, HeartPulse, MapPin, Plus, RadioTower, Sprout, TriangleAlert } from "lucide-react";
import { BriefingCard } from "@/components/dashboard/briefing-card";
import { FieldStatusList } from "@/components/dashboard/field-status-list";
import { HealthChart } from "@/components/dashboard/health-chart";
import { ImpactStrip } from "@/components/dashboard/impact-strip";
import { Onboarding } from "@/components/dashboard/onboarding";
import { PriorityRecommendations } from "@/components/dashboard/priority-recommendations";
import { SensorCard } from "@/components/dashboard/sensor-card";
import { StatsGrid, type Stat } from "@/components/dashboard/stats-grid";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { Dashboard } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

function greetingKey(hour: number) {
  if (hour < 12) return "dashboard.greetingMorning" as const;
  if (hour < 17) return "dashboard.greetingAfternoon" as const;
  return "dashboard.greetingEvening" as const;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const query = useDashboard();
  // Titles such as "Dr." are skipped, so "Dr. Meera Patil" is greeted as Meera.
  const firstName = user?.name?.trim().split(/\s+/).find((word) => !/^(dr|mr|mrs|ms|shri|smt|prof)\.?$/i.test(word)) || t("dashboard.fallbackName");

  return (
    <div>
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t(greetingKey(new Date().getHours()), { name: firstName })}
        description={t("dashboard.description")}
        action={
          <>
            <Link href="/farms" className={buttonVariants({ variant: "secondary" })}>
              <Plus className="h-4 w-4" /> {t("dashboard.addFarm")}
            </Link>
            <Link href="/scan" className={buttonVariants()}>
              <Camera className="h-4 w-4" /> {t("dashboard.scanCrop")}
            </Link>
          </>
        }
      />

      {query.isLoading ? (
        <DashboardSkeleton />
      ) : query.isError || !query.data ? (
        <Alert variant="destructive">
          <p className="font-semibold">{t("dashboard.loadError")}</p>
          <p className="mt-0.5">{query.error?.message}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => query.refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      ) : query.data.stats.farms === 0 ? (
        <Onboarding />
      ) : (
        <DashboardContent data={query.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: Dashboard }) {
  const { t, number } = useI18n();
  const { stats } = data;
  const acres = data.fields.reduce((total, field) => total + field.areaAcres, 0);

  const tiles: Stat[] = [
    { label: t("dashboard.statFarms"), value: number(stats.farms), hint: t("dashboard.statFarmsHint"), icon: Sprout, tone: "navy" },
    { label: t("dashboard.statFields"), value: number(stats.fields), hint: t("dashboard.statFieldsHint", { acres: number(acres, 1) }), icon: MapPin, tone: "sun" },
    {
      label: t("dashboard.statNodes"),
      value: stats.devices ? t("dashboard.statNodesValue", { online: number(stats.devicesOnline), total: number(stats.devices) }) : "0",
      hint: stats.devices ? t("dashboard.statNodesHint") : t("nav.noNodes"),
      icon: RadioTower,
      tone: stats.devices && stats.devicesOnline === stats.devices ? "good" : "warning",
    },
    {
      label: t("dashboard.statHealth"),
      value: stats.avgCropHealth === null ? "–" : `${number(stats.avgCropHealth)}%`,
      hint: t("dashboard.statHealthHint"),
      icon: HeartPulse,
      tone: "good",
    },
    {
      label: t("dashboard.statAlerts"),
      value: number(stats.openAlerts),
      hint: t("dashboard.statAlertsHint"),
      icon: stats.openAlerts ? TriangleAlert : CircleCheck,
      tone: stats.openAlerts ? "critical" : "good",
    },
  ];

  return (
    <div className="space-y-6">
      <StatsGrid stats={tiles} className="sm:grid-cols-3 xl:grid-cols-5 max-sm:[&>:last-child]:col-span-2" />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <BriefingCard />
          <FieldStatusList fields={data.fields} />
          <HealthChart trend={data.healthTrend} />
        </div>
        <div className="min-w-0 space-y-6">
          <SensorCard sensor={data.sensor} />
          <WeatherCard weather={data.weather} />
        </div>
      </div>

      <ImpactStrip totals={data.impact.totals} />

      <PriorityRecommendations recommendations={data.recommendations} />
    </div>
  );
}

function DashboardSkeleton() {
  const { t } = useI18n();

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("common.loading")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
        <div className="h-[36rem] animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}
