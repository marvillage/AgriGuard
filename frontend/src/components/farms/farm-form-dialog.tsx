"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, MapPin, Search } from "lucide-react";
import { errorMessage } from "@/components/field/field-ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/provider";
import { api, type FarmInput } from "@/lib/api";
import type { Farm, IrrigationMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export const irrigationMethods: IrrigationMethod[] = ["flood", "sprinkler", "drip"];

export const typicalBaseline: Record<IrrigationMethod, { depth: number; interval: number }> = {
  flood: { depth: 70, interval: 7 },
  sprinkler: { depth: 35, interval: 4 },
  drip: { depth: 8, interval: 1 },
};

type GeocodeResult = Awaited<ReturnType<typeof api.geocode>>["results"][number];

interface FarmFormDialogProps {
  initial?: Farm;
  onSubmit: (values: FarmInput & { name: string }) => Promise<void>;
  onCancel: () => void;
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export function FarmFormDialog({ initial, onSubmit, onCancel }: FarmFormDialogProps) {
  const { t, tx, number } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [latitude, setLatitude] = useState(text(initial?.latitude));
  const [longitude, setLongitude] = useState(text(initial?.longitude));
  const [coordsTouched, setCoordsTouched] = useState(false);
  const [resolvedPlace, setResolvedPlace] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [method, setMethod] = useState<IrrigationMethod>(initial?.irrigationMethod ?? "flood");
  const [depth, setDepth] = useState(text(initial?.baselineDepthMm));
  const [intervalDays, setIntervalDays] = useState(text(initial?.baselineIntervalDays));
  const [rate, setRate] = useState(text(initial?.electricityRate));
  const [solar, setSolar] = useState(text(initial?.solarCapacityKw));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typical = typicalBaseline[method];

  const findPlace = async () => {
    if (location.trim().length < 2) {
      setSearchError(t("farms.findTooShort"));
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const { results: found } = await api.geocode(location.trim());
      setResults(found);
      if (!found.length) setSearchError(t("farms.findNone"));
    } catch (requestError) {
      setSearchError(errorMessage(requestError, t("common.error")));
    } finally {
      setSearching(false);
    }
  };

  const pick = (result: GeocodeResult) => {
    setLatitude(String(Math.round(result.latitude * 1e5) / 1e5));
    setLongitude(String(Math.round(result.longitude * 1e5) / 1e5));
    setCoordsTouched(true);
    setResolvedPlace(result.name);
    setResults(null);
  };

  const coordinates = (): Pick<FarmInput, "latitude" | "longitude"> => {
    if (coordsTouched) return { latitude: optionalNumber(latitude), longitude: optionalNumber(longitude) };
    if (initial && location.trim() !== (initial.location ?? "")) return { latitude: null, longitude: null };
    return {};
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const coords = coordinates();
    if (coordsTouched && (coords.latitude === null) !== (coords.longitude === null)) {
      setError(t("farms.coordinatesPair"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        location: initial ? location.trim() : location.trim() || undefined,
        description: initial ? description.trim() : description.trim() || undefined,
        ...coords,
        irrigationMethod: method,
        baselineDepthMm: optionalNumber(depth),
        baselineIntervalDays: optionalNumber(intervalDays),
        electricityRate: rate.trim() === "" ? undefined : Number(rate),
        solarCapacityKw: optionalNumber(solar),
      });
    } catch (requestError) {
      setError(errorMessage(requestError, t("farms.saveError")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={initial ? t("farms.editTitle") : t("farms.createTitle")} description={t("farms.formDescription")} onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <div className="-mx-6 max-h-[calc(100dvh-14rem)] space-y-5 overflow-y-auto px-6 pb-1">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="farm-name">{t("farms.name")}</Label>
            <Input
              id="farm-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("farms.namePlaceholder")}
              minLength={2}
              maxLength={100}
              autoFocus
              required
            />
          </div>

          <fieldset className="min-w-0 space-y-2">
            <Label htmlFor="farm-location">{t("farms.location")}</Label>
            <div className="flex gap-2">
              <Input
                id="farm-location"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setResolvedPlace(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void findPlace();
                  }
                }}
                placeholder={t("farms.locationPlaceholder")}
                maxLength={255}
              />
              <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={() => void findPlace()} disabled={searching}>
                {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("farms.find")}
              </Button>
            </div>
            {searchError ? <p className="text-xs text-red-700">{searchError}</p> : null}
            {results && results.length ? (
              <ul className="overflow-hidden rounded-xl border border-slate-200" aria-label={t("farms.findResults")}>
                {results.map((result) => (
                  <li key={`${result.latitude},${result.longitude}`} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => pick(result)}
                      className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-sun-50"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sun-600" />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{result.name}</span>
                        <span className="block text-xs text-slate-500 tabular-nums">
                          {t("farms.coordinates", { lat: number(result.latitude, 4), lng: number(result.longitude, 4) })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {resolvedPlace ? (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("farms.resolved", { place: resolvedPlace })}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="farm-lat" className="block text-xs text-slate-500">
                  {t("farms.latitude")}
                </Label>
                <Input
                  id="farm-lat"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitude}
                  onChange={(event) => {
                    setLatitude(event.target.value);
                    setCoordsTouched(true);
                    setResolvedPlace(null);
                  }}
                  placeholder="20.0264"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="farm-lng" className="block text-xs text-slate-500">
                  {t("farms.longitude")}
                </Label>
                <Input
                  id="farm-lng"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  value={longitude}
                  onChange={(event) => {
                    setLongitude(event.target.value);
                    setCoordsTouched(true);
                    setResolvedPlace(null);
                  }}
                  placeholder="73.9065"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">{t("farms.coordinatesHint")}</p>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="farm-description">{t("farms.descriptionLabel")}</Label>
            <Textarea
              id="farm-description"
              className="min-h-20"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("farms.descriptionPlaceholder")}
              maxLength={1000}
            />
          </div>

          <fieldset className="min-w-0 space-y-2">
            <legend className="text-sm font-medium text-slate-700">{t("farms.irrigationMethod")}</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {irrigationMethods.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all",
                    method === option ? "border-sun-400 bg-sun-50 text-ink ring-2 ring-sun-400/30" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <input type="radio" name="farm-method" value={option} checked={method === option} onChange={() => setMethod(option)} className="sr-only" />
                  {tx(`farms.method_${option}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="px-1 text-sm font-semibold text-ink">{t("farms.baselineTitle")}</legend>
            <p className="text-xs text-slate-600">{t("farms.baselineHelp")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="farm-depth" className="block text-xs">
                  {t("farms.baselineDepth")}
                </Label>
                <Input
                  id="farm-depth"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={1}
                  max={300}
                  value={depth}
                  onChange={(event) => setDepth(event.target.value)}
                  placeholder={String(typical.depth)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="farm-interval" className="block text-xs">
                  {t("farms.baselineInterval")}
                </Label>
                <Input
                  id="farm-interval"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={1}
                  max={60}
                  value={intervalDays}
                  onChange={(event) => setIntervalDays(event.target.value)}
                  placeholder={String(typical.interval)}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">{t("farms.baselineTypical")}</p>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="farm-rate">{t("farms.electricityRate")}</Label>
              <Input
                id="farm-rate"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                max={50}
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="7"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-solar">{t("farms.solarCapacity")}</Label>
              <Input
                id="farm-solar"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                max={1000}
                value={solar}
                onChange={(event) => setSolar(event.target.value)}
                placeholder={t("farms.solarPlaceholder")}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("common.saving") : t("farms.saveFarm")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
