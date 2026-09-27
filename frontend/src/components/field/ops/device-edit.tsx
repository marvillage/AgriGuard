"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Device } from "@/lib/types";
import { errorText, FieldGroup, parseNumber, Switch, useRefreshField } from "./shared";

type Capability = "hasFlowMeter" | "hasEnergyMeter" | "hasTankSensor" | "hasSolar";

export function DeviceEditDialog({ device, onClose }: { device: Device; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const refresh = useRefreshField(device.fieldId);
  const [name, setName] = useState(device.name);
  const [tankHeight, setTankHeight] = useState(device.tankHeightCm === null ? "" : String(device.tankHeightCm));
  const [tankCapacity, setTankCapacity] = useState(device.tankCapacityL === null ? "" : String(device.tankCapacityL));
  const [dryRun, setDryRun] = useState(String(device.dryRunLevelPct));
  const [capabilities, setCapabilities] = useState<Record<Capability, boolean>>({
    hasFlowMeter: device.hasFlowMeter,
    hasEnergyMeter: device.hasEnergyMeter,
    hasTankSensor: device.hasTankSensor,
    hasSolar: device.hasSolar,
  });

  const save = useMutation({
    mutationFn: () =>
      api.updateDevice(device.id, {
        name: name.trim(),
        tankHeightCm: parseNumber(tankHeight),
        tankCapacityL: parseNumber(tankCapacity),
        dryRunLevelPct: parseNumber(dryRun) ?? device.dryRunLevelPct,
        ...capabilities,
      }),
    onSuccess: async () => {
      toast({ tone: "success", title: t("fieldOps.deviceSaved") });
      onClose();
      await refresh();
    },
  });

  const dryRunValue = parseNumber(dryRun);
  const valid =
    name.trim().length >= 2 &&
    (tankHeight === "" || (parseNumber(tankHeight) ?? 0) > 0) &&
    (tankCapacity === "" || (parseNumber(tankCapacity) ?? 0) > 0) &&
    dryRunValue !== null &&
    dryRunValue >= 0 &&
    dryRunValue <= 90;

  const capabilityRows: Array<{ key: Capability; label: string }> = [
    { key: "hasFlowMeter", label: t("fieldOps.capFlow") },
    { key: "hasEnergyMeter", label: t("fieldOps.capEnergy") },
    { key: "hasTankSensor", label: t("fieldOps.capTank") },
    { key: "hasSolar", label: t("fieldOps.capSolar") },
  ];

  return (
    <Modal title={t("fieldOps.editTitle")} description={device.name} onClose={onClose}>
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <FieldGroup label={t("fieldOps.deviceName")} htmlFor="edit-device-name">
          <Input id="edit-device-name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label={t("fieldOps.tankHeight")} htmlFor="edit-tank-height">
            <Input id="edit-tank-height" type="number" inputMode="decimal" min={1} step="any" value={tankHeight} onChange={(event) => setTankHeight(event.target.value)} />
          </FieldGroup>
          <FieldGroup label={t("fieldOps.tankCapacity")} htmlFor="edit-tank-capacity">
            <Input id="edit-tank-capacity" type="number" inputMode="decimal" min={1} step="any" value={tankCapacity} onChange={(event) => setTankCapacity(event.target.value)} />
          </FieldGroup>
        </div>
        <FieldGroup label={t("fieldOps.dryRun")} htmlFor="edit-dry-run" hint={t("fieldOps.dryRunHint")}>
          <Input id="edit-dry-run" type="number" inputMode="numeric" min={0} max={90} required value={dryRun} onChange={(event) => setDryRun(event.target.value)} />
        </FieldGroup>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">{t("fieldOps.capabilities")}</legend>
          <p className="text-xs text-slate-500">{t("fieldOps.capabilitiesHint")}</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {capabilityRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm text-ink">{row.label}</span>
                <Switch
                  checked={capabilities[row.key]}
                  label={row.label}
                  onChange={(checked) => setCapabilities((current) => ({ ...current, [row.key]: checked }))}
                />
              </li>
            ))}
          </ul>
        </fieldset>

        {save.isError ? <Alert variant="destructive">{errorText(save.error, t("common.error"))}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!valid || save.isPending}>
            {save.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {save.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
