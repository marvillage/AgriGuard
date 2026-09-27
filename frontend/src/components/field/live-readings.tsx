"use client";

import type { ReactNode } from "react";
import { BatteryMedium, Droplet, Droplets, FlaskConical, Gauge, Power, Sun, Thermometer, ThermometerSun, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { timeAgo } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SectionTitle, levelKey, type BadgeVariant } from "./field-ui";

interface Tile {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  badge?: ReactNode;
  meter?: ReactNode;
  highlight?: boolean;
}

const nutrientVariants: Record<string, BadgeVariant> = { Low: "warning", Medium: "success", High: "navy" };

export function LiveReadings({ overview }: { overview: FieldOverview }) {
  const { t, tx, language, number } = useI18n();
  const { latest, water, risks } = overview;

  if (!latest) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">{t("field.noLive")}</CardContent>
      </Card>
    );
  }

  const tiles: Tile[] = [];
  const add = (key: string, value: number | null, build: (value: number) => Omit<Tile, "key">) => {
    if (value !== null) tiles.push({ key, ...build(value) });
  };
  const percent = t("field.unitPercent");
  const degrees = t("field.unitCelsius");
  const mgPerKg = t("field.unitMgKg");
  const nutrientBadge = (status: string | null) =>
    status ? <Badge variant={nutrientVariants[status] ?? "secondary"}>{t(levelKey(status))}</Badge> : null;

  add("moisture", latest.soilMoisture, (value) => ({
    icon: Droplets,
    label: t("field.soilMoisture"),
    value: number(value, 1),
    unit: percent,
    meter: <MoistureMeter moisture={value} water={water} />,
    highlight: true,
  }));
  add("soilTemp", latest.soilTemperature, (value) => ({ icon: ThermometerSun, label: t("field.soilTemperature"), value: number(value, 1), unit: degrees }));
  add("airTemp", latest.temperature, (value) => ({ icon: Thermometer, label: t("field.airTemperature"), value: number(value, 1), unit: degrees }));
  add("humidity", latest.humidity, (value) => ({ icon: Droplet, label: t("field.humidity"), value: number(value), unit: percent }));
  add("n", latest.nitrogen, (value) => ({ icon: FlaskConical, label: t("field.nitrogen"), value: number(value, 1), unit: mgPerKg, badge: nutrientBadge(risks.nutrients.N) }));
  add("p", latest.phosphorus, (value) => ({ icon: FlaskConical, label: t("field.phosphorus"), value: number(value, 1), unit: mgPerKg, badge: nutrientBadge(risks.nutrients.P) }));
  add("k", latest.potassium, (value) => ({ icon: FlaskConical, label: t("field.potassium"), value: number(value, 1), unit: mgPerKg, badge: nutrientBadge(risks.nutrients.K) }));
  add("tank", latest.tankLevel, (value) => ({
    icon: Gauge,
    label: t("field.tankLevel"),
    value: number(value),
    unit: percent,
    meter: <Meter value={value} tone={value < 25 ? "critical" : "navy"} label={t("field.tankLevel")} className="mt-3" />,
  }));
  add("solar", latest.solarW, (value) => ({ icon: Sun, label: t("field.solarPower"), value: number(value), unit: t("field.unitWatts") }));
  add("battery", latest.batteryPct, (value) => ({
    icon: BatteryMedium,
    label: t("field.battery"),
    value: number(value),
    unit: percent,
    meter: <Meter value={value} tone={value < 20 ? "critical" : "good"} label={t("field.battery")} className="mt-3" />,
  }));
  add("flow", latest.flowRateLpm, (value) => ({ icon: Droplets, label: t("field.flowRate"), value: number(value, 1), unit: t("field.unitLpm") }));
  if (latest.pumpOn !== null) {
    tiles.push({
      key: "pump",
      icon: Power,
      label: t("field.pump"),
      value: latest.pumpOn ? t("field.pumpOn") : t("field.pumpOff"),
      badge: latest.pumpOn ? <Badge variant="info">{t("common.live")}</Badge> : null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          title={t("field.liveTitle")}
          action={
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="secondary">{tx(`field.source_${latest.source}`)}</Badge>
              {timeAgo(latest.observedAt, language)}
            </p>
          }
        />
        {latest.source === "OPEN_METEO" ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("field.modelDataNote")}</p> : null}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 xl:grid-cols-4">
        {tiles.map(({ key, icon: Icon, label, value, unit, badge, meter, highlight }) => (
          <div
            key={key}
            className={cn(
              "min-w-0 rounded-xl border p-3.5 transition-colors",
              highlight ? "col-span-2 border-sun-300/70 bg-sun-50/60 sm:col-span-1" : "border-slate-200/80 bg-slate-50/50 hover:border-navy-200 hover:bg-white"
            )}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Icon className="h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-xl font-semibold text-ink tabular-nums">
                {value}
                {unit ? <span className="ml-0.5 text-sm font-medium text-slate-500">{unit}</span> : null}
              </p>
              {badge}
            </div>
            {meter}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MoistureMeter({ moisture, water }: { moisture: number; water: FieldOverview["water"] }) {
  const { t, number } = useI18n();
  const span = Math.max(1, water.fieldCapacity - water.wiltingPoint);
  const position = ((moisture - water.wiltingPoint) / span) * 100;
  const refill = Math.max(0, Math.min(100, ((water.refillPoint - water.wiltingPoint) / span) * 100));
  const tone = moisture < water.wiltingPoint + span * 0.15 ? "critical" : moisture < water.refillPoint ? "warning" : "good";

  return (
    <div className="mt-3">
      <div className="relative">
        <Meter value={position} tone={tone} label={t("field.soilMoisture")} />
        <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" style={{ left: `${refill}%` }} aria-hidden="true" />
      </div>
      <p className="mt-2 text-[11px] text-slate-500 tabular-nums">
        {t("field.moistureRange", { refill: number(water.refillPoint, 1), capacity: number(water.fieldCapacity, 1) })}
      </p>
    </div>
  );
}
