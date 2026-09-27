"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FieldOverview } from "@/lib/types";
import { DecisionCard } from "./ops/decision-card";
import { DecisionLog } from "./ops/decision-log";
import { IrrigationLog } from "./ops/irrigation-log";
import { AdvisoryCard, PumpControlCard } from "./ops/pump-control";
import { SchedulesCard } from "./ops/schedules-card";
import { opsKeys } from "./ops/shared";
import { SolarWindowCard } from "./ops/solar-window";

export function PumpTab({ overview }: { overview: FieldOverview }) {
  const fieldId = overview.field.id;
  const readOnly = overview.access === "advisor";
  const device = overview.devices[0];
  const eventsQuery = useQuery({
    queryKey: opsKeys.events(fieldId),
    queryFn: async () => (await api.events(fieldId)).events,
    placeholderData: overview.events,
  });
  const events = eventsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {device ? <PumpControlCard fieldId={fieldId} device={device} events={events} readOnly={readOnly} /> : <AdvisoryCard fieldId={fieldId} readOnly={readOnly} />}
        <DecisionCard overview={overview} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SolarWindowCard overview={overview} />
        {device ? <SchedulesCard overview={overview} readOnly={readOnly} /> : <DecisionLog overview={overview} />}
      </div>
      <IrrigationLog events={events} />
      {device ? <DecisionLog overview={overview} /> : null}
    </div>
  );
}
