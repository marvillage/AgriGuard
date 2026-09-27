"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Clock, Languages, LoaderCircle, Stethoscope, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { languages } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Priority, Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { priorityMeta, providerLabel, typeMeta } from "./recommendation-meta";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { tx } = useI18n();
  const meta = priorityMeta[priority];
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {tx(meta.label)}
    </Badge>
  );
}

export function RecommendationCard({
  rec,
  compact = false,
  footer,
}: {
  rec: Recommendation;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const { t, tx, language } = useI18n();
  const { user } = useAuth();
  const type = typeMeta[rec.type];
  const TypeIcon = type.icon;
  const typeLabel = tx(`recommendations.type_${rec.type}`);
  const resolved = rec.status !== "OPEN";

  return (
    <article
      className={cn(
        "group flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-300 hover:border-sun-300 hover:shadow-soft sm:gap-4",
        resolved && "bg-slate-50/70"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11",
          type.tone
        )}
        title={typeLabel}
      >
        <TypeIcon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <PriorityBadge priority={rec.priority} />
          {rec.authorId !== null ? (
            <Badge variant="info">
              <Stethoscope className="h-3 w-3" aria-hidden="true" />
              {user?.role === "AGRONOMIST" ? t("recommendations.agronomistNote") : t("recommendations.fromAgronomist")}
            </Badge>
          ) : null}
          <span className="min-w-0 text-xs text-slate-500">
            {typeLabel}
            {rec.fieldName ? " · " : null}
            {rec.fieldId !== null && rec.fieldName ? (
              <Link
                href={`/fields/${rec.fieldId}`}
                className="font-semibold text-navy-700 underline-offset-2 transition-colors hover:text-navy-900 hover:underline"
              >
                {rec.fieldName}
              </Link>
            ) : (
              rec.fieldName
            )}
          </span>
        </div>

        <h3 className={cn("mt-2 font-semibold text-ink", resolved && "text-slate-600")}>{rec.title}</h3>
        <p className={cn("mt-1 text-sm leading-relaxed text-slate-600", compact && "line-clamp-3")}>{rec.message}</p>

        {!compact && rec.authorId !== null ? <NoteTranslation rec={rec} /> : null}

        {!compact && rec.supportingFactors ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">{t("recommendations.why")} </span>
            {rec.supportingFactors}
          </p>
        ) : null}

        {!compact && rec.expectedImpact ? (
          <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <TrendingUp className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">{t("recommendations.expectedImpact")} </span>
              {rec.expectedImpact}
            </span>
          </p>
        ) : null}

        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {timeAgo(rec.createdAt, language)}
          {resolved && rec.resolvedAt ? (
            <span>· {tx(`recommendations.resolved_${rec.status}`, { time: timeAgo(rec.resolvedAt, language) })}</span>
          ) : null}
        </p>

        {footer}
      </div>
    </article>
  );
}

// Agronomist notes are free text, so they are translated on request by the AI layer.
function NoteTranslation({ rec }: { rec: Recommendation }) {
  const { t, language } = useI18n();
  const translate = useMutation({ mutationFn: () => api.translate(`${rec.title}\n\n${rec.message}`, language) });
  const languageName = languages.find((item) => item.code === language)?.native ?? language;

  if (translate.data) {
    const [title, ...body] = translate.data.text.split(/\n+/).filter(Boolean);
    return (
      <div className="mt-3 rounded-xl border border-navy-100 bg-navy-50/60 p-3" lang={language}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-800">
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          {t("recommendations.translatedTo", { language: languageName })}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink">{title}</p>
        {body.length ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{body.join(" ")}</p> : null}
        <p className="mt-2 text-[11px] text-slate-400">
          {t("common.poweredBy", { provider: providerLabel(translate.data.provider, t("common.rulesEngine")) })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => translate.mutate()} disabled={translate.isPending}>
        {translate.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
        {translate.isPending ? t("recommendations.translating") : t("recommendations.translateTo", { language: languageName })}
      </Button>
      {translate.isError ? <p className="mt-1 text-xs text-red-700">{translate.error.message}</p> : null}
    </div>
  );
}
