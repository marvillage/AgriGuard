"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, CirclePlay, Cpu, LoaderCircle, Power, PowerOff, Timer } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate, timeAgo, toDate } from "@/lib/format";
import type { Device, IrrigationEvent, PumpMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { countdown, errorText, Segmented, useNow, useRefreshField } from "./shared";

const quickMinutes = [15, 30, 60];

export function PumpControlCard({
  fieldId,
  device,
  events,
  readOnly,
}: {
  fieldId: number;
  device: Device;
  events: IrrigationEvent[];
  readOnly: boolean;
}) {
  const { t, number, language } = useI18n();
  const toast = useToast();
  const refresh = useRefreshField(fieldId);
  const now = useNow(1000);
  const [manualOpen, setManualOpen] = useState(false);
  const [minutes, setMinutes] = useState("30");

  const modeLabels: Record<PumpMode, string> = {
    AUTO: t("fieldOps.modeAuto"),
    MANUAL_ON: t("fieldOps.modeManualOn"),
    MANUAL_OFF: t("fieldOps.modeManualOff"),
  };
  const modeHints: Record<PumpMode, string> = {
    AUTO: t("fieldOps.modeAutoHint"),
    MANUAL_ON: t("fieldOps.modeManualOnHint"),
    MANUAL_OFF: t("fieldOps.modeManualOffHint"),
  };

  const mutation = useMutation({
    mutationFn: (body: { mode: PumpMode; minutes?: number }) => api.setPump(fieldId, { ...body, deviceId: device.id }),
    onSuccess: async (result, body) => {
      setManualOpen(false);
      toast({
        tone: "success",
        title: t("fieldOps.pumpUpdated", { mode: modeLabels[body.mode] }),
        body: t("fieldOps.pumpUpdatedBody"),
      });
      await refresh();
    },
    onError: (error) => toast({ tone: "critical", title: t("fieldOps.pumpFailed"), body: errorText(error, t("common.error")) }),
  });

  const manualUntil = toDate(device.manualUntil);
  const commandUntil = toDate(device.commandUntil);
  const manualActive = device.pumpMode === "MANUAL_ON" && manualUntil !== null && manualUntil.getTime() > now;
  const autoActive = device.pumpMode === "AUTO" && device.commandPump === "ON" && commandUntil !== null && commandUntil.getTime() > now;
  const activeUntil = manualActive ? manualUntil : autoActive ? commandUntil : null;

  const openEvent = events.find((event) => !event.endedAt);
  const since = device.pumpOn ? openEvent?.startedAt : events.find((event) => event.endedAt)?.endedAt;
  const minutesValue = Number(minutes);
  const minutesValid = Number.isInteger(minutesValue) && minutesValue >= 1 && minutesValue <= 180;
  const showManual = !readOnly && (manualOpen || device.pumpMode === "MANUAL_ON");
  const selectedMode: PumpMode = manualOpen ? "MANUAL_ON" : device.pumpMode;

  const chooseMode = (mode: PumpMode) => {
    if (mode === "MANUAL_ON") {
      setManualOpen(true);
      return;
    }
    setManualOpen(false);
    if (mode !== device.pumpMode) mutation.mutate({ mode });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{t("fieldOps.pumpTitle")}</CardTitle>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
            <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{device.name}</span>
          </p>
        </div>
        <Badge variant={device.online ? "success" : "secondary"}>
          <span className={cn("h-1.5 w-1.5 rounded-full", device.online ? "bg-emerald-500" : "bg-slate-400")} />
          {device.online ? t("common.online") : t("common.offlineShort")}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          className={cn(
            "flex items-center gap-4 rounded-2xl p-4 transition-colors duration-300 sm:p-5",
            device.pumpOn ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50 ring-1 ring-slate-200"
          )}
        >
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            {device.pumpOn ? <span className="absolute inset-0 animate-ping-slow rounded-full bg-emerald-400/40" /> : null}
            <span
              className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full shadow-soft",
                device.pumpOn ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
              )}
            >
              {device.pumpOn ? <Power className="h-7 w-7" aria-hidden="true" /> : <PowerOff className="h-7 w-7" aria-hidden="true" />}
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{t("fieldOps.pumpStatus")}</p>
            <p className={cn("font-display text-3xl font-bold tracking-tight", device.pumpOn ? "text-emerald-700" : "text-ink")}>
              {device.pumpOn ? t("fieldOps.pumpOn") : t("fieldOps.pumpOff")}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {since
                ? t("fieldOps.pumpSince", {
                    time: formatDate(since, language, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
                    ago: timeAgo(since, language),
                  })
                : t("fieldOps.pumpNoHistory")}
            </p>
          </div>
        </div>

        {!device.online ? (
          <Alert variant="destructive">
            <p className="font-semibold">
              {device.lastSeenAt ? t("fieldOps.nodeOffline", { ago: timeAgo(device.lastSeenAt, language) }) : t("fieldOps.nodeNeverSeen")}
            </p>
            <p className="mt-0.5">{t("fieldOps.nodeOfflineBody")}</p>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">{t("fieldOps.pumpMode")}</p>
          <Segmented
            label={t("fieldOps.pumpMode")}
            value={selectedMode}
            disabled={readOnly || mutation.isPending}
            onChange={chooseMode}
            options={[
              { value: "AUTO", label: modeLabels.AUTO, icon: Bot },
              { value: "MANUAL_ON", label: modeLabels.MANUAL_ON, icon: Power },
              { value: "MANUAL_OFF", label: modeLabels.MANUAL_OFF, icon: PowerOff },
            ]}
          />
          <p className="text-xs text-slate-500">{modeHints[selectedMode]}</p>
        </div>

        {showManual ? (
          <form
            className="animate-fade-in space-y-3 rounded-2xl border border-sun-300/70 bg-sun-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (minutesValid) mutation.mutate({ mode: "MANUAL_ON", minutes: minutesValue });
            }}
          >
            <label htmlFor="manual-minutes" className="text-sm font-semibold text-ink">
              {t("fieldOps.manualRunFor")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-28">
                <Input
                  id="manual-minutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={180}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="pr-12"
                  aria-invalid={!minutesValid}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-500">{t("common.minutes")}</span>
              </div>
              {quickMinutes.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMinutes(String(value))}
                  className={cn(
                    "h-9 cursor-pointer rounded-lg px-3 text-xs font-semibold transition-colors",
                    Number(minutes) === value ? "bg-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                  )}
                >
                  {t("fieldOps.minutesShort", { minutes: number(value) })}
                </button>
              ))}
            </div>
            {!minutesValid ? <p className="text-xs text-red-700">{t("fieldOps.manualMinutesInvalid")}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!minutesValid || mutation.isPending}>
                {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CirclePlay className="h-4 w-4" />}
                {t(manualActive ? "fieldOps.manualRestart" : "fieldOps.manualStart", { minutes: number(minutesValid ? minutesValue : 0) })}
              </Button>
              {manualOpen && device.pumpMode !== "MANUAL_ON" ? (
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            {t("fieldOps.activeCommand")}
          </p>
          {activeUntil ? (
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{manualActive ? t("fieldOps.commandManual") : t("fieldOps.commandAuto")}</p>
                <p className="text-xs text-slate-500">
                  {t("fieldOps.commandEndsAt", { time: formatDate(activeUntil.toISOString(), language, { hour: "numeric", minute: "2-digit" }) })}
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-ink tabular-nums" aria-live="off">
                {countdown(activeUntil.getTime() - now)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              {device.pumpMode === "MANUAL_OFF" ? t("fieldOps.commandHeldOff") : t("fieldOps.commandNone")}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">{t("fieldOps.commandDelivery")}</p>
        </div>

        {readOnly ? <Alert variant="info">{t("fieldOps.readOnlyPump")}</Alert> : null}
      </CardContent>
    </Card>
  );
}

export function AdvisoryCard() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("fieldOps.advisoryTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4 rounded-2xl bg-navy-50/70 p-4 ring-1 ring-navy-100">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-navy-700 shadow-soft">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 text-sm text-navy-900">
            <p className="font-semibold">{t("fieldOps.advisoryHeadline")}</p>
            <p className="mt-1 text-navy-800/90">{t("fieldOps.advisoryBody")}</p>
          </div>
        </div>
        <ol className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-100 text-[11px] font-bold text-sun-800">1</span>
            {t("fieldOps.advisoryStep1")}
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-100 text-[11px] font-bold text-sun-800">2</span>
            {t("fieldOps.advisoryStep2")}
          </li>
        </ol>
        <p className="flex items-center gap-2 rounded-xl bg-sun-50 px-3 py-2.5 text-sm font-medium text-sun-900 ring-1 ring-sun-300/60">
          <Cpu className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("fieldOps.advisoryDevicesHint")}
        </p>
      </CardContent>
    </Card>
  );
}
