"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";

export function useDashboard() {
  const { language } = useI18n();
  return useQuery({
    queryKey: ["dashboard", language],
    queryFn: () => api.dashboard(),
    refetchInterval: 60_000,
  });
}
