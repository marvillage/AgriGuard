"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LoaderCircle, Sprout, Wheat } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Meter } from "@/components/ui/meter";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Crop, FieldOverview } from "@/lib/types";
import { CropTimeline } from "./crop-timeline";
import { InfoRow, SectionTitle, errorMessage, localIsoDate, selectClass } from "./field-ui";
import { useCropOptions } from "./use-crop-options";

export function CropTab({ overview }: { overview: FieldOverview }) {
  const { t } = useI18n();
  const readOnly = overview.access === "advisor";
  const fieldId = overview.field.id;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="min-w-0 space-y-5 lg:col-span-2">
        <CurrentCrop overview={overview} />
        <CropHistory fieldId={fieldId} />
      </div>
      <div className="space-y-5">
        {readOnly ? (
          <Alert variant="info">{t("field.readOnlyHint")}</Alert>
        ) : (
          <>
            {overview.crop?.status === "ACTIVE" ? <HarvestForm fieldId={fieldId} crop={overview.crop} /> : null}
            <PlantCropForm fieldId={fieldId} hasActive={overview.crop?.status === "ACTIVE"} />
          </>
        )}
      </div>
    </div>
  );
}

function CurrentCrop({ overview }: { overview: FieldOverview }) {
  const { t, language, number } = useI18n();
  const { crop, stage } = overview;

  if (!crop) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
            <Sprout className="h-5 w-5" />
          </span>
          <p className="mt-3 font-display text-lg font-semibold text-ink">{t("field.noCrop")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("field.noCropHint")}</p>
        </CardContent>
      </Card>
    );
  }

  const progress = stage.progress !== null ? Math.round(stage.progress * 100) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sun-600 uppercase">{t("field.currentCrop")}</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink">{crop.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {[crop.variety, crop.season].filter(Boolean).join(" · ") || t("field.noVariety")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stage.label ? <Badge variant="default">{stage.label}</Badge> : null}
            {stage.day !== null && stage.seasonDays !== null ? (
              <Badge variant="navy">{t("field.stageDay", { day: number(stage.day), total: number(stage.seasonDays) })}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <CropTimeline stage={stage} />
        {progress !== null ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-500">{t("field.seasonProgress")}</span>
              <span className="font-semibold text-ink tabular-nums">{t("field.percent", { value: number(progress) })}</span>
            </div>
            <Meter value={progress} tone="sun" label={t("field.seasonProgress")} />
          </div>
        ) : null}
        <dl className="grid gap-x-8 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
          <InfoRow label={t("field.plantedOn")} value={formatDate(crop.plantingDate, language, { day: "numeric", month: "short", year: "numeric" })} />
          <InfoRow
            label={t("field.expectedHarvest")}
            value={formatDate(stage.expectedHarvest, language, { day: "numeric", month: "short", year: "numeric" })}
          />
          <InfoRow label={t("field.kc")} value={number(stage.kc, 2)} />
          <InfoRow label={t("field.rootDepth")} value={t("field.metres", { value: number(stage.rootDepthM, 2) })} />
        </dl>
      </CardContent>
    </Card>
  );
}

