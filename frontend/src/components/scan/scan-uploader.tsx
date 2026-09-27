"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Bug, Camera, CircleCheck, ImagePlus, Leaf, LoaderCircle, RotateCcw, ScanLine, Sparkles, Sun } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import type { DashboardField } from "@/lib/types";
import { siteImages } from "@/lib/site-images";
import { cn } from "@/lib/utils";
import { cropLabel, guessCropKey, type ScanCrop, type ScanMode } from "./scan-helpers";

const maxBytes = 12 * 1024 * 1024;
const autoCrop = "auto";

export interface ScanRequest {
  image: File;
  fieldId: number;
  cropKey?: string;
  mode: ScanMode;
}

const selectClass =
  "h-11 w-full min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function ScanUploader({
  fields,
  crops,
  pending,
  error,
  onAnalyse,
}: {
  fields: DashboardField[];
  crops: ScanCrop[];
  pending: boolean;
  error: string | null;
  onAnalyse: (request: ScanRequest) => void;
}) {
  const { t, tx } = useI18n();
  const fieldSelectId = useId();
  const cropSelectId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [cropChoice, setCropChoice] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>("disease");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const field = fields.find((item) => item.id === fieldId) ?? fields[0];
  const cropKey = cropChoice ?? guessCropKey(field?.crop?.name, crops) ?? autoCrop;

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const acceptFile = (next: File | undefined) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setFileError(t("scan.invalidFile"));
      return;
    }
    if (next.size > maxBytes) {
      setFileError(t("scan.fileTooLarge"));
      return;
    }
    setFileError(null);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const loadSample = async () => {
    setSampleLoading(true);
    try {
      const response = await fetch(siteImages.scanSample.src);
      if (!response.ok) throw new Error(response.statusText);
      const blob = await response.blob();
      acceptFile(new File([blob], "scan-sample-leaf.jpg", { type: blob.type || "image/jpeg" }));
      setMode("disease");
    } catch {
      setFileError(t("scan.sampleFailed"));
    } finally {
      setSampleLoading(false);
    }
  };

  const clearPhoto = () => {
    setFile(null);
    setPreview(null);
    setFileError(null);
  };

  const analyse = () => {
    if (!file || !field) return;
    onAnalyse({ image: file, fieldId: field.id, cropKey: cropKey === autoCrop ? undefined : cropKey, mode });
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const modes: Array<{ value: ScanMode; icon: typeof Leaf; label: string; hint: string }> = [
    { value: "disease", icon: Leaf, label: t("scan.modeDisease"), hint: t("scan.modeDiseaseHint") },
    { value: "pest", icon: Bug, label: t("scan.modePest"), hint: t("scan.modePestHint") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("scan.stepPhoto")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={fieldSelectId} className="text-xs text-slate-500">
              {t("common.field")}
            </Label>
            <select
              id={fieldSelectId}
              value={field?.id ?? ""}
              disabled={pending}
              onChange={(event) => {
                setFieldId(Number(event.target.value));
                setCropChoice(null);
              }}
              className={selectClass}
            >
              {fields.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.farmName}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={cropSelectId} className="text-xs text-slate-500">
              {t("common.crop")}
            </Label>
            <select
              id={cropSelectId}
              value={cropKey}
              disabled={pending}
              onChange={(event) => setCropChoice(event.target.value)}
              className={selectClass}
            >
              <option value={autoCrop}>{t("scan.cropAuto")}</option>
              {crops.map((crop) => (
                <option key={crop.key} value={crop.key}>
                  {cropLabel(tx, crop)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">{t("scan.modeLabel")}</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            {modes.map(({ value, icon: Icon, label, hint }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                disabled={pending}
                onClick={() => setMode(value)}
                className={cn(
                  "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed",
                  mode === value ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    mode === value ? "bg-navy-950 text-sun-400" : "bg-white/70 text-slate-400"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-xs text-slate-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onPick} />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPick}
        />

        {preview ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
            <Image src={preview} alt={t("scan.previewAlt")} fill unoptimized className="object-cover" />
            {pending ? (
              <>
                <div className="absolute inset-0 bg-navy-950/35" />
                <div className="absolute inset-x-0 h-[3px] animate-scan bg-sun-400 shadow-[0_0_24px_6px_rgb(255_199_44_/_0.7)]" />
                <p className="absolute inset-x-3 bottom-3 rounded-xl bg-navy-950/80 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur">
                  {mode === "pest" ? t("scan.analysingPest") : t("scan.analysingDisease")}
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur transition-colors hover:bg-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t("scan.change")}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files[0]);
            }}
            className={cn(
              "flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-all focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none",
              dragging ? "border-sun-400 bg-sun-50" : "border-slate-200 bg-slate-50/60 hover:border-sun-300 hover:bg-sun-50/50"
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-950 text-sun-400 shadow-lift">
              {mode === "pest" ? <Bug className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
            </span>
            <span className="mt-4 font-semibold text-ink">{mode === "pest" ? t("scan.dropPest") : t("scan.dropDisease")}</span>
            <span className="mt-1 text-sm text-slate-500">{t("scan.dropHint")}</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> {t("scan.takePhoto")}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending || sampleLoading} onClick={loadSample} className="text-navy-700">
            {sampleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {sampleLoading ? t("scan.loadingSample") : t("scan.trySample")}
          </Button>
        </div>

        {fileError ? <Alert variant="destructive">{fileError}</Alert> : null}
        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <Button size="lg" className="w-full" disabled={!file || !field || pending} onClick={analyse}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          {pending ? t("scan.analysing") : t("scan.analyse")}
        </Button>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sun className="h-4 w-4 text-sun-600" /> {t("scan.tipsTitle")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {[t("scan.tipOne"), t("scan.tipTwo"), mode === "pest" ? t("scan.tipPest") : t("scan.tipThree")].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-slate-500">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
