"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleCheck, CirclePlay, CircleStop, Gauge, LoaderCircle, Power, PowerOff, Smartphone, Trash, WifiOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { countdown, errorText, Switch, useCodeLabel, useDuration, useNow } from "@/components/field/ops/shared";
import { useI18n } from "@/i18n/provider";
import { api, ApiRequestError, phoneTelemetry } from "@/lib/api";
import { formatLitres, timeAgo, toDate } from "@/lib/format";
import type { FieldOverview, FlowTest, PumpCommand } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { alertFor, unlockSound, useWakeLock } from "./alerts";
import { forgetPhoneNode, phoneNodeFor, readPrefs, savePhoneNode, savePrefs, type PhoneNode, type PhonePrefs } from "./phone-store";

const firmware = "agriguard-phone/1.0.0";

type ControllerState = "checking" | "idle" | "start" | "running" | "stop";

export function parseFlowTest(value: string | null): FlowTest | null {
  try {
    const test = value ? (JSON.parse(value) as FlowTest) : null;
    return test && Array.isArray(test.seconds) ? test : null;
  } catch {
    return null;
  }
}

export function PumpController({ overview }: { overview: FieldOverview }) {
  const fieldId = overview.field.id;
  const [node, setNode] = useState<PhoneNode | null>(() => phoneNodeFor(fieldId));

  if (!node) return <PhoneSetup overview={overview} onReady={setNode} />;
  return (
    <PhoneConsole
      overview={overview}
      node={node}
      onRemoved={() => {
        forgetPhoneNode(fieldId);
        setNode(null);
      }}
    />
  );
}

