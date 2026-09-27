"use client";

import { CircleCheck, TestTube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import type { ValidationSummary } from "@/lib/types";

export function TestsCard({ tests }: { tests: ValidationSummary["tests"] }) {
  const { t, number, language } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-navy-700" aria-hidden="true" />
          {t("validation.testsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests ? (
          <>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <CircleCheck className={tests.failed === 0 ? "h-6 w-6 text-emerald-600" : "h-6 w-6 text-amber-500"} aria-hidden="true" />
              {t("validation.testsValue", { passed: number(tests.passed), total: number(tests.total) })}
            </p>
            <p className="text-sm leading-relaxed text-slate-600">{t("validation.testsBody")}</p>
            <p className="text-xs text-slate-400">
              {t("validation.ranOn", { date: formatDate(tests.ranAt, language, { day: "numeric", month: "short", year: "numeric" }) })}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">{t("validation.notRun")}</p>
        )}
      </CardContent>
    </Card>
  );
}
