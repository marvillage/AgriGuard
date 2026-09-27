"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCropOptions() {
  return useQuery({
    queryKey: ["crop-options"],
    queryFn: api.cropOptions,
    staleTime: Infinity,
  });
}
