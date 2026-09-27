"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { languages } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import type { Language } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((item) => item.code === language) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const choose = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("auth.languageLabel")}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-soft transition-colors hover:border-navy-200 hover:text-ink"
      >
        <Languages className="h-4 w-4 text-navy-700" aria-hidden="true" />
        <span>{current.native}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t("auth.languageLabel")}
          className="absolute right-0 z-40 mt-2 w-48 animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lift"
        >
          {languages.map((item) => (
            <li key={item.code} role="option" aria-selected={item.code === language}>
              <button
                type="button"
                lang={item.code}
                onClick={() => choose(item.code)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="font-medium text-ink">{item.native}</span>
                  <span className="ml-2 text-xs text-slate-400">{item.label}</span>
                </span>
                {item.code === language ? <Check className="h-4 w-4 shrink-0 text-sun-600" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
