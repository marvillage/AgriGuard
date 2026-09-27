import {
  CircleAlert,
  CloudSun,
  Droplets,
  FlaskConical,
  Info,
  Lightbulb,
  OctagonAlert,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Priority, RecType, Recommendation } from "@/lib/types";

export type RecStatus = Recommendation["status"];

export const recStatuses: RecStatus[] = ["OPEN", "DONE", "DISMISSED"];
export const recTypes: RecType[] = ["IRRIGATION", "DISEASE", "FERTILIZER", "WEATHER", "GENERAL"];
export const priorities: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const typeMeta: Record<RecType, { icon: LucideIcon; tone: string }> = {
  IRRIGATION: { icon: Droplets, tone: "bg-sky-50 text-sky-700" },
  FERTILIZER: { icon: FlaskConical, tone: "bg-sun-100 text-sun-800" },
  DISEASE: { icon: ShieldAlert, tone: "bg-red-50 text-red-600" },
  WEATHER: { icon: CloudSun, tone: "bg-navy-50 text-navy-700" },
  GENERAL: { icon: Lightbulb, tone: "bg-slate-100 text-slate-700" },
};

export const priorityMeta: Record<
  Priority,
  { icon: LucideIcon; variant: "danger" | "warning" | "navy" | "secondary"; label: string; tile: string }
> = {
  CRITICAL: { icon: OctagonAlert, variant: "danger", label: "common.critical", tile: "bg-red-50 text-red-600" },
  HIGH: { icon: TriangleAlert, variant: "warning", label: "common.high", tile: "bg-amber-50 text-amber-700" },
  MEDIUM: { icon: CircleAlert, variant: "navy", label: "common.medium", tile: "bg-navy-50 text-navy-700" },
  LOW: { icon: Info, variant: "secondary", label: "common.low", tile: "bg-slate-100 text-slate-600" },
};

export function providerLabel(provider: string, rulesLabel: string) {
  if (provider === "rules") return rulesLabel;
  const [name, ...model] = provider.replace(/:cache$/, "").split(":");
  return model.length ? `${name} · ${model.join(":")}` : name;
}
