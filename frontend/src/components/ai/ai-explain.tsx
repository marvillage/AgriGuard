"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { providerText } from "@/components/copilot/provider-label";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type Explanation = { text: string; provider: string };

// The numbers on the card stay the formula's; this only asks the AI to put them into words.
export function AiExplain({
  id,
  load,
  note,
  className,
}: {
  id: ReadonlyArray<string | number | null>;
  load: () => Promise<Explanation>;
  note?: string;
  className?: string;
}) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["ai-explain", ...id, language],
    queryFn: load,
    enabled: open,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50 focus-visible:ring-2 focus-visible:ring-navy-300 focus-visible:outline-none"
      >
        <Sparkles className="h-3.5 w-3.5 text-sun-600" aria-hidden="true" />
        {t("common.aiWhy")}
      </button>
      {open ? (
        query.isPending ? (
          <div className="space-y-2 rounded-xl border border-navy-100 bg-navy-50/50 p-4" aria-busy="true">
            <div className="h-3 w-full animate-pulse rounded bg-navy-100/70" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-navy-100/70" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-navy-100/70" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <p>{t("common.aiExplainError")}</p>
            <button type="button" onClick={() => query.refetch()} className="mt-1 cursor-pointer font-semibold underline underline-offset-2">
              {t("common.retry")}
            </button>
          </Alert>
        ) : (
          <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4" aria-live="polite">
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{query.data.text}</p>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{note ?? t("common.aiExplainNote")}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Sparkles className="h-3 w-3 text-sun-600" aria-hidden="true" />
              {t("common.poweredBy", { provider: providerText(query.data.provider) })}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
