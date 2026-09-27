"use client";

import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { ValidationSummary } from "@/lib/types";

// Newest first. Text lives in the validation namespace as log_<id>_title / _found / _fix / _result.
const entries = [
  "photos",
  "baseline",
  "soil",
  "quota",
  "claims",
  "deploy",
  "tests",
  "guardrails",
  "damage",
  "truncation",
  "language",
  "precision",
  "advice",
  "realData",
] as const;

export function ImprovementsLog({ tests }: { tests: ValidationSummary["tests"] }) {
  const { tx, number } = useI18n();
  const params = { passed: number(tests?.passed ?? 0), total: number(tests?.total ?? 0) };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-navy-700" aria-hidden="true" />
          {tx("validation.logTitle")}
        </CardTitle>
        <p className="text-sm text-slate-500">{tx("validation.logSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5 border-l border-slate-200 pl-5">
          {entries.map((id) => (
            <li key={id} className="relative">
              <span className="absolute top-1.5 -left-[1.6875rem] h-3 w-3 rounded-full border-2 border-white bg-sun-400 ring-1 ring-sun-300" aria-hidden="true" />
              <p className="font-display text-sm font-semibold text-ink">{tx(`validation.log_${id}_title`)}</p>
              <dl className="mt-1.5 grid gap-1.5 text-sm leading-relaxed sm:grid-cols-[5.5rem_1fr]">
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase sm:pt-0.5">{tx("validation.found")}</dt>
                <dd className="text-slate-600">{tx(`validation.log_${id}_found`)}</dd>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase sm:pt-0.5">{tx("validation.fix")}</dt>
                <dd className="text-slate-600">{tx(`validation.log_${id}_fix`)}</dd>
                <dt className="text-xs font-semibold tracking-wide text-emerald-700 uppercase sm:pt-0.5">{tx("validation.result")}</dt>
                <dd className="font-medium text-ink">{tx(`validation.log_${id}_result`, params)}</dd>
              </dl>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
