"use client";

import { useState } from "react";
import { Check, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatNumber, formatRupees, toDate } from "@/lib/format";
import type { ImpactSummary, LedgerEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { entryKindLabel, entryMethodLabel, shortHash } from "./impact-labels";

const pageSize = 10;
const apiEntryLimit = 100;

export function SavingsLedger({
  ledger,
  entries,
  fields,
  className,
}: {
  ledger: ImpactSummary["ledger"];
  entries: LedgerEntry[];
  fields: ImpactSummary["fields"];
  className?: string;
}) {
  const { t, tx, language } = useI18n();
  const [visible, setVisible] = useState(pageSize);
  const shown = entries.slice(0, visible);

  const period = (entry: LedgerEntry) => {
    const start = formatDate(entry.periodStart, language);
    const end = formatDate(entry.periodEnd, language);
    const sameDay = toDate(entry.periodStart)?.getTime() === toDate(entry.periodEnd)?.getTime();
    return sameDay ? start : t("sustainability.pendingPeriod", { start, end });
  };

  const litres = (value: number | null) => formatNumber(value, 0, language);

  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <CardTitle>{t("sustainability.ledgerTitle")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t("sustainability.ledgerDescription")}</p>
        </div>
        {ledger.verified ? (
          <Badge variant="success" className="px-3 py-1 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("sustainability.ledgerVerified")}
          </Badge>
        ) : (
          <Badge variant="danger" className="px-3 py-1 text-sm">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {t("sustainability.ledgerBroken")}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{t("sustainability.ledgerEntries")}</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{formatNumber(ledger.entries, 0, language)}</p>
            <p className={cn("mt-0.5 text-xs", ledger.verified ? "text-emerald-700" : "text-red-700")}>
              {ledger.verified
                ? t("sustainability.ledgerVerifiedBody", { count: ledger.entries })
                : t("sustainability.ledgerBrokenBody", { broken: ledger.broken, count: ledger.entries })}
            </p>
          </div>
          <HashTile label={t("sustainability.ledgerFirstHash")} hash={ledger.firstHash} />
          <HashTile label={t("sustainability.ledgerLastHash")} hash={ledger.lastHash} />
        </div>

        {entries.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">{t("sustainability.ledgerEmpty")}</p>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("sustainability.colPeriod")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("sustainability.colField")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("sustainability.colKind")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("sustainability.colMethod")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("sustainability.colBaselineL")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("sustainability.colUsedL")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("sustainability.colSavedL")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("sustainability.colKwh")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">{t("sustainability.colRupees")}</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">{t("sustainability.colHash")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {shown.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 text-slate-700">{period(entry)}</td>
                      <td className="px-3 py-2.5 font-medium text-ink">{fields.find((field) => field.fieldId === entry.fieldId)?.name ?? `#${entry.fieldId}`}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={entry.kind === "FERTILIZER" ? "success" : "navy"}>{entryKindLabel(tx, entry.kind)}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{entryMethodLabel(tx, entry.method)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{litres(entry.baselineWater)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{litres(entry.waterUsed)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-ink">{litres(entry.waterSaved)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatNumber(entry.kwhSaved, 1, language)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatRupees(entry.rupeesSaved, language)}</td>
                      <td className="px-3 py-2.5">
                        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600" title={entry.hash ?? undefined}>
                          {shortHash(entry.hash)}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {t("sustainability.showingCount", { shown: shown.length, total: entries.length })}
                {entries.length >= apiEntryLimit ? ` · ${t("sustainability.ledgerLatestNote", { count: entries.length })}` : null}
              </p>
              {visible < entries.length ? (
                <Button variant="secondary" size="sm" onClick={() => setVisible((count) => count + pageSize * 2)}>
                  {t("sustainability.showMore")}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HashTile({ label, hash }: { label: string; hash: string | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast({ title: t("sustainability.hashCopied"), tone: "success" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: t("sustainability.copyFailed"), tone: "warning" });
    }
  };

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <code className="truncate font-mono text-sm font-semibold text-ink" title={hash ?? undefined}>
          {shortHash(hash)}
        </code>
        {hash ? (
          <button
            type="button"
            onClick={copy}
            aria-label={`${t("sustainability.copyHash")}: ${label}`}
            title={t("sustainability.copyHash")}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-navy-200 hover:text-ink"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
