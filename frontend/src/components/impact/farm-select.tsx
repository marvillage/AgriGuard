"use client";

import { useId } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function FarmSelect({
  label,
  farms,
  value,
  onChange,
  allLabel,
  className,
}: {
  label: string;
  farms: Array<{ id: number; name: string }>;
  value: number | null;
  onChange: (farmId: number | null) => void;
  allLabel?: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-600" aria-hidden="true" />
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="h-10 w-full cursor-pointer appearance-none truncate rounded-xl border border-slate-200 bg-white pr-9 pl-9 text-sm font-semibold text-ink shadow-soft transition-all hover:border-navy-200 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none sm:w-64"
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {farms.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
}
