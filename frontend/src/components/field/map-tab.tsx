"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, LoaderCircle, PencilLine, Save, Undo2, X } from "lucide-react";
import { FieldMap, type Basemap } from "@/components/fields/field-map";
import { indiaCenter, parseBoundary, polygonAcres } from "@/components/fields/geo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api, assetUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { FieldOverview, LatLng } from "@/lib/types";
import { cn } from "@/lib/utils";
import { errorMessage, formatFixed } from "./field-ui";
import { NdviPanel } from "./ndvi-panel";

function mapCenter(overview: FieldOverview): { center: LatLng; zoom: number } {
  const { field, farm } = overview;
  if (field.latitude !== null && field.longitude !== null) return { center: [field.latitude, field.longitude], zoom: 17 };
  if (farm.latitude !== null && farm.longitude !== null) return { center: [farm.latitude, farm.longitude], zoom: 15 };
  return { center: indiaCenter, zoom: 5 };
}

export function MapTab({ overview }: { overview: FieldOverview }) {
  const { t, language, number } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fieldId = overview.field.id;
  const readOnly = overview.access === "advisor";
  const saved = parseBoundary(overview.field.boundary);
  const { center, zoom } = mapCenter(overview);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNdvi, setShowNdvi] = useState(true);
  const [opacity, setOpacity] = useState(75);
  const [approximateId, setApproximateId] = useState<number | null>(null);

  const ndviQuery = useQuery({
    queryKey: ["field", fieldId, "ndvi"],
    queryFn: async () => (await api.ndvi(fieldId)).snapshots,
  });
  const snapshots = ndviQuery.data ?? [];
  const selected = snapshots.find((snapshot) => snapshot.id === selectedId) ?? snapshots[0] ?? null;
  const overlayUrl = selected ? assetUrl(selected.imageUrl) : null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
    await queryClient.invalidateQueries({ queryKey: ["farm", overview.farm.id] });
    await queryClient.invalidateQueries({ queryKey: ["farms"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveBoundary = useMutation({
    mutationFn: (boundary: LatLng[]) => api.patchField(fieldId, { boundary }),
    onSuccess: async ({ field }) => {
      toast({ title: t("field.boundarySaved"), body: t("field.boundarySavedBody", { area: number(field.area, 2) }), tone: "success" });
      setDrawing(false);
      setDraft([]);
      await invalidate();
    },
  });

  const refresh = useMutation({
    mutationFn: () => api.refreshNdvi(fieldId),
    onSuccess: async ({ snapshot }) => {
      setSelectedId(snapshot.id);
      setApproximateId(snapshot.approximate ? snapshot.id : null);
      setShowNdvi(true);
      toast({
        title: t("field.ndviUpdated"),
        body: t("field.ndviUpdatedBody", { date: formatDate(snapshot.sceneDate, language), ndvi: formatFixed(snapshot.meanNdvi, 2, language) }),
        tone: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
    },
  });

  const draftAcres = polygonAcres(draft);
  const startDrawing = () => {
    saveBoundary.reset();
    setDraft([]);
    setDrawing(true);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="min-w-0 overflow-hidden xl:col-span-2">
        <div className="relative h-[360px] sm:h-[480px] xl:h-[560px]">
          <FieldMap
            center={center}
            zoom={zoom}
            boundary={saved}
            draft={draft}
            drawing={drawing}
            basemap={basemap}
            ndvi={selected && overlayUrl && showNdvi && !drawing ? { url: overlayUrl, bounds: selected.bounds, opacity: opacity / 100 } : null}
            onAddPoint={(point) => setDraft((current) => [...current, point])}
          />
          <div className="pointer-events-none absolute top-3 right-3 z-[500]">
            <div className="pointer-events-auto flex rounded-xl bg-white/95 p-1 shadow-lift backdrop-blur" role="group" aria-label={t("field.basemapLabel")}>
              {(["satellite", "osm"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBasemap(option)}
                  aria-pressed={basemap === option}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    basemap === option ? "bg-navy-950 text-white" : "text-slate-600 hover:text-ink"
                  )}
                >
                  {option === "satellite" ? t("field.basemapSatellite") : t("field.basemapStreet")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
          {saveBoundary.isError ? <Alert variant="destructive">{errorMessage(saveBoundary.error, t("common.error"))}</Alert> : null}
          {drawing ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{t("field.drawHint")}</p>
                <p className="text-sm text-slate-500 tabular-nums">
                  {t("field.drawStatus", { points: number(draft.length), area: number(draftAcres, 2) })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((current) => current.slice(0, -1))} disabled={!draft.length}>
                  <Undo2 className="h-3.5 w-3.5" />
                  {t("field.drawUndo")}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setDraft([])} disabled={!draft.length}>
                  <Eraser className="h-3.5 w-3.5" />
                  {t("field.drawClear")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDrawing(false);
                    setDraft([]);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("common.cancel")}
                </Button>
                <Button type="button" size="sm" onClick={() => saveBoundary.mutate(draft)} disabled={draft.length < 3 || saveBoundary.isPending}>
                  {saveBoundary.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {t("field.drawSave")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{saved ? t("field.boundaryTitle") : t("field.noBoundary")}</p>
                <p className="text-sm text-slate-500 tabular-nums">
                  {saved ? t("field.boundaryArea", { area: number(overview.field.area, 2) }) : t("field.noBoundaryHint")}
                </p>
              </div>
              {!readOnly ? (
                <Button type="button" variant="dark" onClick={startDrawing}>
                  <PencilLine className="h-4 w-4" />
                  {saved ? t("field.redrawBoundary") : t("field.drawBoundary")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <NdviPanel
        snapshots={snapshots}
        loading={ndviQuery.isLoading}
        selected={selected}
        onSelect={setSelectedId}
        visible={showNdvi}
        onVisibleChange={setShowNdvi}
        opacity={opacity}
        onOpacityChange={setOpacity}
        refreshing={refresh.isPending}
        refreshError={refresh.isError ? errorMessage(refresh.error, t("field.ndviFailed")) : null}
        approximate={selected !== null && selected.id === approximateId}
        onRefresh={() => refresh.mutate()}
      />
    </div>
  );
}
