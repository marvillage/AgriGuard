"use client";

import Image from "next/image";
import { Bug, Cpu, Leaf, ListChecks, ShieldAlert, Sprout } from "lucide-react";
import { AiExplain } from "@/components/ai/ai-explain";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { useI18n } from "@/i18n/provider";
import { api, assetUrl } from "@/lib/api";
import { formatNumber, timeAgo } from "@/lib/format";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AiOpinion, AiProviderLine, AiState } from "./ai-opinion";
import { affectedTone, confidenceTone, cropLabelByName, isAiStalled, pestName, percent, type ScanCrop } from "./scan-helpers";
import { AlternativeList, BulletList, CheckList, StepList } from "./scan-lists";

const spreadBadge = { low: "success", medium: "warning", high: "danger" } as const;

function Thumbnail({ scan, alt }: { scan: Scan; alt: string }) {
  const src = assetUrl(scan.imageUrl);
  if (!src) return null;
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/20 sm:h-20 sm:w-20">
      <Image src={src} alt={alt} fill unoptimized sizes="80px" className="object-cover" />
    </div>
  );
}

function ResultCard({ scan, fieldName, title, children }: { scan: Scan; fieldName: string; title: string; children: React.ReactNode }) {
  const { language } = useI18n();
  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-slate-500">
          {fieldName} · {timeAgo(scan.createdAt, language)}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function ModelNote({ scan }: { scan: Scan }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Cpu className="h-4 w-4 text-navy-600" /> {t("scan.modelTitle")}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t("scan.modelBody")}</p>
      {scan.model ? <p className="mt-2 font-mono text-[11px] break-all text-slate-400">{scan.model}</p> : null}
    </div>
  );
}

