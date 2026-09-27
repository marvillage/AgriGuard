"use client";

import Image from "next/image";
import { Bug, Images, LoaderCircle, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { assetUrl } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { scanConfidence, scanTitle, shouldPoll } from "./scan-helpers";

export function ScanHistory({
  scans,
  loading,
  selectedId,
  fieldNames,
  onSelect,
}: {
  scans: Scan[];
  loading: boolean;
  selectedId: number | null;
  fieldNames: Map<number, string>;
  onSelect: (id: number) => void;
}) {
  const { t, language } = useI18n();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Images className="h-4 w-4 text-navy-700" /> {t("scan.historyTitle")}
        </CardTitle>
        {scans.length ? <span className="text-xs text-slate-500">{t("scan.historyCount", { count: scans.length })}</span> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> {t("scan.historyLoading")}
          </p>
        ) : scans.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{t("scan.historyEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {scans.map((scan) => {
              const src = assetUrl(scan.imageUrl);
              const title = scanTitle(scan) ?? t("scan.unidentified");
              const confidence = scanConfidence(scan);
              const fieldName = fieldNames.get(scan.fieldId) ?? "";
              const healthy = scan.mode === "disease" && scan.top?.healthy;
              return (
                <li key={scan.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(scan.id)}
                    aria-pressed={selectedId === scan.id}
                    className={cn(
                      "group block w-full cursor-pointer overflow-hidden rounded-2xl border bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-sun-400/30 focus-visible:outline-none",
                      selectedId === scan.id ? "border-sun-400 ring-2 ring-sun-400/60" : "border-slate-200/80"
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {src ? (
                        <Image
                          src={src}
                          alt={t("scan.thumbnailAlt", { field: fieldName })}
                          fill
                          unoptimized
                          sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : null}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {scan.mode === "pest" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-navy-950/85 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                            <Bug className="h-3 w-3" /> {t("scan.modePest")}
                          </span>
                        ) : null}
                        {healthy ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                            <Sprout className="h-3 w-3" /> {t("scan.kind_healthy")}
                          </span>
                        ) : null}
                        {shouldPoll(scan) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-navy-800 backdrop-blur">
                            <LoaderCircle className="h-3 w-3 animate-spin" /> {t("scan.aiChecking")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">{fieldName}</span>
                        {confidence !== null ? <span className="shrink-0 font-semibold text-navy-800 tabular-nums">{confidence}%</span> : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(scan.createdAt, language)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
