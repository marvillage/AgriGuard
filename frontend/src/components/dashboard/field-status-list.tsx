"use client";

import Link from "next/link";
import { Activity, ArrowRight, Clock, HeartPulse, Plus, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { formatNumber, timeAgo } from "@/lib/format";
import type { DashboardField, Device, Language } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoistureBar } from "./moisture-bar";
import { healthStatus, healthStyle } from "./risk-level";

function minutesAgo(minutes: number, language: Language) {
  return timeAgo(new Date(Date.now() - minutes * 60_000).toISOString(), language);
}

export function FieldStatusList({ fields }: { fields: DashboardField[] }) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-0 sm:p-6 sm:pb-0">
        <div>
          <CardTitle>{t("dashboard.fieldsTitle")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t("dashboard.fieldsDescription")}</p>
        </div>
        <Link
          href="/farms"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
        >
          {t("dashboard.manageFarms")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6">
        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <Sprout className="mx-auto h-6 w-6 text-sun-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500">{t("dashboard.noFields")}</p>
            <Link href="/farms" className={buttonVariants({ size: "sm", className: "mt-4" })}>
              <Plus className="h-4 w-4" /> {t("dashboard.addField")}
            </Link>
          </div>
        ) : (
          fields.map((field) => <FieldRow key={field.id} field={field} />)
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ field }: { field: DashboardField }) {
  const { t, language } = useI18n();
  const cropLine = field.crop
    ? [field.crop.name, field.crop.stage, field.crop.day !== null ? t("dashboard.dayN", { day: field.crop.day }) : null]
        .filter(Boolean)
        .join(" · ")
    : t("dashboard.noCrop");

  return (
    <Link
      href={`/fields/${field.id}`}
      className="group block rounded-2xl border border-slate-200/80 p-4 transition-all duration-300 hover:border-sun-300 hover:bg-sun-50/40 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink transition-colors group-hover:text-navy-800">{field.name}</p>
          <p className="truncate text-xs text-slate-500">
            {field.farmName} · {formatNumber(field.areaAcres, 1, language)} {t("common.acres")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HealthBadge score={field.cropHealth} />
          <ArrowRight
            className="hidden h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-sun-600 sm:block"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-center sm:gap-6">
        <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
          <Sprout className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="truncate">{cropLine}</span>
        </p>
        <MoistureBar moisture={field.moisture} refillPoint={field.refillPoint} />
      </div>

      {field.action ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 transition-colors group-hover:bg-white">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" aria-hidden="true" />
          <span className="min-w-0">{field.action.message}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
        <NodeStatus device={field.device} />
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {field.minutesSinceReading === null
            ? t("dashboard.noReading")
            : t("dashboard.readingAgo", { time: minutesAgo(field.minutesSinceReading, language) })}
        </span>
      </div>
    </Link>
  );
}

function HealthBadge({ score }: { score: number | null }) {
  const { t, number } = useI18n();
  const status = healthStatus(score);
  if (score === null || !status) {
    return (
      <Badge variant="secondary">
        <HeartPulse className="h-3 w-3" aria-hidden="true" />
        {t("dashboard.healthUnknown")}
      </Badge>
    );
  }
  const style = healthStyle[status];
  const Icon = style.icon;

  return (
    <Badge variant={style.badge} title={t(style.label)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t("dashboard.healthValue", { value: number(score) })}
      <span className="sr-only"> · {t(style.label)}</span>
    </Badge>
  );
}

function NodeStatus({ device }: { device: Device | null }) {
  const { t } = useI18n();
  if (!device) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <span className="h-2 w-2 rounded-full border border-slate-300" aria-hidden="true" />
        {t("dashboard.noNode")}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        {device.online ? <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" /> : null}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", device.online ? "bg-emerald-500" : "bg-slate-400")} />
      </span>
      <span className="truncate">
        {device.name} · {device.online ? t("common.online") : t("common.offlineShort")}
      </span>
    </span>
  );
}
