"use client";

import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { Trial } from "@/lib/types";
import { cn } from "@/lib/utils";

function parseYield(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

export function YieldResult({ change, className }: { change: number | null; className?: string }) {
  const { t, language } = useI18n();
  if (change === null) return null;
  const value = formatNumber(Math.abs(change), 1, language);
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Scale;
  const text =
    change > 0
      ? t("trials.yieldResultUp", { value })
      : change < 0
        ? t("trials.yieldResultDown", { value })
        : t("trials.yieldResultSame");

  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
        change < 0 ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

export function TrialHarvest({ trial, canEdit }: { trial: Trial; canEdit: boolean }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const treatmentId = useId();
  const controlId = useId();
  const [treatment, setTreatment] = useState(trial.treatmentYieldKg === null ? "" : String(trial.treatmentYieldKg));
  const [control, setControl] = useState(trial.controlYieldKg === null ? "" : String(trial.controlYieldKg));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { treatmentYieldKg: number | null; controlYieldKg: number | null }) => api.updateTrial(trial.id, body),
    onSuccess: async () => {
      toast({ title: t("trials.yieldSaved"), tone: "success" });
      await queryClient.invalidateQueries({ queryKey: ["trials", trial.farmId] });
    },
    onError: (failure) => {
      toast({ title: t("trials.actionFailed"), body: failure instanceof Error ? failure.message : undefined, tone: "critical" });
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const treatmentYieldKg = parseYield(treatment);
    const controlYieldKg = parseYield(control);
    if (Number.isNaN(treatmentYieldKg) || Number.isNaN(controlYieldKg)) {
      setError(t("trials.yieldInvalid"));
      return;
    }
    setError(null);
    mutation.mutate({ treatmentYieldKg, controlYieldKg });
  };

  const unchanged =
    parseYield(treatment) === trial.treatmentYieldKg && parseYield(control) === trial.controlYieldKg;

  if (!canEdit) {
    const show = (value: number | null) =>
      value === null ? t("trials.yieldNotRecorded") : t("trials.yieldKg", { value: formatNumber(value, 0, language) });
    return (
      <div className="max-w-3xl space-y-3">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t("trials.yieldTreatment")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{show(trial.treatmentYieldKg)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{t("trials.yieldControl")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{show(trial.controlYieldKg)}</dd>
          </div>
        </dl>
        <YieldResult change={trial.results.yieldChangePct} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={treatmentId}>{t("trials.yieldTreatment")}</Label>
          <Input
            id={treatmentId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={treatment}
            onChange={(event) => setTreatment(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={controlId}>{t("trials.yieldControl")}</Label>
          <Input
            id={controlId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={control}
            onChange={(event) => setControl(event.target.value)}
          />
        </div>
        <Button type="submit" variant="dark" className="h-11" disabled={mutation.isPending || unchanged}>
          {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {mutation.isPending ? t("trials.yieldSaving") : t("trials.yieldSave")}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <YieldResult change={trial.results.yieldChangePct} />
    </form>
  );
}
