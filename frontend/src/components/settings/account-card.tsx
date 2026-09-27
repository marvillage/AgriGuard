"use client";

import { LogOut, Mail, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { User } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { SectionIcon } from "./section-icon";

const roleVariant = { FARMER: "default", AGRONOMIST: "navy", ADMIN: "danger" } as const;

export function AccountCard({ user }: { user: User }) {
  const { t } = useI18n();
  const { logout } = useAuth();

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={ShieldCheck} className="bg-navy-950 text-sun-400" />
        <div className="min-w-0">
          <CardTitle>{t("settings.accountTitle")}</CardTitle>
          <CardDescription>{t("settings.accountBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between gap-3 p-3">
            <dt className="text-sm text-slate-500">{t("settings.email")}</dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{user.email}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <dt className="text-sm text-slate-500">{t("settings.role")}</dt>
            <dd>
              <Badge variant={roleVariant[user.role]}>{t(`nav.role_${user.role}`)}</Badge>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{t("settings.signOutBody")}</p>
          <Button type="button" variant="secondary" onClick={logout} className="shrink-0">
            <LogOut className="h-4 w-4" /> {t("common.signOut")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
