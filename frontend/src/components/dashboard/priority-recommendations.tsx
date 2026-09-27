"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { Recommendation } from "@/lib/types";

export function PriorityRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  const { t } = useI18n();
  const top = recommendations.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-0 sm:p-6 sm:pb-0">
        <div>
          <CardTitle>{t("dashboard.recsTitle")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">{t("dashboard.recsDescription")}</p>
        </div>
        <Link
          href="/recommendations"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
        >
          {t("common.viewAll")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {top.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t("dashboard.recsEmpty")}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {top.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
