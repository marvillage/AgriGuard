"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, CircleCheck, CircleMinus, CircleX, LoaderCircle, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ChannelStatus = "sent" | "failed" | "skipped" | "off";
type ChannelResult = { status: ChannelStatus; detail?: string };

const channels = [
  { key: "inApp", icon: Smartphone },
  { key: "push", icon: BellRing },
] as const;

const statusStyle: Record<ChannelStatus, { icon: typeof CircleCheck; text: string }> = {
  sent: { icon: CircleCheck, text: "text-emerald-700" },
  failed: { icon: CircleX, text: "text-red-700" },
  skipped: { icon: CircleMinus, text: "text-amber-700" },
  off: { icon: CircleMinus, text: "text-slate-400" },
};

function parseChannels(raw: string | null): Record<string, ChannelResult> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ChannelResult>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function TestAlert() {
  const { t, tx } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => (await api.testNotification()).notification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (err) => toast({ title: t("settings.testFailed"), body: err instanceof Error ? err.message : undefined, tone: "critical" }),
  });

  const detailText = (detail?: string) => {
    if (!detail) return null;
    if (detail === "No browser subscribed") return t("settings.detail_noBrowser");
    if (detail === "No phone number") return t("settings.detail_noPhone");
    if (/not configured/i.test(detail)) return t("settings.detail_notConfigured");
    const devices = detail.match(/^(\d+) device/);
    if (devices) return t("settings.detail_devices", { count: devices[1] });
    return detail;
  };

  const results = mutation.data ? parseChannels(mutation.data.channels) : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("settings.testTitle")}</p>
          <p className="text-xs text-slate-500">{t("settings.testBody")}</p>
        </div>
        <Button type="button" variant="dark" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="shrink-0">
          {mutation.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {mutation.isPending ? t("settings.testSending") : t("settings.testButton")}
        </Button>
      </div>

      {results ? (
        <div className="mt-4 animate-fade-up" role="status">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{t("settings.testResult")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {channels.map(({ key, icon: Icon }) => {
              const result: ChannelResult = results[key] ?? { status: "off" };
              const style = statusStyle[result.status] ?? statusStyle.off;
              const StatusIcon = style.icon;
              const detail = detailText(result.detail);
              return (
                <li key={key} className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{tx(`settings.channel_${key}`)}</span>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", style.text)}>
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {tx(`settings.status_${result.status}`)}
                      </span>
                    </div>
                    {detail ? <p className="mt-0.5 text-xs break-words text-slate-500">{detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
