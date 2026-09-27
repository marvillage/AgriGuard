"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Download, Footprints, Info, Power, Timer, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { isAppleMobile, isStandalone } from "@/components/settings/device";
import { InstallCard } from "@/components/settings/install-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";

const androidApk = "/downloads/agriguard.apk";
const noop = () => () => undefined;

export default function PhoneToolsPage() {
  const { t } = useI18n();
  // The APK is only useful on an Android phone that is not already running the app.
  const offerApk = useSyncExternalStore(noop, () => !isAppleMobile() && !isStandalone(), () => false);
  const tools: Array<{ href: string; icon: LucideIcon; title: string; body: string }> = [
    { href: "/phone/pump", icon: Power, title: t("phone.pumpTitle"), body: t("phone.pumpBody") },
    { href: "/phone/walk", icon: Footprints, title: t("phone.walkTitle"), body: t("phone.walkBody") },
    { href: "/phone/flow", icon: Timer, title: t("phone.flowTitle"), body: t("phone.flowBody") },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("phone.eyebrow")} title={t("phone.title")} description={t("phone.description")} />

      <div className="grid gap-4 sm:grid-cols-3">
        {tools.map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-800 transition-colors group-hover:bg-sun-400 group-hover:text-ink">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
                <p className="flex-1 text-sm text-slate-600">{body}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700">
                  {t("phone.open")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-navy-50/70 px-4 py-3 text-sm text-navy-900 ring-1 ring-navy-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t("phone.honestNote")}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <InstallCard />
        {offerApk ? (
          <Card>
            <CardContent className="space-y-3 p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold text-ink">{t("phone.androidTitle")}</h2>
              <p className="text-sm text-slate-600">{t("phone.androidBody")}</p>
              <a href={androidApk} download className={buttonVariants({ variant: "dark" })}>
                <Download className="h-4 w-4" />
                {t("phone.androidButton")}
              </a>
              <p className="text-xs text-slate-500">{t("phone.androidHint")}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
