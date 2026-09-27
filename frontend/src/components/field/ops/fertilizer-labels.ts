"use client";

import { useI18n } from "@/i18n/provider";

type Tone = "warning" | "success" | "info" | "secondary";

const stageKeys: Record<string, string> = {
  "Basal (at sowing)": "fertilizer.stageBasal",
  "First top dressing": "fertilizer.stageFirst",
  "Second top dressing": "fertilizer.stageSecond",
};

const notePrefixes: Array<[string, string]> = [
  ["Organic carbon is low", "fertilizer.noteLowCarbon"],
  ["Soil is acidic", "fertilizer.noteAcidic"],
  ["Soil is alkaline", "fertilizer.noteAlkaline"],
  ["Split nitrogen", "fertilizer.noteSplit"],
];

export const bagKg = { urea: 45, dap: 50, mop: 50 };

export function statusTone(status: string): Tone {
  if (status === "Low") return "warning";
  if (status === "Medium") return "success";
  if (status === "High") return "info";
  return "secondary";
}

export function useFertilizerLabels() {
  const { t, tx } = useI18n();
  const lookup = (key: string | undefined, fallback: string) => {
    if (!key) return fallback;
    const text = tx(key);
    return text === key ? fallback : text;
  };

  return {
    status: (status: string) =>
      status === "Low" ? t("common.low") : status === "Medium" ? t("common.medium") : status === "High" ? t("common.high") : status,
    source: (source: string) => lookup(`fertilizer.source_${source}`, source),
    stage: (stage: string) => lookup(stageKeys[stage], stage),
    note: (note: string) => lookup(notePrefixes.find(([prefix]) => note.startsWith(prefix))?.[1], note),
    nutrient: (nutrient: "n" | "p" | "k") =>
      nutrient === "n" ? t("fertilizer.nitrogen") : nutrient === "p" ? t("fertilizer.phosphorus") : t("fertilizer.potassium"),
    product: (product: "urea" | "dap" | "mop") =>
      product === "urea" ? t("fertilizer.urea") : product === "dap" ? t("fertilizer.dap") : t("fertilizer.mop"),
  };
}
