"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Droplet, FlaskConical, Gauge, IndianRupee, Leaf, Link2, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatNumber } from "@/lib/format";
import type { Farm } from "@/lib/types";
import { irrigationLabel } from "./impact-labels";

export function Methodology({ farms, className }: { farms: Farm[]; className?: string }) {
  const { t, tx, language } = useI18n();

  const items: Array<{ icon: LucideIcon; text: string }> = [
    { icon: Gauge, text: t("sustainability.methodBaseline") },
    { icon: Droplet, text: t("sustainability.methodWater") },
    { icon: Zap, text: t("sustainability.methodEnergy") },
    { icon: Leaf, text: t("sustainability.methodCo2") },
    { icon: IndianRupee, text: t("sustainability.methodMoney") },
    { icon: Link2, text: t("sustainability.methodLedger") },
    { icon: FlaskConical, text: t("sustainability.methodControl") },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("sustainability.methodTitle")}</CardTitle>
        <p className="text-sm text-slate-500">{t("sustainability.methodDescription")}</p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-600">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-navy-700 shadow-soft">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-navy-950 p-5 text-white">
          <p className="text-xs font-semibold tracking-widest text-sun-400 uppercase">{t("sustainability.farmSettings")}</p>
          <ul className="mt-4 space-y-3">
            {farms.map((farm) => (
              <li key={farm.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <p className="font-semibold">{farm.name}</p>
                <p className="mt-0.5 text-sm text-white/60">
                  {t("sustainability.farmSettingsRow", {
                    method: irrigationLabel(tx, farm.irrigationMethod),
                    rate: formatNumber(farm.electricityRate, 2, language),
                  })}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/farms" className={buttonVariants({ variant: "default", size: "sm", className: "mt-4" })}>
            {t("sustainability.methodBaselineLink")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
