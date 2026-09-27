"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, LocateFixed, MapPinPlus, Save, Trash2, Undo2 } from "lucide-react";
import { FieldMap } from "@/components/fields/field-map";
import { indiaCenter, parseBoundary, polygonAcres } from "@/components/fields/geo";
import { errorText, Switch, useNow } from "@/components/field/ops/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { FieldOverview, LatLng } from "@/lib/types";
import { cn } from "@/lib/utils";

const holdMs = 5000;
const weakMetres = 20;
const hectaresPerAcre = 0.404686;

interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Corner {
  point: LatLng;
  accuracy: number;
}

// Weighted by 1/accuracy², so steadier fixes count more; the accuracy shown is the median the phone reported.
function averageFix(samples: Fix[]): Corner {
  const weights = samples.map((sample) => 1 / Math.max(1, sample.accuracy) ** 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const lat = samples.reduce((sum, sample, index) => sum + sample.lat * weights[index], 0) / total;
  const lng = samples.reduce((sum, sample, index) => sum + sample.lng * weights[index], 0) / total;
  const sorted = samples.map((sample) => sample.accuracy).sort((a, b) => a - b);
  return { point: [lat, lng], accuracy: sorted[Math.floor(sorted.length / 2)] };
}

function HoldCountdown({ until }: { until: number }) {
  const { t, number } = useI18n();
  const now = useNow(250);
  return <>{t("phone.holdStill", { seconds: number(Math.max(0, Math.ceil((until - now) / 1000))) })}</>;
}

export function FieldWalk({ overview }: { overview: FieldOverview }) {
  const { t, number } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { field, farm } = overview;
  const readOnly = overview.access === "advisor";
  const saved = parseBoundary(field.boundary);
  const [watching, setWatching] = useState(false);
  const [fix, setFix] = useState<Fix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const watchId = useRef<number | null>(null);
  const latest = useRef<Fix | null>(null);
  const holding = useRef(false);
  const samples = useRef<Fix[]>([]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    []
  );

  const startGps = () => {
    if (!("geolocation" in navigator)) {
      setGpsError(t("phone.gpsUnsupported"));
      return;
    }
    setGpsError(null);
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
        latest.current = next;
        if (holding.current) samples.current.push(next);
        setFix(next);
        setGpsError(null);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
          setWatching(false);
          setGpsError(t("phone.gpsDenied"));
          return;
        }
        setGpsError(t("phone.gpsError", { message: error.message }));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  };

  const addCorner = () => {
    samples.current = latest.current ? [latest.current] : [];
    holding.current = true;
    setHoldUntil(Date.now() + holdMs);
    window.setTimeout(() => {
      holding.current = false;
      const collected = samples.current.length ? samples.current : latest.current ? [latest.current] : [];
      if (collected.length) setCorners((current) => [...current, averageFix(collected)]);
      setHoldUntil(null);
    }, holdMs);
  };

  const points = corners.map((corner) => corner.point);
  const acres = polygonAcres(points);

  const save = useMutation({
    mutationFn: () => api.patchField(field.id, { boundary: points }),
    onSuccess: async ({ field: updated }) => {
      setConfirm(false);
      setCorners([]);
      toast({ tone: "success", title: t("phone.boundarySaved"), body: t("phone.boundarySavedBody", { field: updated.name, acres: number(updated.area, 2) }) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["field", field.id] }),
        queryClient.invalidateQueries({ queryKey: ["farm", farm.id] }),
        queryClient.invalidateQueries({ queryKey: ["farms"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast({ tone: "critical", title: t("phone.saveFailed"), body: errorText(error, t("common.error")) }),
  });

  const center: LatLng =
    fix ? [fix.lat, fix.lng] : field.latitude !== null && field.longitude !== null ? [field.latitude, field.longitude] : farm.latitude !== null && farm.longitude !== null ? [farm.latitude, farm.longitude] : indiaCenter;
  const weak = fix !== null && fix.accuracy > weakMetres;

  return (
    <div className="space-y-4">
      {readOnly ? <Alert variant="info">{t("phone.readOnly")}</Alert> : null}

      <Card className="overflow-hidden">
        <div className="relative h-[52vh] min-h-72">
          <FieldMap
            center={center}
            zoom={fix || field.latitude !== null ? 18 : 5}
            boundary={saved}
            draft={points}
            drawing={points.length > 0}
            position={fix ? { point: [fix.lat, fix.lng], accuracy: fix.accuracy } : null}
            follow={follow}
          />
          <div className="pointer-events-none absolute top-3 right-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-soft">
            {watching ? (fix ? t("phone.gpsAccuracy", { metres: number(fix.accuracy) }) : t("phone.gpsWaiting")) : t("phone.gpsStart")}
          </div>
        </div>
      </Card>

      {gpsError ? <Alert variant="destructive">{gpsError}</Alert> : null}
      {weak ? <Alert>{t("phone.gpsWeak")}</Alert> : null}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {!watching ? (
            <Button type="button" size="lg" className="h-14 w-full text-base" onClick={startGps}>
              <LocateFixed className="h-5 w-5" />
              {t("phone.gpsStart")}
            </Button>
          ) : (
            <Button type="button" size="lg" className="h-14 w-full text-base" disabled={!fix || holdUntil !== null || readOnly} onClick={addCorner}>
              {holdUntil !== null ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MapPinPlus className="h-5 w-5" />}
              {holdUntil !== null ? <HoldCountdown until={holdUntil} /> : t("phone.addCorner")}
            </Button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-ink">{t("phone.corners", { count: number(corners.length) })}</p>
              <p className="text-sm text-slate-500">
                {corners.length >= 3 ? t("phone.area", { acres: number(acres, 2), hectares: number(acres * hectaresPerAcre, 2) }) : t("phone.needThree")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={!corners.length || holdUntil !== null} onClick={() => setCorners((current) => current.slice(0, -1))}>
                <Undo2 className="h-3.5 w-3.5" />
                {t("phone.undo")}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={!corners.length || holdUntil !== null} onClick={() => setCorners([])}>
                <Trash2 className="h-3.5 w-3.5" />
                {t("phone.clear")}
              </Button>
            </div>
          </div>

          {corners.length ? (
            <ol className="flex flex-wrap gap-1.5">
              {corners.map((corner, index) => (
                <li
                  key={`${corner.point[0]}-${corner.point[1]}-${index}`}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                    corner.accuracy > weakMetres ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-navy-50 text-navy-800 ring-navy-200"
                  )}
                >
                  {t("phone.cornerAccuracy", { n: number(index + 1), metres: number(corner.accuracy) })}
                </li>
              ))}
            </ol>
          ) : null}

          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700">{t("phone.follow")}</span>
            <Switch checked={follow} label={t("phone.follow")} onChange={setFollow} />
          </label>

          <Button type="button" variant="dark" className="w-full" disabled={corners.length < 3 || readOnly || save.isPending} onClick={() => setConfirm(true)}>
            <Save className="h-4 w-4" />
            {t("phone.saveBoundary")}
          </Button>
          <p className="text-xs text-slate-500">{t("phone.accuracyNote")}</p>
        </CardContent>
      </Card>

      {confirm ? (
        <ConfirmDialog
          title={t("phone.saveTitle")}
          description={t("phone.saveBody", { field: field.name, acres: number(acres, 2), old: number(field.area, 2) })}
          confirmLabel={t("phone.saveBoundary")}
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await save.mutateAsync().catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