function CropHistory({ fieldId }: { fieldId: number }) {
  const { t, language, number } = useI18n();
  const cropsQuery = useQuery({
    queryKey: ["field", fieldId, "crops"],
    queryFn: async () => (await api.crops(fieldId)).crops,
  });
  const crops = cropsQuery.data ?? [];
  const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<CalendarDays className="h-4 w-4 text-navy-700" />} title={t("field.cropHistory")} />
      </CardHeader>
      <CardContent className="pt-4">
        {cropsQuery.isLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ) : cropsQuery.isError ? (
          <Alert variant="destructive">{errorMessage(cropsQuery.error, t("common.error"))}</Alert>
        ) : crops.length === 0 ? (
          <p className="text-sm text-slate-500">{t("field.noCropHistory")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {crops.map((crop) => (
              <li key={crop.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {crop.name}
                    {crop.variety ? <span className="font-normal text-slate-500"> · {crop.variety}</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[
                      crop.season,
                      `${formatDate(crop.plantingDate, language, dateOptions)} → ${crop.harvestDate ? formatDate(crop.harvestDate, language, dateOptions) : t("field.ongoing")}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {crop.yieldKg !== null ? (
                    <span className="text-sm font-semibold text-ink tabular-nums">{t("field.kg", { value: number(crop.yieldKg) })}</span>
                  ) : null}
                  <Badge variant={crop.status === "ACTIVE" ? "success" : "secondary"}>
                    {crop.status === "ACTIVE" ? t("field.statusActive") : t("field.statusHarvested")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PlantCropForm({ fieldId, hasActive }: { fieldId: number; hasActive: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const optionsQuery = useCropOptions();
  const [cropType, setCropType] = useState("");
  const [variety, setVariety] = useState("");
  const [season, setSeason] = useState("");
  const [plantingDate, setPlantingDate] = useState(() => localIsoDate(new Date()));
  const plant = useMutation({
    mutationFn: () =>
      api.plantCrop(fieldId, {
        cropType,
        variety: variety.trim() || undefined,
        season: season.trim() || undefined,
        plantingDate,
      }),
    onSuccess: async ({ crop }) => {
      toast({ title: t("field.cropPlanted", { crop: crop.name }), tone: "success" });
      setCropType("");
      setVariety("");
      setSeason("");
      await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<Sprout className="h-4 w-4 text-navy-700" />} title={t("field.plantTitle")} />
        {hasActive ? <p className="text-sm text-slate-500">{t("field.plantReplaces")}</p> : null}
      </CardHeader>
      <CardContent className="pt-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            plant.mutate();
          }}
        >
          {plant.isError ? <Alert variant="destructive">{errorMessage(plant.error, t("common.error"))}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="plant-crop">{t("common.crop")}</Label>
            <select id="plant-crop" className={selectClass} value={cropType} onChange={(event) => setCropType(event.target.value)} required>
              <option value="">{t("field.chooseCrop")}</option>
              {(optionsQuery.data?.crops ?? []).map((option) => (
                <option key={option.key} value={option.key}>
                  {t("field.cropOption", { name: option.name, days: option.seasonDays })}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plant-variety">{t("field.variety")}</Label>
              <Input id="plant-variety" value={variety} onChange={(event) => setVariety(event.target.value)} placeholder={t("field.varietyPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant-season">{t("field.season")}</Label>
              <Input id="plant-season" value={season} onChange={(event) => setSeason(event.target.value)} placeholder={t("field.seasonPlaceholder")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plant-date">{t("field.plantingDate")}</Label>
            <Input id="plant-date" type="date" value={plantingDate} onChange={(event) => setPlantingDate(event.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={plant.isPending || !cropType}>
            {plant.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
            {t("field.plantSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HarvestForm({ fieldId, crop }: { fieldId: number; crop: Crop }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [yieldKg, setYieldKg] = useState("");
  const [harvestDate, setHarvestDate] = useState(() => localIsoDate(new Date()));
  const harvest = useMutation({
    mutationFn: () => api.harvestCrop(fieldId, crop.id, { yieldKg: yieldKg === "" ? null : Number(yieldKg), harvestDate }),
    onSuccess: async () => {
      toast({ title: t("field.harvestSaved", { crop: crop.name }), tone: "success" });
      setYieldKg("");
      await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<Wheat className="h-4 w-4 text-navy-700" />} title={t("field.harvestTitle", { crop: crop.name })} />
      </CardHeader>
      <CardContent className="pt-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            harvest.mutate();
          }}
        >
          {harvest.isError ? <Alert variant="destructive">{errorMessage(harvest.error, t("common.error"))}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="harvest-yield">{t("field.yieldKg")}</Label>
              <Input
                id="harvest-yield"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={yieldKg}
                onChange={(event) => setYieldKg(event.target.value)}
                placeholder="1200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="harvest-date">{t("field.harvestDate")}</Label>
              <Input id="harvest-date" type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} required />
            </div>
          </div>
          <Button type="submit" variant="dark" className="w-full" disabled={harvest.isPending}>
            {harvest.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wheat className="h-4 w-4" />}
            {t("field.harvestSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
