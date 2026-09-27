"use client";

import { useEffect, useState } from "react";
import { Check, Copy, type LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { ApiRequestError } from "@/lib/api";
import { locale } from "@/lib/format";
import type { Language } from "@/lib/types";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export const opsKeys = {
  events: (fieldId: number) => ["field", fieldId, "events"] as const,
  decisions: (fieldId: number) => ["field", fieldId, "decisions"] as const,
  schedules: (fieldId: number) => ["field", fieldId, "schedules"] as const,
  devices: (fieldId: number) => ["field", fieldId, "devices"] as const,
  fertilizer: (fieldId: number) => ["field", fieldId, "fertilizer"] as const,
  report: (fieldId: number) => ["field", fieldId, "report"] as const,
  crops: ["meta", "crops"] as const,
};

export function useRefreshField(fieldId: number) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["field", fieldId] }),
      queryClient.invalidateQueries({ queryKey: ["devices"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
}

export function formatDay(day: string | null | undefined, language: Language, options: Intl.DateTimeFormatOptions) {
  const [year, month, date] = (day ?? "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return "–";
  return new Intl.DateTimeFormat(locale(language), { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function errorText(error: unknown, fallback: string) {
  return error instanceof ApiRequestError && error.message ? error.message : fallback;
}

export function useCodeLabel() {
  const { tx } = useI18n();
  return (prefix: string, code: string, params?: Record<string, string | number>) => {
    const key = `fieldOps.${prefix}_${code}`;
    const text = tx(key, params);
    return text === key ? code : text;
  };
}

export function useDuration() {
  const { t, number } = useI18n();
  return (minutes: number) => {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) return t("fieldOps.minutesShort", { minutes: number(total) });
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest
      ? t("fieldOps.hoursMinutes", { hours: number(hours), minutes: number(rest) })
      : t("fieldOps.hoursShort", { hours: number(hours) });
  };
}

export function countdown(milliseconds: number) {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T | null;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-all duration-200 sm:text-sm",
              active ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {Icon ? <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:ring-offset-2 focus-visible:outline-none",
        checked ? "bg-navy-700" : "bg-slate-300",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

export function CopyButton({ text, className, dark }: { text: string; className?: string; dark?: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      setCopied(await copyText(text));
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
        dark ? "bg-white/10 text-white hover:bg-white/20" : "border border-slate-200 bg-white text-slate-700 hover:border-navy-200 hover:bg-navy-50/60",
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? t("common.copied") : t("common.copy")}
    </button>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-navy-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="truncate font-mono text-[11px] text-slate-400">{label}</span>
        <CopyButton text={code} dark />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 sm:p-4", className)}>
      <p className="flex items-start gap-1.5 text-xs leading-tight font-medium text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        <span className="min-w-0">{label}</span>
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold text-ink tabular-nums sm:text-xl">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-100 text-sun-800">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-sm font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div> : null}
    </div>
  );
}

export function FieldGroup({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export const selectClass =
  "flex h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function parseNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
