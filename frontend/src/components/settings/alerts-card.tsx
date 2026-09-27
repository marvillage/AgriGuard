"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle, MessageSquare, Sunrise } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { EnvList } from "./env-list";
import { PushControl } from "./push-control";
import { SectionIcon } from "./section-icon";
import { SwitchRow } from "./switch-row";
import { TestAlert } from "./test-alert";

type Preference = "smsAlerts" | "whatsappAlerts" | "dailyBriefing";

const twilioVars = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM", "TWILIO_WHATSAPP_FROM"];

export function AlertsCard({ user }: { user: User }) {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState<Preference | null>(null);
  const channels = useQuery({ queryKey: ["notifications", "channels"], queryFn: api.notificationChannels, staleTime: 60_000 });

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

  const channelBadge = (ready: boolean | undefined) =>
    ready === undefined ? null : ready ? (
      <Badge variant="success">{t("settings.channelReady")}</Badge>
    ) : (
      <Badge variant="warning">{t("settings.channelNotConfigured")}</Badge>
    );

  const twilioMissing = channels.data ? !channels.data.sms || !channels.data.whatsapp : false;
  const needsPhone = (user.smsAlerts || user.whatsappAlerts) && !user.phone;

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
            icon={MessageSquare}
            title={t("settings.smsTitle")}
            description={t("settings.smsBody")}
            checked={Boolean(user.smsAlerts)}
            onChange={(value) => save("smsAlerts", value)}
            busy={saving === "smsAlerts"}
            status={channelBadge(channels.data?.sms)}
          />
          <SwitchRow
            icon={MessageCircle}
            title={t("settings.whatsappTitle")}
            description={t("settings.whatsappBody")}
            checked={Boolean(user.whatsappAlerts)}
            onChange={(value) => save("whatsappAlerts", value)}
            busy={saving === "whatsappAlerts"}
            status={channelBadge(channels.data?.whatsapp)}
          />
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
          {needsPhone ? <Alert variant="default">{t("settings.needsPhone")}</Alert> : null}
          {twilioMissing ? (
            <Alert variant="info">
              <p className="font-semibold">{t("settings.twilioTitle")}</p>
              <p className="mt-0.5">{t("settings.twilioBody")}</p>
              <EnvList items={twilioVars.map((name) => ({ name }))} />
            </Alert>
          ) : null}
          <TestAlert />
        </div>
      </CardContent>
    </Card>
  );
}
