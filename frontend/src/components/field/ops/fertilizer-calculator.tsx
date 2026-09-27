"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator, Camera, Cpu, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api, ApiRequestError } from "@/lib/api";
import type { CropOption, FertilizerPlanPreview, FieldOverview, SoilCard } from "@/lib/types";
import { FertilizerResult } from "./fertilizer-result";
import { errorText, FieldGroup, opsKeys, parseNumber, selectClass } from "./shared";

type SoilKey = "n" | "p" | "k" | "ph" | "oc";
type SoilBody = { n: number; p: number; k: number; ph?: number | null; organicCarbon?: number | null };
type PreviewBody = { cropKey?: string; source?: string; soil?: SoilBody };

const limits: Record<SoilKey, [number, number]> = { n: [0, 3000], p: [0, 1000], k: [0, 3000], ph: [0, 14], oc: [0, 10] };
const emptySoil: Record<SoilKey, string> = { n: "", p: "", k: "", ph: "", oc: "" };

function inRange(key: SoilKey, value: string, required: boolean) {
  if (value.trim() === "") return !required;
  const parsed = parseNumber(value);
  return parsed !== null && parsed >= limits[key][0] && parsed <= limits[key][1];
}

export function FertilizerCalculator({ overview, crops, canSave }: { overview: FieldOverview; crops: CropOption[]; canSave: boolean }) {
  const { t, number } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fieldId = overview.field.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropKey, setCropKey] = useState(overview.crop?.cropType ?? "");
  const [soil, setSoil] = useState(emptySoil);
  const [card, setCard] = useState<SoilCard | null>(null);
  const [cardError, setCardError] = useState<{ needsAi: boolean; message: string } | null>(null);
  const [result, setResult] = useState<{ plan: FertilizerPlanPreview; body: PreviewBody; saved: boolean } | null>(null);

  const knownCrop = crops.some((crop) => crop.key === cropKey);
  const selectedCrop = knownCrop ? cropKey : "";

  const preview = useMutation({
    mutationFn: async (body: PreviewBody) => ({ body, plan: (await api.previewFertilizer(fieldId, body)).plan }),
    onSuccess: ({ body, plan }) => {
      setResult({ plan, body, saved: false });
      if (!body.soil) {
        setSoil({ n: String(plan.soil.n), p: String(plan.soil.p), k: String(plan.soil.k), ph: "", oc: "" });
        setCard(null);
      }
    },
  });

  const readCard = useMutation({
    mutationFn: (file: File) => api.readSoilCard(fieldId, file),
    onSuccess: ({ card: read }) => {
      setCard(read);
      setCardError(null);
      const text = (value: number | null, fallback: string) => (value === null || value === undefined ? fallback : String(value));
      setSoil((current) => ({
        n: text(read.nitrogen, current.n),
        p: text(read.phosphorus, current.p),
        k: text(read.potassium, current.k),
        ph: text(read.ph, current.ph),
        oc: text(read.organicCarbon, current.oc),
      }));
    },
    onError: (error) => {
      setCard(null);
      setCardError({
        needsAi: error instanceof ApiRequestError && error.status === 503,
        message: errorText(error, t("common.error")),
      });
    },
  });

  const save = useMutation({
    mutationFn: (body: PreviewBody) => api.saveFertilizer(fieldId, body),
    onSuccess: async () => {
      setResult((current) => (current ? { ...current, saved: true } : current));
      toast({ tone: "success", title: t("fertilizer.savedToast"), body: t("fertilizer.savedToastBody") });
      await queryClient.invalidateQueries({ queryKey: opsKeys.fertilizer(fieldId) });
    },
    onError: (error) => toast({ tone: "critical", title: t("fertilizer.saveFailed"), body: errorText(error, t("common.error")) }),
  });

  const soilValid = inRange("n", soil.n, true) && inRange("p", soil.p, true) && inRange("k", soil.k, true) && inRange("ph", soil.ph, false) && inRange("oc", soil.oc, false);
  const canCalculate = Boolean(selectedCrop) && soilValid;

  const calculate = () => {
    if (!canCalculate) return;
    preview.mutate({
      cropKey: selectedCrop,
      source: card ? "SOIL_CARD" : "MANUAL",
      soil: {
        n: Number(soil.n),
        p: Number(soil.p),
        k: Number(soil.k),
        ph: parseNumber(soil.ph),
        organicCarbon: parseNumber(soil.oc),
      },
    });
  };

  const previewError =
    preview.error instanceof ApiRequestError && preview.error.status === 400 && preview.variables && !preview.variables.soil
      ? t("fertilizer.noSensor")
      : errorText(preview.error, t("common.error"));

  const inputs: Array<{ key: SoilKey; label: string; unit: string; step: string }> = [
    { key: "n", label: t("fertilizer.nitrogen"), unit: t("fertilizer.kgHa"), step: "any" },
    { key: "p", label: t("fertilizer.phosphorus"), unit: t("fertilizer.kgHa"), step: "any" },
    { key: "k", label: t("fertilizer.potassium"), unit: t("fertilizer.kgHa"), step: "any" },
    { key: "ph", label: t("fertilizer.ph"), unit: t("common.optional"), step: "0.1" },
    { key: "oc", label: t("fertilizer.organicCarbon"), unit: t("fertilizer.percentOptional"), step: "0.01" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("fertilizer.calculatorTitle")}</CardTitle>
          <p className="text-sm text-slate-500">{t("fertilizer.calculatorSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldGroup label={t("common.crop")} htmlFor="fertilizer-crop">
            <select
              id="fertilizer-crop"
              className={selectClass}
              value={selectedCrop}
              onChange={(event) => {
                setCropKey(event.target.value);
                setResult(null);
              }}
            >
              <option value="" disabled>
                {t("fertilizer.chooseCrop")}
              </option>
              {crops.map((crop) => (
                <option key={crop.key} value={crop.key}>
                  {crop.name}
                </option>
              ))}
            </select>
          </FieldGroup>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedCrop || preview.isPending}
              onClick={() => preview.mutate({ cropKey: selectedCrop })}
            >
              {preview.isPending && !preview.variables?.soil ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              {t("fertilizer.useSensor")}
            </Button>
            <Button type="button" variant="secondary" disabled={readCard.isPending} onClick={() => fileRef.current?.click()}>
              {readCard.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {readCard.isPending ? t("fertilizer.readingCard") : t("fertilizer.readCard")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) readCard.mutate(file);
              }}
            />
          </div>

          {card ? (
            <Alert variant="default">
              <p className="font-semibold">{t("fertilizer.cardRead", { confidence: number(card.confidence * 100) })}</p>
              <p className="mt-0.5">{t("fertilizer.cardReadBody", { provider: card.model ? `${card.provider} · ${card.model}` : card.provider })}</p>
            </Alert>
          ) : null}
          {cardError ? (
            <Alert variant={cardError.needsAi ? "info" : "destructive"}>
              {cardError.needsAi ? (
                <>
                  <p className="font-semibold">{t("fertilizer.cardNeedsAi")}</p>
                  <p className="mt-0.5">{t("fertilizer.cardNeedsAiBody")}</p>
                </>
              ) : (
                cardError.message
              )}
            </Alert>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              calculate();
            }}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">{t("fertilizer.soilTest")}</legend>
              <p className="text-xs text-slate-500">{t("fertilizer.soilTestHint")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {inputs.map((input) => {
                  const valid = inRange(input.key, soil[input.key], input.key === "n" || input.key === "p" || input.key === "k");
                  return (
                    <FieldGroup key={input.key} label={input.label} htmlFor={`soil-${input.key}`} hint={input.unit}>
                      <Input
                        id={`soil-${input.key}`}
                        type="number"
                        inputMode="decimal"
                        min={limits[input.key][0]}
                        max={limits[input.key][1]}
                        step={input.step}
                        value={soil[input.key]}
                        aria-invalid={soil[input.key] !== "" && !valid}
                        className={soil[input.key] !== "" && !valid ? "border-red-300" : undefined}
                        onChange={(event) => setSoil((current) => ({ ...current, [input.key]: event.target.value }))}
                      />
                    </FieldGroup>
                  );
                })}
              </div>
            </fieldset>

            {preview.isError ? <Alert variant="destructive">{previewError}</Alert> : null}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!canCalculate || preview.isPending}>
              {preview.isPending && preview.variables?.soil ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {t("fertilizer.calculate")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <FertilizerResult
          plan={result.plan}
          canSave={canSave}
          saving={save.isPending}
          saved={result.saved}
          onSave={() => save.mutate(result.body)}
        />
      ) : null}
    </div>
  );
}
