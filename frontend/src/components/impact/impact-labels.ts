import type { ImpactSummary, Language } from "@/lib/types";
import { formatNumber } from "@/lib/format";

type Translate = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type ImpactField = ImpactSummary["fields"][number];

const irrigationMethods = ["flood", "sprinkler", "drip"];
const scoreKeys = ["water", "chemical", "evidence"];
const entryKinds = ["WATER", "FERTILIZER"];
const entryMethods = ["MEASURED", "ESTIMATED", "SOIL_TEST"];

export function irrigationLabel(tx: Translate, method: string) {
  return irrigationMethods.includes(method) ? tx(`sustainability.irrigation_${method}`) : method;
}

export function baselineLabel(tx: Translate, baseline: ImpactField["baseline"], language: Language) {
  const params = {
    method: irrigationLabel(tx, baseline.method),
    depth: formatNumber(baseline.depthMm, 1, language),
    days: formatNumber(baseline.intervalDays, 0, language),
  };
  return baseline.intervalDays === 1
    ? tx("sustainability.baselinePracticeDaily", params)
    : tx("sustainability.baselinePractice", params);
}

export function fieldSource(field: ImpactField) {
  if (field.control) return "control" as const;
  if (field.method.startsWith("Measured")) return "measured" as const;
  if (field.method.startsWith("Estimated")) return "estimated" as const;
  return "none" as const;
}

export function scoreLabel(tx: Translate, part: { key: string; label: string }) {
  return scoreKeys.includes(part.key) ? tx(`sustainability.score_${part.key}`) : part.label;
}

export function entryKindLabel(tx: Translate, kind: string | null) {
  if (!kind) return "–";
  return entryKinds.includes(kind) ? tx(`sustainability.kind_${kind}`) : kind;
}

export function entryMethodLabel(tx: Translate, method: string | null) {
  if (!method) return "–";
  return entryMethods.includes(method) ? tx(`sustainability.method_${method}`) : method;
}

export function shortHash(hash: string | null) {
  if (!hash) return "–";
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

export function kilolitres(litres: number) {
  return Math.round(litres / 100) / 10;
}
