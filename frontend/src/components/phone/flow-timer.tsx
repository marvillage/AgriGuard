"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CirclePlay, CircleStop, Save, X } from "lucide-react";
import { errorText, FieldGroup, parseNumber, useNow } from "@/components/field/ops/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { FieldOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseFlowTest } from "./pump-controller";

const presets = [10, 15, 20];
const maxFills = 5;

function Stopwatch({ since }: { since: number }) {
  const now = useNow(100);
  return <>{((now - since) / 1000).toFixed(1)} s</>;
}

export function FlowTimer({ overview }: { overview: FieldOverview }) {
  const { t, tx, number, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { field } = overview;
  const readOnly = overview.access === "advisor";
  const [bucket, setBucket] = useState("15");
  const [fills, setFills] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const litres = parseNumber(bucket);
  const bucketValid = litres !== null && litres > 0 && litres <= 1000;
  const rates = bucketValid ? fills.map((seconds) => (litres / seconds) * 60) : [];
  const average = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null;
  const spread = average && rates.length >= 2 ? Math.round(((Math.max(...rates) - Math.min(...rates)) / average) * 100) : null;
  const saved = parseFlowTest(field.pumpFlowTest);

  const startStop = () => {
    if (startedAt === null) {
      setWarning(null);
      setStartedAt(Date.now());
      return;
    }
    const seconds = Math.round((Date.now() - startedAt) / 100) / 10;
    setStartedAt(null);
    if (seconds < 1) {
      setWarning(t("phone.tooShort"));
      return;
    }
    setFills((current) => [...current, seconds].slice(0, maxFills));
  };

  const save = useMutation({
    mutationFn: () => api.flowTest(field.id, { bucketLitres: litres ?? 0, seconds: fills }),
    onSuccess: async ({ field: updated }) => {
      setFills([]);
      toast({ tone: "success", title: t("phone.flowSaved"), body: t("phone.flowSavedBody", { field: updated.name, lpm: number(updated.pumpFlowLpm ?? 0, 1) }) });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["field", field.id] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);
    },
    onError: (error) => toast({ tone: "critical", title: t("phone.saveFailed"), body: errorText(error, t("common.error")) }),
  });

  const currentText = saved
    ? t("phone.currentMeasured", {
        lpm: number(saved.lpm, 1),
        date: formatDate(saved.measuredAt, language, { day: "numeric", month: "short", year: "numeric" }),
        count: number(saved.seconds.length),
        litres: number(saved.bucketLitres),
      })
    : field.pumpFlowLpm
      ? t("phone.currentTyped", { lpm: number(field.pumpFlowLpm, 1) })
      : t("phone.currentNone", { lpm: number(overview.decision.plan.flowLpm), method: tx(`farms.method_${overview.decision.plan.method}`).toLowerCase() });

  return (
    <div className="space-y-4">
      {readOnly ? <Alert variant="info">{t("phone.readOnly")}</Alert> : null}
      <Alert variant="info">{currentText}</Alert>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <FieldGroup label={t("phone.bucketSize")} htmlFor="bucket-litres" hint={t("phone.bucketHint")}>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="bucket-litres"
                type="number"
                inputMode="decimal"
                min={1}
                max={1000}
                value={bucket}
                disabled={startedAt !== null || fills.length > 0}
                onChange={(event) => setBucket(event.target.value)}
                className="w-28"
                aria-invalid={!bucketValid}
              />
              {presets.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={startedAt !== null || fills.length > 0}
                  onClick={() => setBucket(String(value))}
                  className={cn(
                    "h-10 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    Number(bucket) === value ? "bg-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                  )}
                >
                  {number(value)} L
                </button>
              ))}
            </div>
          </FieldGroup>

          <button
            type="button"
            onClick={startStop}
            disabled={!bucketValid || fills.length >= maxFills || readOnly}
            className={cn(
              "flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl font-display text-2xl font-bold shadow-soft transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
              startedAt === null ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {startedAt === null ? <CirclePlay className="h-9 w-9" aria-hidden="true" /> : <CircleStop className="h-9 w-9" aria-hidden="true" />}
            <span>{startedAt === null ? t("phone.start") : t("phone.stop")}</span>
            {startedAt !== null ? (
              <span className="text-lg font-semibold text-white/90 tabular-nums">
                <Stopwatch since={startedAt} />
              </span>
            ) : null}
          </button>
          {warning ? <p className="text-sm text-red-700">{warning}</p> : null}
          {fills.length >= maxFills ? <p className="text-sm text-slate-500">{t("phone.maxFills")}</p> : null}

          {fills.length ? (
            <ol className="space-y-2">
              {fills.map((seconds, index) => (
                <li key={`${seconds}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-ink">{t("phone.fill", { n: number(index + 1) })}</span>
                  <span className="text-slate-600 tabular-nums">{t("phone.fillResult", { seconds: number(seconds, 1), lpm: number(rates[index] ?? 0, 1) })}</span>
                  <button
                    type="button"
                    onClick={() => setFills((current) => current.filter((fill, position) => position !== index))}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                    aria-label={t("phone.discard")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">{t("phone.repeatHint")}</p>
          )}

          {average !== null ? (
            <div className="rounded-2xl bg-navy-50/70 p-4 ring-1 ring-navy-100">
              <p className="text-xs font-semibold text-navy-800">{t("phone.averageLabel", { count: number(fills.length) })}</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy-900 tabular-nums">{t("phone.average", { lpm: number(average, 1) })}</p>
              {spread !== null && spread > 10 ? <p className="mt-1 text-sm text-amber-800">{t("phone.spread", { pct: number(spread) })}</p> : null}
              {fills.length < 3 ? <p className="mt-1 text-sm text-slate-600">{t("phone.repeatHint")}</p> : null}
            </div>
          ) : null}

          <Button type="button" variant="dark" className="w-full" disabled={!fills.length || !bucketValid || readOnly || save.isPending} onClick={() => save.mutate()}>
            <Save className="h-4 w-4" />
            {t("phone.saveFlow", { lpm: number(average ?? 0, 1) })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
