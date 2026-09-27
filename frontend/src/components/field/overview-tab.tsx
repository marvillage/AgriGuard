"use client";

import type { FieldOverview } from "@/lib/types";
import { DecisionCard } from "./decision-card";
import { FieldWeatherCard } from "./field-weather-card";
import { LiveReadings } from "./live-readings";
import { MoistureForecastChart } from "./moisture-forecast-chart";
import { RisksCard } from "./risks-card";
import { WaterBudgetCard } from "./water-budget-card";

export function OverviewTab({ overview }: { overview: FieldOverview }) {
  return (
    <div className="space-y-5">
      <DecisionCard overview={overview} />
      <LiveReadings overview={overview} />
      <div className="grid gap-5 lg:grid-cols-3">
        <MoistureForecastChart overview={overview} className="min-w-0 lg:col-span-2" />
        <WaterBudgetCard overview={overview} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <FieldWeatherCard overview={overview} />
        </div>
        <RisksCard overview={overview} />
      </div>
    </div>
  );
}
