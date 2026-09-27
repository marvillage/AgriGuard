import { toDate } from "@/lib/format";
import type { Scan } from "@/lib/types";

export type ScanMode = "disease" | "pest";

export interface ScanCrop {
  key: string;
  name: string;
}

const stallAfterMs = 4 * 60 * 1000;

export function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

export function isAiStalled(scan: Scan) {
  if (scan.ai.status !== "pending") return false;
  const created = toDate(scan.createdAt);
  return created ? Date.now() - created.getTime() > stallAfterMs : false;
}

export function shouldPoll(scan: Scan) {
  return scan.ai.status === "pending" && !isAiStalled(scan);
}

export function guessCropKey(cropName: string | null | undefined, crops: ScanCrop[]) {
  if (!cropName) return null;
  const name = cropName.toLowerCase();
  const match = crops.find(
    (crop) => name.includes(crop.key) || name.includes(crop.name.toLowerCase()) || crop.name.toLowerCase().includes(name)
  );
  return match?.key ?? null;
}

export function cropLabel(tx: (key: string) => string, crop: ScanCrop) {
  const key = `scan.crop_${crop.key}`;
  const label = tx(key);
  return label === key ? crop.name : label;
}

export function cropLabelByName(tx: (key: string) => string, name: string, crops: ScanCrop[]) {
  const crop = crops.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return crop ? cropLabel(tx, crop) : name;
}

export function pestName(scan: Scan) {
  const fromModel = scan.top?.label?.startsWith("pest:") ? scan.top.name : null;
  return scan.ai.pest || fromModel || null;
}

export function scanTitle(scan: Scan) {
  if (scan.mode === "pest") return pestName(scan) ?? scan.ai.diagnosis ?? null;
  return scan.top?.name ?? scan.ai.diagnosis ?? null;
}

export function scanConfidence(scan: Scan) {
  return percent(scan.top?.confidence ?? scan.ai.confidence ?? null);
}

export function confidenceTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "warning" as const;
  return "critical" as const;
}

export function affectedTone(value: number) {
  if (value < 10) return "good" as const;
  if (value < 25) return "warning" as const;
  return "critical" as const;
}
