"use client";

import { useState } from "react";
import { Check, Languages, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { languages } from "@/i18n/config";
import { translate, useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Language } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { SectionIcon } from "./section-icon";

export function LanguageCard() {
  const { t, language, setLanguage } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState<Language | null>(null);

  const choose = async (code: Language) => {
    if (code === language) return;
    const previous = language;
    const native = languages.find((item) => item.code === code)?.native ?? code;
    setLanguage(code);
    setSaving(code);
    try {
      const { user } = await api.updateMe({ language: code });
      setUser(user);
      toast({ title: translate(code, "settings.languageSaved", { language: native }), tone: "success" });
    } catch (err) {
      setLanguage(previous);
      toast({ title: translate(previous, "settings.saveFailed"), body: err instanceof Error ? err.message : undefined, tone: "critical" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={Languages} />
        <div className="min-w-0">
          <CardTitle>{t("settings.languageTitle")}</CardTitle>
          <CardDescription>{t("settings.languageBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label={t("settings.languageTitle")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {languages.map((item) => {
            const active = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={active}
                lang={item.code}
                onClick={() => choose(item.code)}
                disabled={saving !== null}
                className={cn(
                  "relative flex min-h-16 min-w-0 cursor-pointer flex-col items-start justify-center rounded-xl border px-3.5 py-3 text-left transition-all duration-200 disabled:cursor-wait",
                  active
                    ? "border-sun-400 bg-sun-50 shadow-soft ring-2 ring-sun-400/40"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-soft"
                )}
              >
                <span className="font-display text-base font-semibold text-ink">{item.native}</span>
                {item.label !== item.native ? <span className="text-xs text-slate-500">{item.label}</span> : null}
                {saving === item.code ? (
                  <LoaderCircle className="absolute top-3 right-3 h-4 w-4 animate-spin text-sun-700" aria-hidden="true" />
                ) : active ? (
                  <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-ink">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