function DiagnosisHero({ scan, crops, fieldName }: { scan: Scan; crops: ScanCrop[]; fieldName: string }) {
  const { t, tx } = useI18n();
  const top = scan.top;
  if (!top) return null;

  const confidence = percent(top.confidence) ?? 0;
  const crop = top.crop ? cropLabelByName(tx, top.crop, crops) : null;
  const spread = top.spreadRisk as keyof typeof spreadBadge | null;

  return (
    <div
      className={cn(
        "rounded-2xl p-5",
        top.healthy ? "bg-gradient-to-br from-emerald-50 to-white text-emerald-950 ring-1 ring-emerald-200" : "bg-navy-950 text-white"
      )}
    >
      <div className="flex items-start gap-4">
        <Thumbnail scan={scan} alt={t("scan.thumbnailAlt", { field: fieldName })} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold tracking-widest uppercase", top.healthy ? "text-emerald-700" : "text-sun-400")}>
            {top.healthy ? t("scan.healthyLeaf") : t("scan.mostLikely", { crop: crop ?? t("common.unknown") })}
          </p>
          <p className="mt-1 font-display text-xl font-bold break-words sm:text-2xl">{top.name}</p>
          {top.pathogen ? <p className={cn("text-sm italic", top.healthy ? "text-emerald-800/70" : "text-white/55")}>{top.pathogen}</p> : null}
        </div>
        {top.healthy ? (
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white sm:flex">
            <Sprout className="h-5 w-5" />
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-sm">
          <span className={top.healthy ? "text-emerald-800/70" : "text-white/60"}>{t("scan.confidence")}</span>
          <span className="font-semibold tabular-nums">{confidence}%</span>
        </div>
        <Meter
          value={confidence}
          tone={top.healthy ? "good" : "sun"}
          label={t("scan.confidence")}
          className={cn("mt-2", top.healthy ? "bg-emerald-100" : "bg-white/10")}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {top.kind ? (
          <Badge variant={top.healthy ? "success" : "navy"}>
            {top.healthy ? <Leaf className="h-3 w-3" /> : null}
            {tx(`scan.kind_${top.kind}`)}
          </Badge>
        ) : null}
        {spread && !top.healthy && spreadBadge[spread] ? (
          <Badge variant={spreadBadge[spread]}>
            <ShieldAlert className="h-3 w-3" />
            {t("scan.spreadValue", { level: tx(`scan.spread_${spread}`) })}
          </Badge>
        ) : null}
        {scan.cropFiltered && crop ? <Badge variant="secondary">{t("scan.cropFiltered", { crop })}</Badge> : null}
      </div>
    </div>
  );
}

export function DiseaseResult({ scan, crops, fieldName }: { scan: Scan; crops: ScanCrop[]; fieldName: string }) {
  const { t, language } = useI18n();
  const top = scan.top;
  const affected = scan.affectedPct;

  if (!top) {
    return (
      <>
        <ResultCard scan={scan} fieldName={fieldName} title={t("scan.stepResult")}>
          <Alert variant="info">{t("scan.notClassified")}</Alert>
          <ModelNote scan={scan} />
        </ResultCard>
        <AiOpinion scan={scan} />
      </>
    );
  }

  return (
    <>
      <ResultCard scan={scan} fieldName={fieldName} title={t("scan.stepResult")}>
        <DiagnosisHero scan={scan} crops={crops} fieldName={fieldName} />

        {top.healthy ? <p className="-mt-2 text-sm text-emerald-800">{t("scan.healthyBody")}</p> : null}

        {scan.lowConfidence ? (
          <Alert>
            <p className="font-semibold">{t("scan.lowConfidenceTitle")}</p>
            <p className="mt-0.5">{t("scan.lowConfidenceBody")}</p>
          </Alert>
        ) : null}

        {affected !== null && !top.healthy ? (
          <div className="rounded-2xl border border-slate-200/80 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{t("scan.affectedArea")}</span>
              <span className="text-slate-600 tabular-nums">{t("scan.affectedValue", { pct: formatNumber(affected, 0, language) })}</span>
            </div>
            <Meter value={affected} tone={affectedTone(affected)} label={t("scan.affectedArea")} className="mt-2" />
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <BulletList title={t("scan.symptoms")} items={top.symptoms} />
          <AlternativeList title={t("scan.alternatives")} items={scan.alternatives} />
        </div>
      </ResultCard>

      <AiOpinion scan={scan} />

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-navy-700" /> {t("scan.actionsNow")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StepList items={top.actions} />
          <CheckList title={t("scan.prevention")} items={top.prevention} />
          {top.crop ? (
            <AiExplain
              id={["scan", scan.id]}
              load={async () => (await api.explainScan(scan.id)).explanation}
              note={t("scan.aiAdviceNote")}
            />
          ) : null}
          <ModelNote scan={scan} />
        </CardContent>
      </Card>
    </>
  );
}

export function PestResult({ scan, fieldName }: { scan: Scan; fieldName: string }) {
  const { t } = useI18n();
  const { ai } = scan;
  const done = ai.status === "done";
  const name = pestName(scan);
  const confidence = percent(ai.confidence ?? scan.top?.confidence);
  const actions = ai.actions?.length ? ai.actions : scan.top?.actions ?? [];
  const waiting = ai.status === "pending" && !isAiStalled(scan);

  return (
    <ResultCard scan={scan} fieldName={fieldName} title={t("scan.pestTitle")}>
      {waiting || !done ? (
        <div className="flex items-center gap-4">
          <Thumbnail scan={scan} alt={t("scan.thumbnailAlt", { field: fieldName })} />
          <div className="min-w-0 flex-1">
            <AiState scan={scan} pendingTitle={t("scan.pestPending")} />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-navy-950 p-5 text-white">
            <div className="flex items-start gap-4">
              <Thumbnail scan={scan} alt={t("scan.thumbnailAlt", { field: fieldName })} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-sun-400 uppercase">
                  <Bug className="h-3.5 w-3.5" /> {t("scan.pestByAi")}
                </p>
                <p className="mt-1 font-display text-xl font-bold break-words sm:text-2xl">{name ?? t("scan.pestNone")}</p>
                {ai.diagnosis && ai.diagnosis !== name ? <p className="mt-0.5 text-sm text-white/60">{ai.diagnosis}</p> : null}
              </div>
            </div>
            {confidence !== null ? (
              <div className="mt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{t("scan.aiConfidence")}</span>
                  <span className="font-semibold tabular-nums">{confidence}%</span>
                </div>
                <Meter
                  value={confidence}
                  tone={confidenceTone(confidence) === "good" ? "sun" : "warning"}
                  label={t("scan.aiConfidence")}
                  className="mt-2 bg-white/10"
                />
              </div>
            ) : null}
          </div>

          {ai.isPlant === false ? <Alert>{t("scan.aiNotPlant")}</Alert> : null}
          {ai.explanation ? <p className="text-sm leading-relaxed text-slate-600">{ai.explanation}</p> : null}
          <StepList title={t("scan.actionsNow")} items={actions} />
          <AlternativeList title={t("scan.alternatives")} items={scan.alternatives} />
          <AiProviderLine scan={scan} />
        </>
      )}
    </ResultCard>
  );
}
