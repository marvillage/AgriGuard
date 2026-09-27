"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Cpu, Plus, Radio, Router, ToggleRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Device, FieldOverview } from "@/lib/types";
import { DeviceCard } from "./ops/device-card";
import { DeviceSetup, type SetupKind } from "./ops/device-setup";
import { RegisterDeviceForm } from "./ops/register-device";
import { EmptyState, opsKeys } from "./ops/shared";

export function DevicesTab({ overview }: { overview: FieldOverview }) {
  const { t, number } = useI18n();
  const fieldId = overview.field.id;
  const canEdit = overview.access !== "advisor";
  const [registering, setRegistering] = useState(false);
  const [setup, setSetup] = useState<{ device: Device; kind: SetupKind } | null>(null);
  const setupRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: opsKeys.devices(fieldId),
    queryFn: async () => (await api.fieldDevices(fieldId)).devices,
    placeholderData: overview.devices,
  });
  const devices = query.data ?? [];
  const online = devices.filter((device) => device.online).length;

  useEffect(() => {
    if (setup) setupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [setup]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{t("fieldOps.devicesTitle")}</h2>
          <p className="text-sm text-slate-500">
            {devices.length
              ? t("fieldOps.devicesSummary", { online: number(online), total: number(devices.length) })
              : t("fieldOps.devicesSubtitle")}
          </p>
        </div>
        {canEdit && !registering ? (
          <Button type="button" onClick={() => setRegistering(true)}>
            <Plus className="h-4 w-4" />
            {t("fieldOps.registerOpen")}
          </Button>
        ) : null}
      </div>

      {!canEdit ? <Alert variant="info">{t("fieldOps.readOnlyDevices")}</Alert> : null}

      {setup ? (
        <div ref={setupRef} className="scroll-mt-24">
          <DeviceSetup device={setup.device} kind={setup.kind} onClose={() => setSetup(null)} />
        </div>
      ) : null}

      {registering ? (
        <RegisterDeviceForm
          overview={overview}
          onCancel={() => setRegistering(false)}
          onRegistered={(device) => {
            setRegistering(false);
            setSetup({ device, kind: "new" });
          }}
        />
      ) : null}

      {devices.length === 0 && !registering ? (
        <Card>
          <CardContent>
            <EmptyState icon={Cpu} title={t("fieldOps.devicesEmpty")}>
              {t("fieldOps.devicesEmptyBody")}
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              canEdit={canEdit}
              moisture={overview.latest?.soilMoisture ?? null}
              onShowKey={(full, kind) => setSetup({ device: full, kind })}
            />
          ))}
        </div>
      )}

      <PipelineCard />
    </div>
  );
}

function PipelineCard() {
  const { t } = useI18n();
  const steps = [
    { icon: Radio, title: t("fieldOps.pipeSense"), body: t("fieldOps.pipeSenseBody") },
    { icon: Router, title: t("fieldOps.pipeReport"), body: t("fieldOps.pipeReportBody") },
    { icon: ToggleRight, title: t("fieldOps.pipeAct"), body: t("fieldOps.pipeActBody") },
  ];

  return (
    <Card className="bg-navy-950 text-white">
      <CardHeader>
        <CardTitle className="text-white">{t("fieldOps.pipeTitle")}</CardTitle>
        <p className="text-sm text-slate-300">{t("fieldOps.pipeSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="contents">
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-400 text-ink">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{step.body}</p>
                </div>
                {index < steps.length - 1 ? (
                  <span className="hidden items-center justify-center text-sun-300 md:flex" aria-hidden="true">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
