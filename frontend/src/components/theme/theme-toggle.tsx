"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { setTheme, useTheme } from "./theme";

export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const { t } = useI18n();
  const { dark } = useTheme();
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={t("common.themeToggle")}
      title={t("common.themeToggle")}
      className={cn(
        "cursor-pointer rounded-xl p-2.5 transition-colors",
        onDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
