"use client";

import { useState } from "react";
import { ChevronDown, LoaderCircle, Map as MapGlyph } from "lucide-react";
import { errorMessage, selectClass } from "@/components/field/field-ui";
import { useCropOptions } from "@/components/field/use-crop-options";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/i18n/provider";
import type { FieldInput } from "@/lib/api";
import type { Field, IrrigationMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { irrigationMethods } from "./farm-form-dialog";

interface FieldFormDialogProps {
  initial?: Field;
  farmMethod: IrrigationMethod;
  onSubmit: (values: FieldInput & { name: string; area: number }) => Promise<void>;
  onCancel: () => void;
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export function FieldFormDialog({ initial, farmMethod, onSubmit, onCancel }: FieldFormDialogProps) {
  const { t, tx, number } = useI18n();
  const soilsQuery = useCropOptions();
  const soils = soilsQuery.data?.soils ?? [];
  const [name, setName] = useState(initial?.name ?? "");
  const [area, setArea] = useState(text(initial?.area));
  const [soilType, setSoilType] = useState(initial?.soilType ?? "");
  const [method, setMethod] = useState<IrrigationMethod | "">(initial?.irrigationMethod ?? "");
  const [pumpFlow, setPumpFlow] = useState(text(initial?.pumpFlowLpm));
  const [pumpPower, setPumpPower] = useState(text(initial?.pumpPowerKw));
  const [solarPreferred, setSolarPreferred] = useState(initial?.solarPreferred ?? false);
  const [refillPoint, setRefillPoint] = useState(text(initial?.refillPoint));
  const [fieldCapacity, setFieldCapacity] = useState(text(initial?.fieldCapacity));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soil = soils.find((option) => option.name.toLowerCase() === soilType.trim().toLowerCase() || option.key === soilType.trim().toLowerCase());
  const hasBoundary = Boolean(initial?.boundary);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const refill = optionalNumber(refillPoint);
    const capacity = optionalNumber(fieldCapacity);
    if (refill !== null && capacity !== null && refill >= capacity) {
      setError(t("farms.refillBelowCapacity"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        area: Number(area),
        soilType: soilType.trim() || undefined,
        irrigationMethod: method === "" ? null : method,
        pumpFlowLpm: optionalNumber(pumpFlow),
        pumpPowerKw: optionalNumber(pumpPower),
        solarPreferred,
        refillPoint: refill,
        fieldCapacity: capacity,
      });
    } catch (requestError) {
      setError(errorMessage(requestError, t("farms.saveError")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={initial ? t("farms.editFieldTitle") : t("farms.addFieldTitle")} description={t("farms.fieldFormDescription")} onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <div className="-mx-6 max-h-[calc(100dvh-14rem)] space-y-5 overflow-y-auto px-6 pb-1">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="field-name">{t("farms.fieldName")}</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("farms.fieldNamePlaceholder")}
              minLength={2}
              maxLength={100}
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="field-area">{t("farms.area")}</Label>
              <Input
                id="field-area"
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="4.2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-soil">{t("farms.soilType")}</Label>
              {/* The value stays the English soil name the engine understands; the label is localized. */}
              <select id="field-soil" value={soilType} onChange={(event) => setSoilType(event.target.value)} className={selectClass}>
                <option value="">{t("common.select")}</option>
                {soilType && !soil ? <option value={soilType}>{soilType}</option> : null}
                {soils.map((option) => (
                  <option key={option.key} value={option.name}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 flex items-start gap-2 text-xs text-slate-500">
            <MapGlyph className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-600" />
            {hasBoundary ? t("farms.areaFromBoundary") : t("farms.areaHint")}
          </p>
          {soil ? (
            <p className="-mt-2 rounded-xl bg-navy-50/70 px-3 py-2 text-xs text-navy-900">
              {t("farms.soilDefaults", { soil: soil.label, capacity: number(soil.fieldCapacity), wilting: number(soil.wiltingPoint) })}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="field-method">{t("farms.fieldMethod")}</Label>
            <select id="field-method" className={selectClass} value={method} onChange={(event) => setMethod(event.target.value as IrrigationMethod | "")}>
              <option value="">{t("farms.useFarmMethod", { method: tx(`farms.method_${farmMethod}`) })}</option>
              {irrigationMethods.map((option) => (
                <option key={option} value={option}>
                  {tx(`farms.method_${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="field-flow">{t("farms.pumpFlow")}</Label>
              <Input
                id="field-flow"
                type="number"
                inputMode="decimal"
                step="any"
                min={1}
                max={10000}
                value={pumpFlow}
                onChange={(event) => setPumpFlow(event.target.value)}
                placeholder="300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="field-power">{t("farms.pumpPower")}</Label>
              <Input
                id="field-power"
                type="number"
                inputMode="decimal"
                step="any"
                min={0.1}
                max={100}
                value={pumpPower}
                onChange={(event) => setPumpPower(event.target.value)}
                placeholder="3.7"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-sun-300">
            <span>
              <span className="block text-sm font-medium text-slate-700">{t("farms.preferSolar")}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t("farms.preferSolarHint")}</span>
            </span>
            <input type="checkbox" className="peer sr-only" checked={solarPreferred} onChange={(event) => setSolarPreferred(event.target.checked)} />
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-sun-400 peer-focus-visible:ring-offset-2",
                solarPreferred ? "bg-sun-400" : "bg-slate-200"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform",
                  solarPreferred && "translate-x-5"
                )}
              />
            </span>
          </label>

          <details className="group rounded-xl border border-slate-200" open={Boolean(initial?.refillPoint || initial?.fieldCapacity)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
              {t("farms.advanced")}
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-slate-100 p-3.5">
              <p className="text-xs text-slate-500">{t("farms.advancedHint")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="field-refill" className="block text-xs">
                    {t("farms.refillPoint")}
                  </Label>
                  <Input
                    id="field-refill"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={1}
                    max={60}
                    value={refillPoint}
                    onChange={(event) => setRefillPoint(event.target.value)}
                    placeholder={t("farms.auto")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="field-capacity" className="block text-xs">
                    {t("farms.fieldCapacity")}
                  </Label>
                  <Input
                    id="field-capacity"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={5}
                    max={70}
                    value={fieldCapacity}
                    onChange={(event) => setFieldCapacity(event.target.value)}
                    placeholder={soil ? String(soil.fieldCapacity) : t("farms.auto")}
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("common.saving") : t("farms.saveField")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
