"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Droplets, MapPin, Phone, TriangleAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatLitres, timeAgo } from "@/lib/format";
import type { AdvisorFarm, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldHeaderRow, FieldRow, worstRisk } from "./field-row";
import { NoteDialog } from "./note-dialog";
import { riskLevel } from "./risk-meter";

const priorityBadge: Record<Priority, "danger" | "warning" | "info" | "secondary"> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "secondary",
};

const alertCard = "block h-full rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200";

const riskAccent = {
  High: "bg-red-500",
  Moderate: "bg-amber-400",
  Low: "bg-emerald-500",
};

export function FarmCard({ item }: { item: AdvisorFarm }) {
  const { t, tx, language } = useI18n();
  const [noteField, setNoteField] = useState<{ id: number; name: string } | null>(null);
  const fields = useMemo(() => [...item.fields].sort((a, b) => worstRisk(b) - worstRisk(a)), [item.fields]);
  const level = riskLevel(item.fields.length ? item.worstRisk : null);
  const ownerName = item.owner?.name ?? t("advisor.unknownFarmer");
  const hiddenAlerts = Math.max(0, item.openAlerts - item.topAlerts.length);

  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute inset-y-0 left-0 w-1", level ? riskAccent[level] : "bg-slate-200")} aria-hidden="true" />

      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">{item.farm.name}</h2>
            <Badge variant={item.access === "advisor" ? "navy" : "secondary"}>{tx(`advisor.access_${item.access}`)}</Badge>
          </div>
          {item.farm.location ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.farm.location}</span>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {item.criticalAlerts > 0 ? (
              <Badge variant="danger">
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                {t("advisor.criticalAlerts", { count: item.criticalAlerts })}
              </Badge>
            ) : null}
            <Badge variant={item.openAlerts > 0 ? "warning" : "success"}>{t("advisor.openAlerts", { count: item.openAlerts })}</Badge>
            <Badge variant="info">
              <Droplets className="h-3 w-3" aria-hidden="true" />
              {t("advisor.waterSaved", { value: formatLitres(item.waterSavedL, language) })}
            </Badge>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 lg:w-72 lg:shrink-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-sun-400">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{ownerName}</p>
            {item.owner?.phone ? (
              <a
                href={`tel:${item.owner.phone.replace(/[^\d+]/g, "")}`}
                aria-label={t("advisor.callFarmer", { name: ownerName })}
                className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 underline-offset-4 hover:text-navy-900 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {item.owner.phone}
              </a>
            ) : (
              <p className="text-xs text-slate-400">{t("advisor.noPhone")}</p>
            )}
          </div>
        </div>
      </div>

      <section aria-label={t("advisor.fieldsTitle")} className="px-5 pb-5 sm:px-6 xl:px-0 xl:pb-2">
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 xl:mx-6">{t("advisor.noFields")}</p>
        ) : (
          <>
            <FieldHeaderRow />
            <ul className="space-y-3 xl:space-y-0">
              {fields.map((field) => (
                <FieldRow key={field.id} field={field} onAddNote={() => setNoteField({ id: field.id, name: field.name })} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby={`alerts-${item.farm.id}`} className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id={`alerts-${item.farm.id}`} className="font-display text-sm font-semibold text-ink">
            {t("advisor.topAlerts")}
          </h3>
          {hiddenAlerts > 0 ? <span className="text-xs text-slate-500">{t("advisor.moreAlerts", { count: hiddenAlerts })}</span> : null}
        </div>
        {item.topAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">{t("advisor.noAlerts")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {item.topAlerts.map((alert) => {
              const body = (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={priorityBadge[alert.priority]}>{tx(`common.${alert.priority.toLowerCase()}`)}</Badge>
                    <span className="text-xs text-slate-500">{tx(`advisor.type_${alert.type}`)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{alert.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{alert.message}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{timeAgo(alert.createdAt, language)}</p>
                </>
              );
              return (
                <li key={alert.id}>
                  {alert.fieldId ? (
                    <Link href={`/fields/${alert.fieldId}`} className={cn(alertCard, "hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-soft")}>
                      {body}
                    </Link>
                  ) : (
                    <div className={alertCard}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {noteField ? <NoteDialog field={noteField} farmerName={ownerName} onClose={() => setNoteField(null)} /> : null}
    </Card>
  );
}
