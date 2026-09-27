"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartLine, Cpu, Droplets, FileText, FlaskConical, LayoutDashboard, Map as MapGlyph, Sprout, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export const fieldTabs = ["overview", "pump", "devices", "crop", "map", "fertilizer", "readings", "report"] as const;
export type FieldTab = (typeof fieldTabs)[number];

const icons: Record<FieldTab, LucideIcon> = {
  overview: LayoutDashboard,
  pump: Droplets,
  devices: Cpu,
  crop: Sprout,
  map: MapGlyph,
  fertilizer: FlaskConical,
  readings: ChartLine,
  report: FileText,
};

function isTab(value: string | null): value is FieldTab {
  return fieldTabs.some((tab) => tab === value);
}

export function useFieldTab() {
  const searchParams = useSearchParams();
  const value = searchParams.get("tab");
  return isTab(value) ? value : "overview";
}

export function FieldTabs({ active }: { active: FieldTab }) {
  const { tx, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  const select = (tab: FieldTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="sticky top-16 z-20 -mx-5 mb-6 border-b border-slate-200/80 bg-slate-50/90 px-5 backdrop-blur lg:-mx-8 lg:px-8">
      <div role="tablist" aria-label={t("field.tabsLabel")} className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fieldTabs.map((tab) => {
          const Icon = icons[tab];
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={selected ? activeRef : undefined}
              type="button"
              role="tab"
              id={`field-tab-${tab}`}
              aria-selected={selected}
              aria-controls="field-tab-panel"
              onClick={() => select(tab)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                selected ? "border-sun-400 text-ink" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-ink"
              )}
            >
              <Icon className={cn("h-4 w-4", selected ? "text-sun-600" : "text-slate-400")} aria-hidden="true" />
              {tx(`field.tab_${tab}`)}
            </button>
          );
        })}
      </div>
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-50 to-transparent xl:hidden" aria-hidden="true" />
    </div>
  );
}
