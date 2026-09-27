"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, LoaderCircle, Plus, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { locale } from "@/lib/format";
import type { FieldOverview, Language, Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState, errorText, FieldGroup, opsKeys, Switch, useDuration } from "./shared";

const weekdays = ["1", "2", "3", "4", "5", "6", "7"];

function weekdayName(day: string, language: Language, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(locale(language), { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, Number(day))));
}

function clockTime(value: string, language: Language) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale(language), { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1, hours, minutes)));
}

export function SchedulesCard({ overview, readOnly }: { overview: FieldOverview; readOnly: boolean }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const duration = useDuration();
  const fieldId = overview.field.id;
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null);

  const query = useQuery({
    queryKey: opsKeys.schedules(fieldId),
    queryFn: async () => (await api.schedules(fieldId)).schedules,
    placeholderData: overview.schedules,
  });
  const schedules = query.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
  const failed = (error: unknown) => toast({ tone: "critical", title: t("fieldOps.scheduleFailed"), body: errorText(error, t("common.error")) });

  const toggle = useMutation({
    // The API fills omitted days/mode with their defaults, so the full schedule is sent back with the new flag.
    mutationFn: (schedule: Schedule) =>
      api.updateSchedule(fieldId, schedule.id, {
        enabled: !schedule.enabled,
        startTime: schedule.startTime,
        durationMinutes: schedule.durationMinutes,
        days: schedule.days,
        mode: schedule.mode,
      }),
    onSuccess: refresh,
    onError: failed,
  });

  const modeText = (mode: Schedule["mode"]) => (mode === "SMART" ? t("fieldOps.scheduleSmart") : t("fieldOps.scheduleFixed"));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{t("fieldOps.schedulesTitle")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t("fieldOps.schedulesSubtitle")}</p>
        </div>
        {!readOnly && !adding ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t("fieldOps.scheduleAdd")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {adding ? (
          <ScheduleForm
            fieldId={fieldId}
            onDone={() => setAdding(false)}
            onSaved={async () => {
              setAdding(false);
              toast({ tone: "success", title: t("fieldOps.scheduleSaved") });
              await refresh();
            }}
            onError={failed}
          />
        ) : null}

        {schedules.length === 0 && !adding ? (
          <EmptyState icon={CalendarClock} title={t("fieldOps.schedulesEmpty")}>
            {t("fieldOps.schedulesEmptyBody")}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {schedules.map((schedule) => (
              <li
                key={schedule.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 transition-colors sm:p-4",
                  schedule.enabled ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-75"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="font-display text-lg font-bold text-ink tabular-nums">{clockTime(schedule.startTime, language)}</p>
                    <p className="text-sm text-slate-500">{duration(schedule.durationMinutes)}</p>
                    <Badge variant={schedule.mode === "SMART" ? "navy" : "default"}>{modeText(schedule.mode)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1" aria-label={t("fieldOps.scheduleDays")}>
                    {weekdays.map((day) => (
                      <span
                        key={day}
                        title={weekdayName(day, language, "long")}
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          schedule.days.includes(day) ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {weekdayName(day, language)}
                      </span>
                    ))}
                  </div>
                </div>
                <Switch
                  checked={schedule.enabled}
                  label={schedule.enabled ? t("fieldOps.scheduleDisable") : t("fieldOps.scheduleEnable")}
                  disabled={readOnly || toggle.isPending}
                  onChange={() => toggle.mutate(schedule)}
                />
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-red-600"
                    aria-label={t("fieldOps.scheduleDelete")}
                    title={t("fieldOps.scheduleDelete")}
                    onClick={() => setPendingDelete(schedule)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {pendingDelete ? (
        <ConfirmDialog
          title={t("fieldOps.scheduleDeleteTitle")}
          description={t("fieldOps.scheduleDeleteBody", { time: clockTime(pendingDelete.startTime, language) })}
          confirmLabel={t("common.delete")}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            try {
              await api.deleteSchedule(fieldId, pendingDelete.id);
              setPendingDelete(null);
              toast({ tone: "success", title: t("fieldOps.scheduleDeleted") });
              await refresh();
            } catch (error) {
              failed(error);
            }
          }}
        />
      ) : null}
    </Card>
  );
}

function ScheduleForm({
  fieldId,
  onDone,
  onSaved,
  onError,
}: {
  fieldId: number;
  onDone: () => void;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t, language } = useI18n();
  const [startTime, setStartTime] = useState("06:00");
  const [minutes, setMinutes] = useState("45");
  const [days, setDays] = useState<string[]>(weekdays);
  const [mode, setMode] = useState<Schedule["mode"]>("SMART");

  const create = useMutation({
    mutationFn: () => api.createSchedule(fieldId, { startTime, durationMinutes: Number(minutes), days: days.join(""), mode }),
    onSuccess: onSaved,
    onError,
  });

  const minutesValue = Number(minutes);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) && Number.isInteger(minutesValue) && minutesValue >= 5 && minutesValue <= 600 && days.length > 0;
  const toggleDay = (day: string) =>
    setDays((current) => (current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort()));

  const modes: Array<{ value: Schedule["mode"]; title: string; hint: string }> = [
    { value: "SMART", title: t("fieldOps.scheduleSmart"), hint: t("fieldOps.scheduleSmartHint") },
    { value: "FIXED", title: t("fieldOps.scheduleFixed"), hint: t("fieldOps.scheduleFixedHint") },
  ];

  return (
    <form
      className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) create.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label={t("fieldOps.scheduleStart")} htmlFor="schedule-start">
          <Input id="schedule-start" type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </FieldGroup>
        <FieldGroup label={t("fieldOps.scheduleDuration")} htmlFor="schedule-minutes">
          <Input
            id="schedule-minutes"
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </FieldGroup>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">{t("fieldOps.scheduleDays")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {weekdays.map((day) => {
            const active = days.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                title={weekdayName(day, language, "long")}
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-9 min-w-11 cursor-pointer rounded-lg px-2 text-xs font-semibold transition-all duration-200",
                  active ? "bg-navy-900 text-white shadow-soft" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
                )}
              >
                {weekdayName(day, language)}
              </button>
            );
          })}
        </div>
        {days.length === 0 ? <p className="text-xs text-red-700">{t("fieldOps.scheduleDaysRequired")}</p> : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">{t("fieldOps.scheduleMode")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {modes.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-all duration-200",
                mode === option.value ? "border-sun-400 ring-2 ring-sun-400/30" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <input
                type="radio"
                name="schedule-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mt-1 accent-navy-800"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.title}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {minutes !== "" && (!Number.isInteger(minutesValue) || minutesValue < 5 || minutesValue > 600) ? (
        <p className="text-xs text-red-700">{t("fieldOps.scheduleMinutesInvalid")}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!valid || create.isPending}>
          {create.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("fieldOps.scheduleSave")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
