"use client";

import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Droplets, LoaderCircle, Radar } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { providerName } from "./provider-label";

const visibleFields = 5;

function Loading() {
  const { t } = useI18n();
  return (
    <p className="flex items-center gap-2 text-sm text-slate-500">
      <LoaderCircle className="h-4 w-4 animate-spin" /> {t("common.loading")}
    </p>
  );
}

function FieldsCard() {
  const { t, language } = useI18n();
  const dashboard = useQuery({ queryKey: ["dashboard", language], queryFn: () => api.dashboard() });
  const fields = dashboard.data?.fields ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-navy-700" /> {t("copilot.contextTitle")}
        </CardTitle>
        <p className="text-xs text-slate-500">{t("copilot.contextBody")}</p>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {dashboard.isPending ? (
          <Loading />
        ) : dashboard.isError ? (
          <Alert variant="destructive">{t("common.error")}</Alert>
        ) : fields.length === 0 ? (
          <p className="text-sm text-slate-500">{t("copilot.noFields")}</p>
        ) : (
          <>
            {fields.slice(0, visibleFields).map((field) => {
              const dry = field.moisture !== null && field.moisture < field.refillPoint;
              return (
                <div key={field.id} className="rounded-xl bg-slate-50 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{field.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {field.crop ? `${field.crop.name} · ` : ""}
                        {field.farmName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("flex items-center justify-end gap-1 text-sm font-semibold tabular-nums", dry ? "text-amber-700" : "text-navy-800")}>
                        <Droplets className="h-3.5 w-3.5" />
                        {field.moisture !== null ? `${formatNumber(field.moisture, 1, language)}%` : "–"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {field.moisture !== null ? t("copilot.refillAt", { value: formatNumber(field.refillPoint, 1, language) }) : t("copilot.noReading")}
                      </p>
                    </div>
                  </div>
                  {field.action?.message ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{field.action.message}</p> : null}
                </div>
              );
            })}
            {fields.length > visibleFields ? (
              <p className="text-xs text-slate-400">{t("copilot.moreFields", { count: fields.length - visibleFields })}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AiStatusCard() {
  const { t } = useI18n();
  const status = useQuery({ queryKey: ["ai", "status"], queryFn: () => api.aiStatus(), staleTime: 60_000 });
  const providers = status.data?.providers ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-navy-700" /> {t("copilot.aiStatusTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {status.isPending ? (
          <Loading />
        ) : status.isError ? (
          <Alert variant="destructive">{t("copilot.aiStatusFailed")}</Alert>
        ) : (
          <>
            <ul className="space-y-2">
              {providers.map((item) => (
                <li
                  key={item.provider}
                  className={cn("rounded-xl px-3.5 py-2.5", item.configured ? "bg-emerald-50/70 ring-1 ring-emerald-200/70" : "bg-slate-50")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className={cn("h-2 w-2 rounded-full", item.configured ? "bg-emerald-500" : "bg-slate-300")} />
                      {providerName(item.provider)}
                    </span>
                    <Badge variant={item.configured ? "success" : "secondary"}>{item.configured ? t("copilot.aiActive") : t("copilot.aiOff")}</Badge>
                  </div>
                  {item.configured && (item.textModel || item.visionModel) ? (
                    <div className="mt-1.5 space-y-0.5 pl-4 font-mono text-[11px] text-slate-500">
                      {item.textModel ? <p className="break-all">{t("copilot.textModel", { model: item.textModel })}</p> : null}
                      {item.visionModel ? <p className="break-all">{t("copilot.visionModel", { model: item.visionModel })}</p> : null}
                    </div>
                  ) : null}
                  {item.error ? <p className="mt-1 pl-4 text-[11px] break-words text-red-600">{item.error}</p> : null}
                </li>
              ))}
            </ul>
            {status.data?.available ? (
              <p className="text-xs leading-relaxed text-slate-400">{t("copilot.aiFallback")}</p>
            ) : (
              <Alert variant="info">{t("copilot.aiNone")}</Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CopilotContext() {
  return (
    <div className="space-y-6">
      <FieldsCard />
      <AiStatusCard />
    </div>
  );
}
