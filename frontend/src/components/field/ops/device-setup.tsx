"use client";

import { KeyRound, Terminal, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { Device } from "@/lib/types";
import { CodeBlock, CopyButton } from "./shared";

export function apiBaseOf(device: Device) {
  return device.telemetryUrl.replace(/\/api\/device\/telemetry\/?$/, "");
}

export function configSnippet(device: Device) {
  const lines = [
    `#define WIFI_SSID "YourWiFiName"`,
    `#define WIFI_PASSWORD "YourWiFiPassword"`,
    `#define API_BASE_URL "${apiBaseOf(device)}"`,
    `#define DEVICE_KEY "${device.deviceKey}"`,
  ];
  if (device.tankHeightCm) lines.push(`#define TANK_EMPTY_CM ${device.tankHeightCm.toFixed(1)}`);
  return lines.join("\n");
}

export type SetupKind = "new" | "rotated" | "revealed";

export function DeviceSetup({ device, kind, onClose }: { device: Device; kind: SetupKind; onClose: () => void }) {
  const { t } = useI18n();
  const base = apiBaseOf(device);
  const local = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
  const fresh = kind !== "revealed";
  const title =
    kind === "new"
      ? t("fieldOps.setupFreshTitle", { name: device.name })
      : kind === "rotated"
        ? t("fieldOps.setupRotatedTitle", { name: device.name })
        : t("fieldOps.setupTitle", { name: device.name });

  return (
    <Card className="animate-fade-up border-sun-300 ring-2 ring-sun-300/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-sun-700" aria-hidden="true" />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-500">{t("fieldOps.setupSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {fresh ? (
          <Alert variant="default">
            <p className="font-semibold">{t("fieldOps.setupKeyOnce")}</p>
            <p className="mt-0.5">{kind === "rotated" ? t("fieldOps.setupRotatedBody") : t("fieldOps.setupKeyOnceBody")}</p>
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-700">{t("fieldOps.deviceKey")}</p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3">
            <code className="min-w-0 flex-1 font-mono text-sm break-all text-ink">{device.deviceKey}</code>
            <CopyButton text={device.deviceKey} />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-700">{t("fieldOps.telemetryUrl")}</p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3">
            <code className="min-w-0 flex-1 font-mono text-xs break-all text-slate-700">
              <span className="mr-1.5 rounded bg-navy-900 px-1.5 py-0.5 font-semibold text-white">POST</span>
              {device.telemetryUrl}
            </code>
            <CopyButton text={device.telemetryUrl} />
          </div>
          <p className="text-xs text-slate-500">{t("fieldOps.telemetryHeader")}</p>
        </div>

        <ol className="space-y-4">
          <Step index={1} title={t("fieldOps.setupStep1")}>
            <p>{t("fieldOps.setupStep1Body")}</p>
          </Step>
          <Step index={2} title={t("fieldOps.setupStep2")}>
            <CodeBlock code={configSnippet(device)} label="firmware/agriguard-node/config.h" />
            {local ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("fieldOps.setupLocalhost")}
              </p>
            ) : null}
          </Step>
          <Step index={3} title={t("fieldOps.setupStep3")}>
            <p>{t("fieldOps.setupStep3Body")}</p>
          </Step>
        </ol>

        {device.simulated ? (
          <div className="space-y-2 rounded-2xl bg-navy-50/70 p-4 ring-1 ring-navy-100">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              {t("fieldOps.simulatorTitle")}
            </p>
            <p className="text-sm text-navy-800/90">{t("fieldOps.simulatorBody")}</p>
            <CodeBlock code={`npm run simulate -- --key ${device.deviceKey}`} label="backend/" />
          </div>
        ) : null}

        <Button type="button" variant="dark" onClick={onClose}>
          {fresh ? t("fieldOps.setupDoneFresh") : t("common.close")}
        </Button>
      </CardContent>
    </Card>
  );
}

function Step({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-400 text-xs font-bold text-ink">{index}</span>
      <div className="min-w-0 flex-1 space-y-1 text-sm text-slate-600">
        <p className="font-semibold text-ink">{title}</p>
        {children}
      </div>
    </li>
  );
}
