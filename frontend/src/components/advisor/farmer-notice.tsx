"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Eye, MessageSquare, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

export function FarmerNotice() {
  const { t } = useI18n();
  const points = [
    { icon: Eye, text: t("advisor.shareCanSee") },
    { icon: MessageSquare, text: t("advisor.shareCanNote") },
    { icon: ShieldCheck, text: t("advisor.shareCannot") },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />
      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-start">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-950 text-sun-400 shadow-lift">
          <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">{t("advisor.farmerTitle")}</h2>
          <p className="mt-2 text-slate-600">{t("advisor.farmerBody")}</p>
          <p className="mt-3 text-slate-600">{t("advisor.farmerHowTo")}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3 text-sm text-slate-700">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
          <Link href="/farms" className={buttonVariants({ className: "mt-6" })}>
            {t("advisor.farmerCta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
