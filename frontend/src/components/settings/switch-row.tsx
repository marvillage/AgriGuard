"use client";

import { useId } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  busy,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  labelledBy?: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-navy-900" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-soft transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      >
        {busy ? <LoaderCircle className="h-3 w-3 animate-spin text-slate-500" aria-hidden="true" /> : checked ? <span className="h-1.5 w-1.5 rounded-full bg-sun-400" /> : null}
      </span>
    </button>
  );
}

export function SwitchRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  busy,
  disabled,
  status,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  disabled?: boolean;
  status?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="flex items-start gap-3 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p id={titleId} className="text-sm font-semibold text-ink">
            {title}
          </p>
          {status}
        </div>
        <p id={descriptionId} className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
        {children}
      </div>
      <Switch checked={checked} onChange={onChange} busy={busy} disabled={disabled} labelledBy={titleId} describedBy={descriptionId} />
    </div>
  );
}
