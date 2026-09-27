"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { providerLabel } from "@/components/recommendations/recommendation-meta";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";

export function BriefingCard() {
  const { t, language } = useI18n();
  const query = useQuery({
    queryKey: ["briefing", language],
    queryFn: async () => (await api.briefing()).briefing,
    staleTime: 30 * 60_000,
  });

  const lines = (query.data?.text ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[•*-]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sun-200 bg-gradient-to-br from-sun-50 via-white to-white p-5 shadow-soft sm:p-6">
      <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-sun-200/50 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-sun-700 uppercase">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t("dashboard.briefingEyebrow")}
        </p>

        {query.isLoading ? (
          <div className="mt-3 space-y-3" aria-busy="true" aria-label={t("common.loading")}>
            <div className="h-5 w-1/2 animate-pulse rounded-lg bg-sun-100" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-11/12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : query.isError || !query.data ? (
          <p className="mt-3 text-sm text-slate-500">{t("dashboard.briefingError")}</p>
        ) : (
          <>
            <h2 className="mt-2 font-display text-lg font-bold text-ink">{query.data.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {lines.map((line, index) => (
                <li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-ink">
                    {index + 1}
                  </span>
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] font-medium text-slate-400">
              {t("common.poweredBy", { provider: providerLabel(query.data.provider, t("common.rulesEngine")) })}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
