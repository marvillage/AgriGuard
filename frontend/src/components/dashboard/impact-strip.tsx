"use client";

import Link from "next/link";
import { ArrowUpRight, Droplets, Gauge, IndianRupee, Leaf, Percent, Zap } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatCo2, formatLitres, formatNumber, formatRupees } from "@/lib/format";
import type { ImpactTotals } from "@/lib/types";

export function ImpactStrip({ totals }: { totals: ImpactTotals }) {
  const { t, language } = useI18n();
  // Savings are only counted from recorded pump use, so a farm without pump data shows why instead of zeros.
  const empty = totals.litresUsed === 0 && totals.litresSaved === 0 && totals.rupeesSaved === 0 && totals.ureaKgSaved === 0;
  const tiles = [
    { icon: Droplets, label: t("dashboard.impactWater"), value: formatLitres(totals.litresSaved, language) },
    { icon: Zap, label: t("dashboard.impactEnergy"), value: t("dashboard.kwh", { value: formatNumber(totals.kwhSaved, 0, language) }) },
    { icon: Leaf, label: t("dashboard.impactCo2"), value: formatCo2(totals.co2Kg, language) },
    { icon: IndianRupee, label: t("dashboard.impactMoney"), value: formatRupees(totals.rupeesSaved, language) },
    { icon: Percent, label: t("dashboard.impactSaving"), value: `${formatNumber(totals.savingPct, 1, language)}%` },
    { icon: Gauge, label: t("dashboard.impactMeasured"), value: `${formatNumber(totals.measuredShare * 100, 0, language)}%` },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-navy-950 p-5 text-white shadow-lift sm:p-7">
      <div className="bg-aurora absolute inset-0" aria-hidden="true" />
      <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-sun-400/20 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-sun-400 uppercase">{t("dashboard.impactEyebrow")}</p>
          <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">{t("dashboard.impactTitle")}</h2>
        </div>
        <Link
          href="/sustainability"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-sun-300 transition-colors hover:bg-white/10 hover:text-sun-200"
        >
          {t("dashboard.impactLink")} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {empty ? (
        <p className="relative mt-5 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-white/75">
          {t("dashboard.impactEmpty")}
        </p>
      ) : (
        <dl className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:bg-white/[0.08]"
            >
              <dt className="flex items-center gap-2 text-xs font-medium text-white/60">
                <Icon className="h-4 w-4 shrink-0 text-sun-400" aria-hidden="true" />
                <span className="min-w-0">{label}</span>
              </dt>
              <dd className="mt-2 font-display text-xl font-bold tracking-tight tabular-nums sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
