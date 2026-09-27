"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CloudRain, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Decision, FieldOverview } from "@/lib/types";
import { EmptyState, opsKeys, useCodeLabel } from "./shared";

type Tone = "default" | "secondary" | "navy" | "success" | "warning" | "danger" | "info";

const tones: Record<string, Tone> = {
  IRRIGATE: "info",
  RUNNING: "info",
  SKIP_RAIN: "navy",
  SKIP_WET: "success",
  TARGET_REACHED: "success",
  WAIT_SOLAR: "default",
  BLOCKED_TANK: "danger",
  NO_FLOW: "danger",
  NO_DATA: "warning",
  OUTSIDE_WINDOW: "secondary",
  MANUAL_ON: "navy",
  MANUAL_OFF: "navy",
  SCHEDULE: "navy",
};

export function actionTone(action: string): Tone {
  return tones[action] ?? "secondary";
}

function reasonParams(decision: Decision) {
  try {
    const parsed: unknown = JSON.parse(decision.reason ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string | number>) : {};
  } catch {
    return {};
  }
}

const pageSize = 8;

export function DecisionLog({ overview }: { overview: FieldOverview }) {
  const { t, number, language } = useI18n();
  const codeLabel = useCodeLabel();
  const [showAll, setShowAll] = useState(false);
  const fieldId = overview.field.id;
  const query = useQuery({
    queryKey: opsKeys.decisions(fieldId),
    queryFn: async () => (await api.decisions(fieldId)).decisions,
    placeholderData: overview.decisions,
  });
  const decisions = query.data ?? [];
  const messages = new Map(overview.decisions.map((decision) => [decision.id, decision.message]));
  const visible = showAll ? decisions : decisions.slice(0, pageSize);

  const messageFor = (decision: Decision) => {
    const known = decision.message ?? messages.get(decision.id);
    if (known) return known;
    const params = Object.fromEntries(
      Object.entries(reasonParams(decision)).map(([key, value]) => [key, typeof value === "number" ? number(value, 1) : value])
    );
    return codeLabel("decisionText", decision.action, params);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("fieldOps.decisionLogTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("fieldOps.decisionLogSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {decisions.length === 0 ? (
          <EmptyState icon={Bot} title={t("fieldOps.decisionLogEmpty")} />
        ) : (
          <>
            <ol className="relative space-y-1">
              {visible.map((decision) => (
                <li key={decision.id} className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50">
                  <time className="w-16 shrink-0 pt-0.5 text-xs text-slate-500 tabular-nums sm:w-24">
                    {formatDate(decision.decidedAt, language, { day: "numeric", month: "short" })}
                    <span className="block text-slate-400">{formatDate(decision.decidedAt, language, { hour: "numeric", minute: "2-digit" })}</span>
                  </time>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionTone(decision.action)}>{codeLabel("action", decision.action)}</Badge>
                      {decision.soilMoisture !== null ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                          <Droplets className="h-3 w-3" aria-hidden="true" />
                          {decision.refillPoint !== null
                            ? t("fieldOps.moistureVsRefill", { moisture: number(decision.soilMoisture, 1), refill: number(decision.refillPoint, 1) })
                            : `${number(decision.soilMoisture, 1)}%`}
                        </span>
                      ) : null}
                      {decision.rainNext24Mm ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                          <CloudRain className="h-3 w-3" aria-hidden="true" />
                          {t("fieldOps.rainMm", { mm: number(decision.rainNext24Mm, 1) })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{messageFor(decision)}</p>
                  </div>
                </li>
              ))}
            </ol>
            {decisions.length > pageSize ? (
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((value) => !value)}>
                {showAll ? t("fieldOps.showLess") : t("fieldOps.showAll", { count: decisions.length })}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
