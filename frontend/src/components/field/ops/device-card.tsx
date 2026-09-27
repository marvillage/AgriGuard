"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BatteryMedium,
  Cpu,
  Cylinder,
  Eye,
  Gauge,
  LoaderCircle,
  Pencil,
  RotateCw,
  Send,
  Signal,
  Smartphone,
  Sun,
  Trash,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Device } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DeviceEditDialog } from "./device-edit";
import type { SetupKind } from "./device-setup";
import { errorText, useCodeLabel, useRefreshField } from "./shared";
import { TestReading } from "./test-reading";

function signalLevel(rssi: number) {
  if (rssi >= -60) return "Strong";
  if (rssi >= -70) return "Good";
  if (rssi >= -80) return "Fair";
  return "Weak";
}

export function DeviceCard({
  device,
  canEdit,
  moisture,
  onShowKey,
}: {
  device: Device;
  canEdit: boolean;
  moisture: number | null;
  onShowKey: (device: Device, kind: SetupKind) => void;
}) {
  const { t, number, language } = useI18n();
  const toast = useToast();
  const codeLabel = useCodeLabel();
  const refresh = useRefreshField(device.fieldId);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"rotate" | "delete" | null>(null);
  const [testing, setTesting] = useState(false);

  const reveal = useMutation({
    mutationFn: () => api.deviceKey(device.id),
    onSuccess: ({ device: full }) => onShowKey(full, "revealed"),
    onError: (error) => toast({ tone: "critical", title: t("fieldOps.keyFailed"), body: errorText(error, t("common.error")) }),
  });

  const capabilities = [
    { on: device.hasFlowMeter, label: t("fieldOps.capFlow"), icon: Gauge },
    { on: device.hasEnergyMeter, label: t("fieldOps.capEnergy"), icon: Zap },
    { on: device.hasTankSensor, label: t("fieldOps.capTank"), icon: Cylinder },
    { on: device.hasSolar, label: t("fieldOps.capSolar"), icon: Sun },
  ];

  return (
    <Card className="transition-shadow duration-200 hover:shadow-lift">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              device.online ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
            )}
          >
            {device.kind === "PHONE" ? <Smartphone className="h-5 w-5" aria-hidden="true" /> : <Cpu className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-base font-semibold text-ink">{device.name}</h3>
              <Badge variant={device.online ? "success" : "secondary"}>
                <span className={cn("h-1.5 w-1.5 rounded-full", device.online ? "bg-emerald-500" : "bg-slate-400")} />
                {device.online ? t("common.online") : t("common.offlineShort")}
              </Badge>
              {device.simulated ? <Badge variant="info">{t("fieldOps.simulated")}</Badge> : null}
              {device.kind === "PHONE" ? <Badge variant="navy">{t("fieldOps.phoneBadge")}</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {device.lastSeenAt ? t("fieldOps.lastSeen", { ago: timeAgo(device.lastSeenAt, language) }) : t("fieldOps.neverSeen")}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label={t("fieldOps.firmware")} value={device.firmware ?? "–"} />
          <Fact
            label={t("fieldOps.battery")}
            value={device.batteryPct === null ? "–" : `${number(device.batteryPct)}%`}
            icon={<BatteryMedium className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <Fact
            label={t("fieldOps.signal")}
            value={device.rssi === null ? "–" : t("fieldOps.rssiValue", { rssi: number(device.rssi), level: codeLabel("signal", signalLevel(device.rssi)) })}
            icon={<Signal className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <Fact label={t("fieldOps.pumpMode")} value={codeLabel("mode", device.pumpMode)} />
        </dl>

        {device.kind !== "PHONE" ? (
          <>
            <div className="flex flex-wrap gap-1.5" aria-label={t("fieldOps.capabilities")}>
              {capabilities.map((capability) => {
                const Icon = capability.icon;
                return (
                  <span
                    key={capability.label}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                      capability.on ? "bg-navy-50 text-navy-800 ring-navy-200" : "bg-white text-slate-400 ring-slate-200"
                    )}
                    title={capability.on ? t("fieldOps.capOn") : t("fieldOps.capOff")}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {capability.label}
                    <span className="sr-only">{capability.on ? t("fieldOps.capOn") : t("fieldOps.capOff")}</span>
                  </span>
                );
              })}
            </div>

            <p className="text-xs text-slate-500">
              {device.tankHeightCm || device.tankCapacityL
                ? t("fieldOps.tankConfig", {
                    height: device.tankHeightCm ? number(device.tankHeightCm) : "–",
                    capacity: device.tankCapacityL ? number(device.tankCapacityL) : "–",
                    limit: number(device.dryRunLevelPct),
                  })
                : t("fieldOps.tankConfigNone", { limit: number(device.dryRunLevelPct) })}
            </p>
          </>
        ) : null}

        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">{t("fieldOps.deviceKey")}</span>
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{device.deviceKey}</code>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => reveal.mutate()} disabled={reveal.isPending}>
              {reveal.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {t("fieldOps.revealKey")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirm("rotate")}>
              <RotateCw className="h-3.5 w-3.5" />
              {t("fieldOps.rotateKey")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
            {device.kind !== "PHONE" ? (
              <Button type="button" size="sm" variant={testing ? "dark" : "secondary"} onClick={() => setTesting((value) => !value)} aria-expanded={testing}>
                <Send className="h-3.5 w-3.5" />
                {t("fieldOps.testOpen")}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm("delete")}>
              <Trash className="h-3.5 w-3.5" />
              {t("common.delete")}
            </Button>
          </div>
        ) : null}

        {canEdit && testing ? <TestReading device={device} initialMoisture={moisture} /> : null}
      </CardContent>

      {editing ? <DeviceEditDialog device={device} onClose={() => setEditing(false)} /> : null}

      {confirm === "rotate" ? (
        <ConfirmDialog
          title={t("fieldOps.rotateTitle")}
          description={t("fieldOps.rotateBody", { name: device.name })}
          confirmLabel={t("fieldOps.rotateKey")}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              const { device: rotated } = await api.rotateDeviceKey(device.id);
              setConfirm(null);
              toast({ tone: "warning", title: t("fieldOps.rotated") });
              onShowKey(rotated, "rotated");
              await refresh();
            } catch (error) {
              toast({ tone: "critical", title: t("fieldOps.keyFailed"), body: errorText(error, t("common.error")) });
            }
          }}
        />
      ) : null}

      {confirm === "delete" ? (
        <ConfirmDialog
          title={t("fieldOps.deleteTitle")}
          description={t("fieldOps.deleteBody", { name: device.name })}
          confirmLabel={t("common.delete")}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await api.deleteDevice(device.id);
              setConfirm(null);
              toast({ tone: "success", title: t("fieldOps.deleted", { name: device.name }) });
              await refresh();
            } catch (error) {
              toast({ tone: "critical", title: t("common.error"), body: errorText(error, t("common.error")) });
            }
          }}
        />
      ) : null}
    </Card>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <dt className="flex items-center gap-1 text-[11px] text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-semibold break-words text-ink">{value}</dd>
    </div>
  );
}
