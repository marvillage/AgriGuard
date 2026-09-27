"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { currentPushSubscription, disablePush, enablePush, pushSupported } from "@/lib/push";
import type { User } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { isAppleMobile } from "./device";

type PushState = "unsupported" | "blocked" | "subscribed" | "off";

const pushKey = ["settings", "push"];

async function readPushState(): Promise<{ state: PushState; permission: NotificationPermission | null; ios: boolean }> {
  const ios = isAppleMobile();
  if (!pushSupported()) return { state: "unsupported", permission: null, ios };
  const permission = Notification.permission;
  if (permission === "denied") return { state: "blocked", permission, ios };
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000));
  const subscription = await Promise.race([currentPushSubscription().catch(() => null), timeout]);
  return { state: subscription ? "subscribed" : "off", permission, ios };
}

export function PushControl({ user }: { user: User }) {
  const { t, tx } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: pushKey, queryFn: readPushState, staleTime: 30_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: pushKey });

  const enable = useMutation({
    mutationFn: async () => {
      await enablePush();
      return (await api.updateMe({ pushAlerts: true })).user;
    },
    onSuccess: (updated) => {
      setUser(updated);
      toast({ title: t("settings.pushEnabled"), tone: "success" });
    },
    onError: (err) => {
      const blocked = pushSupported() && Notification.permission === "denied";
      toast({
        title: blocked ? t("settings.pushBlocked") : t("settings.pushFailed"),
        body: blocked ? undefined : err instanceof Error ? err.message : undefined,
        tone: "warning",
      });
    },
    onSettled: refresh,
  });

  const disable = useMutation({
    mutationFn: disablePush,
    onSuccess: () => toast({ title: t("settings.pushDisabled"), tone: "info" }),
    onError: (err) => toast({ title: t("settings.pushFailed"), body: err instanceof Error ? err.message : undefined, tone: "warning" }),
    onSettled: refresh,
  });

  const data = query.data;
  const on = data?.state === "subscribed" && user.pushAlerts !== false;
  const busy = enable.isPending || disable.isPending;

  const badge = !data ? (
    <Badge variant="secondary">{t("settings.pushChecking")}</Badge>
  ) : data.state === "unsupported" ? (
    <Badge variant="secondary">{t("settings.status_off")}</Badge>
  ) : data.state === "blocked" ? (
    <Badge variant="danger">{tx("settings.permission_denied")}</Badge>
  ) : on ? (
    <Badge variant="success">{t("settings.pushOn")}</Badge>
  ) : (
    <Badge variant="secondary">{t("settings.pushOff")}</Badge>
  );

  return (
    <div className="py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">{t("settings.pushTitle")}</p>
            {badge}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{t("settings.pushBody")}</p>
          {data?.permission ? (
            <p className="mt-1 text-xs text-slate-400">{t("settings.permissionLabel", { state: tx(`settings.permission_${data.permission}`) })}</p>
          ) : null}
        </div>
        {data && (data.state === "off" || data.state === "subscribed") ? (
          <Button
            type="button"
            size="sm"
            variant={on ? "secondary" : "default"}
            onClick={() => (on ? disable.mutate() : enable.mutate())}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            {on ? t("settings.pushDisable") : t("settings.pushEnable")}
          </Button>
        ) : !data ? (
          <LoaderCircle className="mt-2 h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
        ) : null}
      </div>
      {data?.state === "blocked" ? (
        <Alert variant="destructive" className="mt-3">
          {t("settings.pushBlocked")}
        </Alert>
      ) : data?.state === "unsupported" ? (
        <Alert variant="info" className="mt-3">
          {data.ios ? t("settings.pushUnsupportedIos") : t("settings.pushUnsupported")}
        </Alert>
      ) : null}
    </div>
  );
}
