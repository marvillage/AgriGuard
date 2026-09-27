"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CircleCheck, CircleDashed, Cpu, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EnvList } from "./env-list";
import { SectionIcon } from "./section-icon";

const providerOrder = ["gemini", "groq", "openrouter", "ollama"];
const setupVars = [
  { name: "GEMINI_API_KEY", hint: "settings.env_gemini" },
  { name: "GROQ_API_KEY", hint: "settings.env_groq" },
  { name: "OPENROUTER_API_KEY", hint: "settings.env_openrouter" },
  { name: "OLLAMA_URL", hint: "settings.env_ollama" },
] as const;
const modelVars = ["GEMINI_MODEL", "GROQ_MODEL", "OPENROUTER_MODEL", "OLLAMA_MODEL"];

export function AiCard() {
  const { t, tx } = useI18n();
  const query = useQuery({ queryKey: ["settings", "ai-status"], queryFn: api.aiStatus, staleTime: 60_000 });
  const providers = [...(query.data?.providers ?? [])].sort((a, b) => providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider));

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={Cpu} className="bg-navy-50 text-navy-800" />
        <div className="min-w-0 flex-1">
          <CardTitle>{t("settings.aiTitle")}</CardTitle>
          <CardDescription>{t("settings.aiBody")}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label={t("common.refresh")}
          title={t("common.refresh")}
          className="-mt-1 -mr-2 shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? (
          <div className="space-y-2" aria-busy="true">
            {providerOrder.map((name) => (
              <div key={name} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">{t("settings.loadError")}</Alert>
        ) : (
          <>
            {!query.data.available ? <Alert variant="default">{t("settings.aiNoneActive")}</Alert> : null}
            <ul className="space-y-2">
              {providers.map((provider) => (
                <li
                  key={provider.provider}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                    provider.configured ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200/80 bg-white"
                  )}
                >
                  {provider.configured ? (
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{tx(`settings.provider_${provider.provider}`)}</span>
                      <Badge variant={provider.configured ? "success" : "secondary"}>
                        {provider.configured ? t("settings.aiActive") : t("settings.aiInactive")}
                      </Badge>
                    </div>
                    {provider.configured ? (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs break-all text-slate-600">
                        {provider.textModel ? <span>{t("settings.aiTextModel", { model: provider.textModel })}</span> : null}
                        <span>{provider.visionModel ? t("settings.aiVisionModel", { model: provider.visionModel }) : t("settings.aiNoVision")}</span>
                      </div>
                    ) : null}
                    {provider.error ? <p className="mt-1 text-xs break-words text-red-700">{provider.error}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{t("settings.aiFallback")}</p>
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            {[...providerOrder, "rules"].map((name, index) => {
              const active = name === "rules" || providers.some((provider) => provider.provider === name && provider.configured);
              return (
                <li key={name} className="flex items-center gap-1.5">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" /> : null}
                  <span className={cn("rounded-full px-2.5 py-1 ring-1", active ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-slate-500 ring-slate-200")}>
                    {name === "rules" ? t("settings.aiRules") : tx(`settings.provider_${name}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <details className="group rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {t("settings.aiSetupTitle")}
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-2 text-xs text-slate-600">{t("settings.aiSetupBody")}</p>
          <EnvList items={setupVars.map((item) => ({ name: item.name, hint: t(item.hint) }))} />
          <p className="mt-3 text-xs text-slate-600">{t("settings.aiSetupOptional")}</p>
          <EnvList items={modelVars.map((name) => ({ name }))} />
        </details>
      </CardContent>
    </Card>
  );
}
