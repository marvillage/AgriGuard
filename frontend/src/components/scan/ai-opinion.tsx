"use client";

import { BrainCircuit, Cpu, LoaderCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { providerName } from "@/components/copilot/provider-label";
import { useI18n } from "@/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { Scan } from "@/lib/types";
import { affectedTone, confidenceTone, isAiStalled, percent } from "./scan-helpers";
import { StepList } from "./scan-lists";

export function AiPending({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-navy-50/70 p-4">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-soft">
        <LoaderCircle className="h-5 w-5 animate-spin text-navy-700" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="mt-0.5 text-xs text-navy-900/60">{hint}</p>
      </div>
    </div>
  );
}

export function AiState({ scan, pendingTitle }: { scan: Scan; pendingTitle: string }) {
  const { t } = useI18n();
  const { ai } = scan;

  if (isAiStalled(scan)) return <Alert variant="info">{t("scan.aiStalled")}</Alert>;
  if (ai.status === "pending") return <AiPending title={pendingTitle} hint={t("scan.aiPendingHint")} />;
  if (ai.status === "unavailable") return <Alert variant="info">{t("scan.aiUnavailable")}</Alert>;
  if (ai.status === "failed") return <Alert variant="destructive">{t("scan.aiFailed")}</Alert>;
  return null;
}

export function AiProviderLine({ scan }: { scan: Scan }) {
  const { t } = useI18n();
  if (scan.ai.status !== "done" || !scan.ai.provider) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-400">
      <Cpu className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 break-all">
        {scan.ai.model ? t("scan.aiBy", { provider: providerName(scan.ai.provider), model: scan.ai.model }) : providerName(scan.ai.provider)}
      </span>
    </p>
  );
}

export function AiOpinion({ scan }: { scan: Scan }) {
  const { t, language } = useI18n();
  const { ai } = scan;
  const confidence = percent(ai.confidence);
  const done = ai.status === "done";

  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-navy-700" /> {t("scan.aiTitle")}
        </CardTitle>
        {done && typeof ai.agreesWithModel === "boolean" && scan.top ? (
          <Badge variant={ai.agreesWithModel ? "success" : "warning"}>
            {ai.agreesWithModel ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
            {ai.agreesWithModel ? t("scan.aiAgrees") : t("scan.aiDisagrees")}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <AiState scan={scan} pendingTitle={t("scan.aiPending")} />
        {done ? (
          <>
            {ai.isPlant === false ? <Alert>{t("scan.aiNotPlant")}</Alert> : null}
            {ai.diagnosis ? <p className="font-display text-lg font-semibold break-words text-ink">{ai.diagnosis}</p> : null}
            {confidence !== null ? (
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t("scan.aiConfidence")}</span>
                  <span className="font-semibold text-ink tabular-nums">{confidence}%</span>
                </div>
                <Meter value={confidence} tone={confidenceTone(confidence)} label={t("scan.aiConfidence")} className="mt-1.5 h-1.5" />
              </div>
            ) : null}
            {typeof ai.damagePct === "number" ? (
              <div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">{t("scan.aiDamage")}</span>
                  <span className="font-semibold text-ink tabular-nums">{t("scan.affectedValue", { pct: formatNumber(ai.damagePct, 0, language) })}</span>
                </div>
                <Meter value={ai.damagePct} tone={affectedTone(ai.damagePct)} label={t("scan.aiDamage")} className="mt-1.5 h-1.5" />
              </div>
            ) : null}
            {ai.explanation ? <p className="text-sm leading-relaxed text-slate-600">{ai.explanation}</p> : null}
            <StepList title={t("scan.aiActions")} items={ai.actions ?? []} />
            <AiProviderLine scan={scan} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
