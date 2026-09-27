"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Satellite } from "lucide-react";
import { AiExplain } from "@/components/ai/ai-explain";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { NdviSnapshot } from "@/lib/types";
import { SectionTitle, formatFixed, selectClass } from "./field-ui";

export const ndviStops = [
  { value: "≤0", color: "#a50026" },
  { value: "0.2", color: "#f46d43" },
  { value: "0.4", color: "#fee08b" },
  { value: "0.6", color: "#a6d96a" },
  { value: "≥0.8", color: "#1a9850" },
];

const zoneStyles = {
  low: { color: "#f46d43", label: "field.zoneLow" },
  medium: { color: "#fee08b", label: "field.zoneMedium" },
  high: { color: "#1a9850", label: "field.zoneHigh" },
} as const;

export interface NdviPanelProps {
  snapshots: NdviSnapshot[];
  loading: boolean;
  selected: NdviSnapshot | null;
  onSelect: (id: number) => void;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  refreshing: boolean;
  refreshError: string | null;
  approximate: boolean;
  onRefresh: () => void;
}

export function NdviPanel({
  snapshots,
  loading,
  selected,
  onSelect,
  visible,
  onVisibleChange,
  opacity,
  onOpacityChange,
  refreshing,
  refreshError,
  approximate,
  onRefresh,
}: NdviPanelProps) {
  const { t, language, number } = useI18n();
  const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<Satellite className="h-4 w-4 text-navy-700" />} title={t("field.ndviTitle")} />
        <p className="text-sm text-slate-500">{t("field.ndviIntro")}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <Button type="button" variant="dark" className="w-full" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {refreshing ? t("field.ndviRefreshing") : t("field.ndviRefresh")}
        </Button>
        {refreshing ? <RefreshProgress /> : null}
        {refreshError ? <Alert variant="destructive">{refreshError}</Alert> : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : !selected ? (
          <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{t("field.ndviEmpty")}</p>
        ) : (
          <>
            {snapshots.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor="ndvi-scene" className="block text-xs">
                  {t("field.ndviScene")}
                </Label>
                <select id="ndvi-scene" className={selectClass} value={selected.id} onChange={(event) => onSelect(Number(event.target.value))}>
                  {snapshots.map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {t("field.ndviSceneOption", { date: formatDate(snapshot.sceneDate, language, dateOptions), ndvi: formatFixed(snapshot.meanNdvi, 2, language) })}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex items-end justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{t("field.ndviMean")}</p>
                <p className="font-display text-3xl font-bold text-ink tabular-nums">{formatFixed(selected.meanNdvi, 2, language)}</p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {t("field.ndviRange", { min: formatFixed(selected.minNdvi, 2, language), max: formatFixed(selected.maxNdvi, 2, language) })}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-semibold text-ink">{formatDate(selected.sceneDate, language, dateOptions)}</p>
                <p className="tabular-nums">{t("field.ndviCloud", { value: number(selected.cloudCover) })}</p>
                <p className="tabular-nums">{t("field.ndviValid", { value: number(selected.validPixelRatio * 100) })}</p>
              </div>
            </div>
            {approximate ? <Alert variant="info">{t("field.ndviApproximate")}</Alert> : null}
            <AiExplain
              id={[selected.fieldId, "ndvi", selected.id]}
              load={async () => (await api.explainField(selected.fieldId, "ndvi", { snapshotId: selected.id })).explanation}
            />

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">{t("field.ndviZones")}</p>
              <ul className="space-y-2.5">
                {(Object.keys(zoneStyles) as Array<keyof typeof zoneStyles>).map((zone) => {
                  const share = Math.round((selected.zones[zone] ?? 0) * 100);
                  return (
                    <li key={zone}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{t(zoneStyles[zone].label)}</span>
                        <span className="font-semibold text-ink tabular-nums">{t("field.percent", { value: number(share) })}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full ring-1 ring-black/5 ring-inset transition-[width] duration-700"
                          style={{ width: `${share}%`, backgroundColor: zoneStyles[zone].color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-700">
                {t("field.ndviOverlay")}
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-sun-500"
                  checked={visible}
                  onChange={(event) => onVisibleChange(event.target.checked)}
                />
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <label htmlFor="ndvi-opacity">{t("field.ndviOpacity")}</label>
                  <span className="tabular-nums">{t("field.percent", { value: number(opacity) })}</span>
                </div>
                <input
                  id="ndvi-opacity"
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={opacity}
                  disabled={!visible}
                  onChange={(event) => onOpacityChange(Number(event.target.value))}
                  className="w-full cursor-pointer accent-sun-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <NdviLegend />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function NdviLegend() {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{t("field.ndviLegend")}</p>
      <div
        className="h-2.5 rounded-full"
        style={{ background: `linear-gradient(to right, ${ndviStops.map((stop) => stop.color).join(", ")})` }}
        aria-hidden="true"
      />
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
        {ndviStops.map((stop) => (
          <span key={stop.value}>{stop.value}</span>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-slate-400">
        <span>{t("field.ndviBare")}</span>
        <span>{t("field.ndviDense")}</span>
      </div>
    </div>
  );
}

function RefreshProgress() {
  const { t, number } = useI18n();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-navy-100 bg-navy-50/70 p-3.5" role="status">
      <div className="flex items-center justify-between gap-3 text-xs text-navy-900">
        <span>{t("field.ndviProgress")}</span>
        <Badge variant="navy" className="shrink-0 whitespace-nowrap tabular-nums">
          {t("field.seconds", { value: number(seconds) })}
        </Badge>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
        <div className="h-full rounded-full bg-navy-700 transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(95, (seconds / 20) * 100)}%` }} />
      </div>
    </div>
  );
}
