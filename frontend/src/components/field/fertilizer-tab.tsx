"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FieldOverview } from "@/lib/types";
import { FertilizerCalculator } from "./ops/fertilizer-calculator";
import { FertilizerHistory } from "./ops/fertilizer-history";
import { opsKeys } from "./ops/shared";

export function FertilizerTab({ overview }: { overview: FieldOverview }) {
  const canEdit = overview.access !== "advisor";
  const cropsQuery = useQuery({
    queryKey: opsKeys.crops,
    queryFn: async () => (await api.cropOptions()).crops,
    staleTime: 60 * 60 * 1000,
  });
  const crops = cropsQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      <FertilizerCalculator overview={overview} crops={crops} canSave={canEdit} />
      <FertilizerHistory fieldId={overview.field.id} crops={crops} canEdit={canEdit} />
    </div>
  );
}
