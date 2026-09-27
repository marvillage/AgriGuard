"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";
import { providerLabel, type RecStatus } from "./recommendation-meta";

export function RecommendationActions({ rec }: { rec: Recommendation }) {
  const { t, tx } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showExplanation, setShowExplanation] = useState(false);

  const status = useMutation({
    mutationFn: (next: RecStatus) => api.setRecommendationStatus(rec.id, next),
    onSuccess: (result, next) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ tone: "success", title: tx(`recommendations.toast_${next}`), body: rec.title });
    },
    onError: (error) => toast({ tone: "critical", title: t("recommendations.updateError"), body: error.message }),
  });

  const explain = useMutation({
    mutationFn: async () => (await api.explainRecommendation(rec.id)).explanation,
  });

  const toggleExplanation = () => {
    if (showExplanation) {
      setShowExplanation(false);
      return;
    }
    setShowExplanation(true);
    if (!explain.data && !explain.isPending) explain.mutate();
  };

  const pendingIcon = (target: RecStatus, icon: React.ReactNode) =>
    status.isPending && status.variables === target ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : icon;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {rec.status === "OPEN" ? (
          <>
            <Button size="sm" variant="dark" disabled={status.isPending} onClick={() => status.mutate("DONE")}>
              {pendingIcon("DONE", <Check className="h-3.5 w-3.5" />)}
              {t("recommendations.markDone")}
            </Button>
            <Button size="sm" variant="secondary" disabled={status.isPending} onClick={() => status.mutate("DISMISSED")}>
              {pendingIcon("DISMISSED", <X className="h-3.5 w-3.5" />)}
              {t("recommendations.dismiss")}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" disabled={status.isPending} onClick={() => status.mutate("OPEN")}>
            {pendingIcon("OPEN", <RotateCcw className="h-3.5 w-3.5" />)}
            {t("recommendations.reopen")}
          </Button>
        )}
        <Button size="sm" variant="ghost" aria-expanded={showExplanation} onClick={toggleExplanation}>
          <Sparkles className="h-3.5 w-3.5 text-sun-600" />
          {showExplanation ? t("recommendations.hideExplanation") : t("recommendations.explain")}
        </Button>
      </div>

      {showExplanation ? (
        <div className="mt-3 animate-fade-in" aria-live="polite">
          {explain.isPending ? (
            <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-navy-800">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("recommendations.explaining")}
              </p>
              <div className="mt-3 space-y-2" aria-hidden="true">
                <div className="h-3 w-full animate-pulse rounded bg-navy-100/70" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-navy-100/70" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-navy-100/70" />
              </div>
            </div>
          ) : explain.isError ? (
            <Alert variant="destructive">
              <p>{t("recommendations.explainError")}</p>
              <button
                type="button"
                onClick={() => explain.mutate()}
                className="mt-1 cursor-pointer font-semibold underline underline-offset-2"
              >
                {t("common.retry")}
              </button>
            </Alert>
          ) : explain.data ? (
            <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{explain.data.text}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Sparkles className="h-3 w-3 text-sun-600" aria-hidden="true" />
                {t("common.poweredBy", { provider: providerLabel(explain.data.provider, t("common.rulesEngine")) })}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