function PhoneSetup({ overview, onReady }: { overview: FieldOverview; onReady: (node: PhoneNode) => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const readOnly = overview.access === "advisor";
  const sensorBox = overview.devices.find((device) => device.kind !== "PHONE");
  const otherPhone = overview.devices.find((device) => device.kind === "PHONE");

  const setup = useMutation({
    mutationFn: async () => {
      if (otherPhone) await api.deleteDevice(otherPhone.id);
      const name = `${t("fieldOps.phoneController")} · ${user?.name ?? ""}`.slice(0, 100);
      return (await api.registerDevice(overview.field.id, { name, kind: "PHONE" })).device;
    },
    onSuccess: async (device) => {
      const node = { deviceId: device.id, deviceKey: device.deviceKey, fieldId: overview.field.id };
      savePhoneNode(node);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["field", overview.field.id] }),
        queryClient.invalidateQueries({ queryKey: ["devices"] }),
      ]);
      onReady(node);
    },
    onError: (error) => toast({ tone: "critical", title: t("phone.setupFailed"), body: errorText(error, t("common.error")) }),
  });

  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-100 text-sun-800">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink">{t("phone.setupTitle", { field: overview.field.name })}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("phone.setupBody")}</p>
          </div>
        </div>
        {sensorBox ? (
          <Alert variant="info">{t("phone.hasNode", { name: sensorBox.name })}</Alert>
        ) : readOnly ? (
          <Alert variant="info">{t("phone.readOnly")}</Alert>
        ) : (
          <>
            {otherPhone ? <Alert>{t("phone.otherPhone", { name: otherPhone.name })}</Alert> : null}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={setup.isPending}
              onClick={() => {
                unlockSound();
                setup.mutate();
              }}
            >
              {setup.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
              {t("phone.setupButton")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PhoneConsole({ overview, node, onRemoved }: { overview: FieldOverview; node: PhoneNode; onRemoved: () => void }) {
  const { t, number, language } = useI18n();
  const codeLabel = useCodeLabel();
  const duration = useDuration();
  const toast = useToast();
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const fieldId = overview.field.id;
  const device = overview.devices.find((item) => item.id === node.deviceId) ?? null;
  const [prefs, setPrefs] = useState<PhonePrefs>(readPrefs);
  const [pumpOn, setPumpOn] = useState(() => !readPrefs().practice && Boolean(device?.pumpOn));
  const [command, setCommand] = useState<{ data: PumpCommand; at: number } | null>(null);
  const [problem, setProblem] = useState<"unreachable" | "removed" | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const awakeSupported = useWakeLock(problem !== "removed");
  const openedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const reportRef = useRef<() => Promise<void>>(async () => undefined);

  const report = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!openedAt.current) openedAt.current = Date.now();
    let delay = 20000;
    try {
      const data = await phoneTelemetry(node.deviceKey, {
        pumpOn: prefs.practice ? false : pumpOn,
        firmware,
        uptimeSec: Math.round((Date.now() - openedAt.current) / 1000),
      });
      setCommand({ data, at: Date.now() });
      setProblem(null);
      setLastOk(new Date().toISOString());
      delay = data.pump === "ON" || pumpOn ? 15000 : 20000;
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 404)) {
        setProblem("removed");
        return;
      }
      setProblem("unreachable");
      delay = 15000;
    }
    timer.current = window.setTimeout(() => void reportRef.current(), delay);
  }, [node.deviceKey, prefs.practice, pumpOn]);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  // Reports at once when the farmer taps or changes a setting, then keeps checking in.
  useEffect(() => {
    void report();
    return () => window.clearTimeout(timer.current);
  }, [report]);

  // A mode change made on another screen reaches the phone through the live refresh of the field.
  const remote = `${device?.pumpMode ?? ""}|${device?.manualUntil ?? ""}`;
  const seenRemote = useRef(remote);
  useEffect(() => {
    if (seenRemote.current === remote) return;
    seenRemote.current = remote;
    void reportRef.current();
  }, [remote]);

  const serverOn = command?.data.pump === "ON";
  const left = command ? command.at + command.data.runSeconds * 1000 - now : 0;
  const state: ControllerState = !command ? "checking" : pumpOn ? (serverOn && left > 0 ? "running" : "stop") : serverOn && left > 0 ? "start" : "idle";

  useEffect(() => {
    if (!prefs.alerts || (state !== "start" && state !== "stop")) return;
    alertFor(state);
    const repeat = window.setInterval(() => alertFor(state), 30000);
    return () => window.clearInterval(repeat);
  }, [state, prefs.alerts]);

  const changePrefs = (next: PhonePrefs) => {
    savePrefs(next);
    setPrefs(next);
  };

  const tap = (on: boolean) => {
    unlockSound();
    setPumpOn(on);
  };

  const remove = useMutation({
    mutationFn: () => api.deleteDevice(node.deviceId),
    onSuccess: async () => {
      setConfirmRemove(false);
      toast({ tone: "success", title: t("phone.removed") });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["field", fieldId] }),
        queryClient.invalidateQueries({ queryKey: ["devices"] }),
      ]);
      onRemoved();
    },
    onError: (error) => toast({ tone: "critical", title: t("common.error"), body: errorText(error, t("common.error")) }),
  });

  if (problem === "removed") {
    return (
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <Alert variant="destructive">{t("phone.removedRemote")}</Alert>
          <Button type="button" onClick={onRemoved}>
            <Smartphone className="h-4 w-4" />
            {t("phone.setupButton")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = overview.decision.plan;
  const runMinutes = command ? Math.max(1, Math.round(command.data.runSeconds / 60)) : 0;
  const planned = command?.data.reason === "IRRIGATE" && overview.decision.action === "IRRIGATE" ? plan.litres : null;
  const today = new Date().toDateString();
  const litresToday = overview.events
    .filter((event) => toDate(event.startedAt)?.toDateString() === today)
    .reduce((sum, event) => sum + (event.litres ?? 0), 0);
  const test = parseFlowTest(overview.field.pumpFlowTest);
  const flowText = test
    ? t("phone.flowMeasured", { flow: number(test.lpm, 1) })
    : overview.field.pumpFlowLpm
      ? t("phone.flowTyped", { flow: number(overview.field.pumpFlowLpm, 1) })
      : t("phone.flowTypical", { flow: number(plan.flowLpm) });

  const panel = {
    checking: { tone: "bg-slate-50", icon: LoaderCircle, iconTone: "bg-white text-slate-400 ring-1 ring-slate-200", title: t("phone.checking") },
    idle: { tone: "bg-slate-50", icon: PowerOff, iconTone: "bg-white text-slate-500 ring-1 ring-slate-200", title: t("phone.stateIdle") },
    start: { tone: "bg-emerald-50", icon: CirclePlay, iconTone: "bg-emerald-600 text-white", title: t("phone.stateStart") },
    running: { tone: "bg-navy-50", icon: Power, iconTone: "bg-navy-800 text-white", title: t("phone.stateRunning") },
    stop: { tone: "bg-red-50", icon: CircleStop, iconTone: "bg-red-600 text-white", title: t("phone.stateStop") },
  }[state];
  const PanelIcon = panel.icon;
  const pulsing = state === "start" || state === "stop";

  return (
    <div className="space-y-4">
      {prefs.practice ? <Alert>{t("phone.practiceOn")}</Alert> : null}
      {problem === "unreachable" ? (
        <Alert variant="destructive">
          <span className="inline-flex items-center gap-2">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            {t("phone.unreachable")}
          </span>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className={cn("flex flex-col items-center gap-3 px-5 pt-6 pb-5 text-center sm:px-8", panel.tone)} aria-live="polite">
            <span className="relative flex h-20 w-20 items-center justify-center">
              {pulsing ? <span className={cn("absolute inset-0 animate-ping-slow rounded-full", state === "start" ? "bg-emerald-400/40" : "bg-red-400/40")} /> : null}
              <span className={cn("relative flex h-20 w-20 items-center justify-center rounded-full shadow-soft", panel.iconTone)}>
                <PanelIcon className={cn("h-10 w-10", state === "checking" && "animate-spin")} aria-hidden="true" />
              </span>
            </span>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-ink">{panel.title}</p>
              {state === "start" ? (
                <p className="mt-2 text-base text-slate-700">
                  {t("phone.runFor", { duration: duration(runMinutes) })}
                  {planned !== null ? <span className="block text-sm text-slate-500">{t("phone.runLitres", { litres: formatLitres(planned, language) })}</span> : null}
                </p>
              ) : null}
              {state === "running" ? (
                <p className="mt-2 font-display text-4xl font-bold text-navy-900 tabular-nums">{t("phone.timeLeft", { time: countdown(left) })}</p>
              ) : null}
              {state === "stop" && serverOn ? <p className="mt-2 text-base font-semibold text-red-700">{t("phone.timeUp")}</p> : null}
              {state === "idle" ? <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{overview.decision.message}</p> : null}
              {command ? (
                <p className="mt-3 text-xs font-medium text-slate-500">{t("phone.reason", { reason: codeLabel("action", command.data.reason) })}</p>
              ) : null}
            </div>
            <div className="w-full space-y-2">
              {state === "start" || (state === "idle" && !pumpOn) ? (
                <Button type="button" size="lg" variant={state === "start" ? "default" : "secondary"} className="h-14 w-full text-base" onClick={() => tap(true)}>
                  <CirclePlay className="h-5 w-5" />
                  {t("phone.started")}
                </Button>
              ) : null}
              {state === "running" || state === "stop" ? (
                <Button type="button" size="lg" variant={state === "stop" ? "destructive" : "secondary"} className="h-14 w-full text-base" onClick={() => tap(false)}>
                  <CircleStop className="h-5 w-5" />
                  {t("phone.stopped")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 px-4 pb-4 sm:px-5">
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
              <span>{lastOk ? t("phone.checked", { ago: timeAgo(lastOk, language) }) : t("phone.checking")}</span>
              {prefs.practice ? <Badge variant="warning">{t("phone.practice")}</Badge> : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-slate-100 p-0">
          <label className="flex cursor-pointer items-center justify-between gap-4 p-4 sm:px-5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{t("phone.practice")}</span>
              <span className="block text-xs text-slate-500">{t("phone.practiceHint")}</span>
            </span>
            <Switch checked={prefs.practice} disabled={pumpOn} label={t("phone.practice")} onChange={(practice) => changePrefs({ ...prefs, practice })} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 p-4 sm:px-5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{t("phone.alerts")}</span>
              <span className="block text-xs text-slate-500">{t("phone.alertsHint")}</span>
            </span>
            <Switch
              checked={prefs.alerts}
              label={t("phone.alerts")}
              onChange={(alerts) => {
                unlockSound();
                changePrefs({ ...prefs, alerts });
              }}
            />
          </label>
          <p className="flex items-start gap-2 p-4 text-xs text-slate-500 sm:px-5">
            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {awakeSupported ? t("phone.awake") : t("phone.awakeUnsupported")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 text-sm sm:p-5">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-600">{t("phone.modeLine", { mode: codeLabel("mode", device?.pumpMode ?? "AUTO") })}</span>
            <Link href={`/fields/${fieldId}?tab=pump`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900">
              {t("phone.openPumpTab")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
          <p className="text-slate-600">{litresToday > 0 ? t("phone.loggedToday", { litres: formatLitres(litresToday, language) }) : t("phone.loggedNone")}</p>
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <Gauge className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {flowText}
            </span>
            <Link href={`/phone/flow?field=${fieldId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900">
              {t("phone.measureFlow")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
          <p className="text-xs text-slate-500">{t("phone.howItCounts")}</p>
        </CardContent>
      </Card>

      <Button type="button" variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" disabled={pumpOn} onClick={() => setConfirmRemove(true)}>
        <Trash className="h-4 w-4" />
        {t("phone.remove")}
      </Button>

      {confirmRemove ? (
        <ConfirmDialog
          title={t("phone.removeTitle")}
          description={t("phone.removeBody", { field: overview.field.name })}
          confirmLabel={t("phone.remove")}
          onCancel={() => setConfirmRemove(false)}
          onConfirm={async () => {
            await remove.mutateAsync().catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
