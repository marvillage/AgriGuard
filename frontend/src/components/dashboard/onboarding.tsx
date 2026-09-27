"use client";

import Link from "next/link";
import { ArrowRight, MapPin, RadioTower, Sprout } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export function Onboarding() {
  const { t } = useI18n();
  const steps = [
    { icon: MapPin, title: t("dashboard.step1Title"), body: t("dashboard.step1Body") },
    { icon: Sprout, title: t("dashboard.step2Title"), body: t("dashboard.step2Body") },
    { icon: RadioTower, title: t("dashboard.step3Title"), body: t("dashboard.step3Body") },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-sun-200 bg-gradient-to-br from-sun-50 via-white to-white p-6 shadow-soft sm:p-10">
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-sun-200/50 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-semibold tracking-widest text-sun-700 uppercase">{t("dashboard.onboardingEyebrow")}</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("dashboard.onboardingTitle")}</h2>
        <p className="mt-2 text-slate-600">{t("dashboard.onboardingBody")}</p>
      </div>

      <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li
            key={title}
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-lift"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950 font-display text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-100 text-sun-700 transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 font-display font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
          </li>
        ))}
      </ol>

      <Link href="/farms" className={buttonVariants({ size: "lg", className: "relative mt-8" })}>
        {t("dashboard.onboardingCta")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
