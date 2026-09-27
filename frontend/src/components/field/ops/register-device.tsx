"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Cpu, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Device, FieldOverview } from "@/lib/types";
import { errorText, FieldGroup, parseNumber, useRefreshField } from "./shared";

export function RegisterDeviceForm({
  overview,
  onRegistered,
  onCancel,
}: {
  overview: FieldOverview;
  onRegistered: (device: Device) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const fieldId = overview.field.id;
  const refresh = useRefreshField(fieldId);
  const [name, setName] = useState(t("fieldOps.registerDefaultName", { field: overview.field.name }));
  const [tankHeight, setTankHeight] = useState("");
  const [tankCapacity, setTankCapacity] = useState("");
  const [dryRun, setDryRun] = useState("15");
  const [simulated, setSimulated] = useState(false);

  const register = useMutation({
    mutationFn: () =>
      api.registerDevice(fieldId, {
        name: name.trim(),
        simulated,
        tankHeightCm: parseNumber(tankHeight) ?? undefined,
        tankCapacityL: parseNumber(tankCapacity) ?? undefined,
        dryRunLevelPct: parseNumber(dryRun) ?? undefined,
      }),
    onSuccess: async ({ device }) => {
      onRegistered(device);
      await refresh();
    },
  });

  const dryRunValue = parseNumber(dryRun);
  const valid =
    name.trim().length >= 2 &&
    (tankHeight === "" || (parseNumber(tankHeight) ?? 0) > 0) &&
    (tankCapacity === "" || (parseNumber(tankCapacity) ?? 0) > 0) &&
    (dryRun === "" || (dryRunValue !== null && dryRunValue >= 0 && dryRunValue <= 90));

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-navy-700" aria-hidden="true" />
          {t("fieldOps.registerTitle")}
        </CardTitle>
        <p className="text-sm text-slate-500">{t("fieldOps.registerSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) register.mutate();
          }}
        >
          <FieldGroup label={t("fieldOps.deviceName")} htmlFor="device-name">
            <Input id="device-name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </FieldGroup>
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldGroup label={t("fieldOps.tankHeight")} htmlFor="device-tank-height" hint={t("fieldOps.tankHeightHint")}>
              <Input
                id="device-tank-height"
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                placeholder={t("common.optional")}
                value={tankHeight}
                onChange={(event) => setTankHeight(event.target.value)}
              />
            </FieldGroup>
            <FieldGroup label={t("fieldOps.tankCapacity")} htmlFor="device-tank-capacity">
              <Input
                id="device-tank-capacity"
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                placeholder={t("common.optional")}
                value={tankCapacity}
                onChange={(event) => setTankCapacity(event.target.value)}
              />
            </FieldGroup>
            <FieldGroup label={t("fieldOps.dryRun")} htmlFor="device-dry-run" hint={t("fieldOps.dryRunHint")}>
              <Input
                id="device-dry-run"
                type="number"
                inputMode="numeric"
                min={0}
                max={90}
                value={dryRun}
                onChange={(event) => setDryRun(event.target.value)}
              />
            </FieldGroup>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300">
            <input
              type="checkbox"
              checked={simulated}
              onChange={(event) => setSimulated(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-navy-800"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{t("fieldOps.simulatedNode")}</span>
              <span className="block text-xs text-slate-500">{t("fieldOps.simulatedNodeHint")}</span>
            </span>
          </label>

          {register.isError ? <Alert variant="destructive">{errorText(register.error, t("common.error"))}</Alert> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!valid || register.isPending}>
              {register.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              {t("fieldOps.registerSubmit")}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
