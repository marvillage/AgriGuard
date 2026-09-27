"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BatteryMedium,
  CirclePause,
  Clock,
  Cylinder,
  Droplet,
  Power,
  RadioTower,
  Sun,
  Thermometer,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { timeAgo } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoistureBar } from "./moisture-bar";
import { MoistureChart } from "./moisture-chart";

type Sensor = NonNullable<Dashboard["sensor"]>;

export function SensorCard({ sensor }: { sensor: Dashboard["sensor"] }) {
  const { t } = useI18n();

  if (!sensor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.sensorTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <RadioTower className="mx-auto h-6 w-6 text-sun-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500">{t("dashboard.sensorEmpty")}</p>
            <Link href="/farms" className={buttonVariants({ size: "sm", variant: "secondary", className: "mt-4" })}>
              {t("dashboard.manageFarms")}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <LiveSensor sensor={sensor} />;
}

function LiveSensor({ sensor }: { sensor: Sensor }) {
  const { t, language, number } = useI18n();
  const { latest, device, action } = sensor;
  const online = device?.online ?? false;
  const pumpOn = latest?.pumpOn ?? device?.pumpOn ?? null;
  const battery = latest?.batteryPct ?? device?.batteryPct ?? null;
  const rssi = latest?.rssi ?? device?.rssi ?? null;

  const readings: Array<{ icon: LucideIcon; label: string; value: number | null | undefined; format: (value: number) => string }> = [
    { icon: Thermometer, label: t("dashboard.airTemp"), value: latest?.temperature, format: (value) => `${number(value, 1)}°C` },
    { icon: Droplet, label: t("dashboard.humidity"), value: latest?.humidity, format: (value) => `${number(value)}%` },
    { icon: Thermometer, label: t("dashboard.soilTemp"), value: latest?.soilTemperature, format: (value) => `${number(value, 1)}°C` },
    { icon: Cylinder, label: t("dashboard.tank"), value: latest?.tankLevel, format: (value) => `${number(value)}%` },
    { icon: Sun, label: t("dashboard.solar"), value: latest?.solarW, format: (value) => `${number(value)} W` },
    { icon: BatteryMedium, label: t("dashboard.battery"), value: battery, format: (value) => `${number(value)}%` },
  ];
  const visible = readings.flatMap(({ icon, label, value, format }) =>
    value === null || value === undefined ? [] : [{ icon, label, text: format(value) }]
  );
  const npk = [
    { key: "N", value: latest?.nitrogen ?? null },
    { key: "P", value: latest?.phosphorus ?? null },
    { key: "K", value: latest?.potassium ?? null },
  ];
  const hasNpk = npk.some((item) => item.value !== null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{device ? t("dashboard.sensorTitle") : t("dashboard.latestReadings")}</CardTitle>
          <Link
            href={`/fields/${sensor.fieldId}`}
            className="mt-1 inline-flex max-w-full items-center gap-1 text-sm text-slate-500 transition-colors hover:text-navy-700"
          >
            <span className="truncate">
              {device ? `${device.name} · ${sensor.fieldName}` : latest?.source === "OPEN_METEO" ? `${t("dashboard.modelSource")} · ${sensor.fieldName}` : sensor.fieldName}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </div>
        {device ? (
          <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold", online ? "text-emerald-700" : "text-slate-500")}>
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              {online ? <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" /> : null}
              <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", online ? "bg-emerald-500" : "bg-slate-400")} />
            </span>
            {online ? t("common.online") : t("common.offlineShort")}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <MoistureBar moisture={latest?.soilMoisture ?? null} refillPoint={sensor.refillPoint} size="lg" />
          <div className="mt-4">
            <MoistureChart series={sensor.series} refillPoint={sensor.refillPoint} />
          </div>
        </div>

        {visible.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map(({ icon: Icon, label, text }) => (
              <div key={label} className="min-w-0 rounded-xl border border-slate-200/80 px-3 py-2.5 transition-colors hover:border-navy-200">
                <p className="flex items-start gap-1 text-[11px] leading-tight text-slate-500">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{label}</span>
                </p>
                <p className="mt-1 font-semibold text-ink tabular-nums">{text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {hasNpk ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{t("dashboard.npk")}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {npk.map(({ key, value }) => (
                <div key={key} className="rounded-xl bg-slate-50 px-2 py-2.5">
                  <p className="font-display text-lg font-bold text-ink tabular-nums">{value === null ? "–" : number(value)}</p>
                  <p className="text-[11px] text-slate-500">{key}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {pumpOn !== null || action ? (
          <div className={cn("rounded-2xl p-4", pumpOn ? "bg-sun-400 text-ink" : "bg-navy-50 text-navy-950")}>
            {pumpOn !== null ? (
              <p className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
                {pumpOn ? <Power className="h-4 w-4" aria-hidden="true" /> : <CirclePause className="h-4 w-4" aria-hidden="true" />}
                {pumpOn ? t("dashboard.pumpOn") : t("dashboard.pumpOff")}
                {device ? <span className="font-semibold normal-case opacity-70">· {t(`dashboard.pumpMode_${device.pumpMode}`)}</span> : null}
              </p>
            ) : null}
            {action ? (
              <>
                <p className="mt-1.5 text-sm font-medium">{action.message}</p>
                <p className="mt-1 text-[11px] opacity-70">{t("dashboard.decidedAgo", { time: timeAgo(action.at, language) })}</p>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {latest ? t("dashboard.updatedAgo", { time: timeAgo(latest.observedAt, language) }) : t("dashboard.noReading")}
          </span>
          {rssi !== null ? (
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              {t("dashboard.signal", { value: number(rssi) })}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
