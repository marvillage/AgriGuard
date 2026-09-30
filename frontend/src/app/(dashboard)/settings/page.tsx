"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AccountCard } from "@/components/settings/account-card";
import { AlertsCard } from "@/components/settings/alerts-card";
import { InstallCard } from "@/components/settings/install-card";
import { LanguageCard } from "@/components/settings/language-card";
import { ProfileCard } from "@/components/settings/profile-card";
import { ThemeCard } from "@/components/settings/theme-card";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div>
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} description={t("settings.description")} />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-1 lg:order-none">
            <ProfileCard key={user.id} user={user} />
          </div>
          <div className="order-2 lg:order-none">
            <LanguageCard />
          </div>
          <div className="order-3 lg:order-none">
            <ThemeCard />
          </div>
          <div className="order-5 lg:order-none">
            <InstallCard />
          </div>
          <div className="order-6 lg:order-none">
            <AccountCard user={user} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-4 lg:order-none">
            <AlertsCard user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
