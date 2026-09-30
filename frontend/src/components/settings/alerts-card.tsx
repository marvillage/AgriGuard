"use client";

import { useState } from "react";
import { Bell, Sunrise } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { PushControl } from "./push-control";
import { SectionIcon } from "./section-icon";
import { SwitchRow } from "./switch-row";
import { TestAlert } from "./test-alert";

type Preference = "dailyBriefing";

export function AlertsCard({ user }: { user: User }) {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState<Preference | null>(null);

  const save = async (key: Preference, value: boolean) => {
    setSaving(key);
    try {
      const { user: updated } = await api.updateMe({ [key]: value });
      setUser(updated);
    } catch (err) {
      toast({ title: t("settings.saveFailed"), body: err instanceof Error ? err.message : undefined, tone: "critical" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={Bell} />
        <div className="min-w-0">
          <CardTitle>{t("settings.alertsTitle")}</CardTitle>
          <CardDescription>{t("settings.alertsBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="divide-y divide-slate-100">
          <PushControl user={user} />
          <SwitchRow
            icon={Sunrise}
            title={t("settings.briefingTitle")}
            description={t("settings.briefingBody")}
            checked={Boolean(user.dailyBriefing)}
            onChange={(value) => save("dailyBriefing", value)}
            busy={saving === "dailyBriefing"}
          />
        </div>

        <div className="mt-2 space-y-3">
          <TestAlert />
        </div>
      </CardContent>
    </Card>
  );
}
