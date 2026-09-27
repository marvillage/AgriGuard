"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Power, PowerOff, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { api, API_URL } from "@/lib/api";
import type { Device } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CodeBlock, FieldGroup, parseNumber, Segmented, useCodeLabel, useDuration, useRefreshField } from "./shared";

interface TelemetryReply {
  pump: "ON" | "OFF";
  runSeconds: number;
  reason: string;
  reportEverySeconds: number;
  serverTime: string;
}

async function sendReading(key: string, body: { soilMoisture: number; pumpOn: boolean }) {
  const response = await fetch(`${API_URL}/api/device/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Key": key },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { success: boolean; message?: string; data?: TelemetryReply } | null;
  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message ?? `HTTP ${response.status}`);
  }
  return { status: response.status, reply: payload.data };
}

export function TestReading({ device, initialMoisture }: { device: Device; initialMoisture: number | null }) {
  const { t, number } = useI18n();
  const codeLabel = useCodeLabel();
  const duration = useDuration();
  const refresh = useRefreshField(device.fieldId);
  const [moisture, setMoisture] = useState(initialMoisture === null ? "30" : String(Math.round(initialMoisture)));
  const [pump, setPump] = useState<"ON" | "OFF">(device.pumpOn ? "ON" : "OFF");

  const send = useMutation({
    mutationFn: async () => {
      const key = (await api.deviceKey(device.id)).device.deviceKey;
      return sendReading(key, { soilMoisture: Number(moisture), pumpOn: pump === "ON" });
    },
    onSuccess: () => refresh(),
  });

  const moistureValue = parseNumber(moisture);
  const valid = moistureValue !== null && moistureValue >= 0 && moistureValue <= 100;
  const result = send.data;

  return (
    <div className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{t("fieldOps.testTitle")}</p>
        <p className="mt-0.5 text-xs text-slate-500">{t("fieldOps.testSubtitle")}</p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) send.mutate();
        }}
      >
        <FieldGroup label={t("fieldOps.testMoisture")} htmlFor={`test-moisture-${device.id}`}>
          <Input
            id={`test-moisture-${device.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            required
            value={moisture}
            onChange={(event) => setMoisture(event.target.value)}
          />
        </FieldGroup>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">{t("fieldOps.testPump")}</span>
          <Segmented
            label={t("fieldOps.testPump")}
            value={pump}
            onChange={setPump}
            options={[
              { value: "OFF", label: t("fieldOps.pumpOff"), icon: PowerOff },
              { value: "ON", label: t("fieldOps.pumpOn"), icon: Power },
            ]}
          />
        </div>
        <Button type="submit" variant="dark" disabled={!valid || send.isPending}>
          {send.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("fieldOps.testSend")}
        </Button>
      </form>

      {send.isError ? (
        <Alert variant="destructive">
          <p className="font-semibold">{t("fieldOps.testFailed")}</p>
          <p className="mt-0.5">{send.error instanceof Error && send.error.message ? send.error.message : t("common.error")}</p>
        </Alert>
      ) : null}

      {result ? (
        <div className="animate-fade-up space-y-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("fieldOps.testReply", { status: result.status })}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold",
                  result.reply.pump === "ON" ? "bg-emerald-600 text-white" : "bg-slate-200 text-ink"
                )}
              >
                {result.reply.pump === "ON" ? <Power className="h-3.5 w-3.5" aria-hidden="true" /> : <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />}
                {t("fieldOps.testCommand", { pump: result.reply.pump === "ON" ? t("fieldOps.pumpOn") : t("fieldOps.pumpOff") })}
              </span>
              <Badge variant="navy">{codeLabel("action", result.reply.reason)}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] text-slate-500">{t("fieldOps.testRunFor")}</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {result.reply.runSeconds > 0 ? duration(result.reply.runSeconds / 60) : "–"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">{t("fieldOps.testNextReport")}</dt>
                <dd className="font-semibold text-ink tabular-nums">{t("fieldOps.secondsValue", { seconds: number(result.reply.reportEverySeconds) })}</dd>
              </div>
            </dl>
          </div>
          <CodeBlock code={JSON.stringify(result.reply, null, 2)} label={t("fieldOps.testRaw")} />
        </div>
      ) : null}
    </div>
  );
}
