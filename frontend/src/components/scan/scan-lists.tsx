"use client";

import { CircleCheck } from "lucide-react";
import { Meter } from "@/components/ui/meter";
import type { DiseaseView } from "@/lib/types";
import { percent } from "./scan-helpers";

export function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CheckList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StepList({ title, items }: { title?: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0">
      {title ? <p className="mb-3 text-sm font-semibold text-ink">{title}</p> : null}
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 text-sm leading-relaxed text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sun-400 text-xs font-bold text-ink">
              {index + 1}
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AlternativeList({ title, items }: { title: string; items: DiseaseView[] }) {
  if (items.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const value = percent(item.confidence) ?? 0;
          return (
            <li key={`${item.label}-${item.name}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-slate-600">{item.name}</span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">{value < 1 ? "<1" : value}%</span>
              </div>
              <Meter value={value} tone="navy" label={item.name} className="mt-1.5 h-1.5" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
