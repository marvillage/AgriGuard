"use client";

import Link from "next/link";
import { ArrowLeft, Droplets, Zap } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { ImageSlot } from "@/components/ui/image-slot";
import { useI18n } from "@/i18n/provider";
import { siteImages } from "@/lib/site-images";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <ImageSlot
        image={siteImages.auth}
        eager
        sizes="50vw"
        className="hidden lg:block"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-navy-950/65 to-navy-950/20" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" aria-label={t("auth.homeLabel")} className="w-fit">
            <Logo variant="onDark" subtitle={t("auth.platformSubtitle")} />
          </Link>

          <div className="max-w-lg animate-fade-up">
            <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-white">
              {t("auth.heroTitleStart")} <span className="text-sun-400">{t("auth.heroTitleHighlight")}</span> {t("auth.heroTitleEnd")}
            </h1>
            <p className="mt-4 text-white/65">{t("auth.heroBody")}</p>

            <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <Droplets className="h-4 w-4 text-sun-400" />
                <p className="mt-3 font-display text-2xl font-bold text-white">{t("auth.heroWaterValue")}</p>
                <p className="text-xs text-white/55">{t("auth.heroWaterLabel")}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <Zap className="h-4 w-4 text-sun-400" />
                <p className="mt-3 font-display text-2xl font-bold text-white">{t("auth.heroEnergyValue")}</p>
                <p className="text-xs text-white/55">{t("auth.heroEnergyLabel")}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/40">{t("auth.heroTicker")}</p>
        </div>
      </ImageSlot>

      <div className="relative flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="bg-mist absolute inset-x-0 top-0 h-64 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <Link href="/" className="mr-auto lg:hidden" aria-label={t("auth.homeLabel")}>
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> <span className="hidden min-[380px]:inline">{t("auth.home")}</span>
            </Link>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
