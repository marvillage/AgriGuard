"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setApiLanguage } from "@/lib/api";
import type { Language } from "@/lib/types";
import { isLanguage, numberLocale } from "./config";
import { catalog, en, type Messages, type Namespace } from "./messages";

type Params = Record<string, string | number | null | undefined>;
type Key = { [N in Namespace]: `${N}.${Extract<keyof Messages[N], string>}` }[Namespace];

const storageKey = "agriguard_lang";

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: Key, params?: Params) => string;
  tx: (key: string, params?: Params) => string;
  number: (value: number, digits?: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function fill(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === null || value === undefined ? match : String(value);
  });
}

export function translate(language: Language, key: string, params?: Params) {
  const [namespace, ...rest] = key.split(".");
  const name = rest.join(".");
  const localized = (catalog[language]?.[namespace as Namespace] as Record<string, string> | undefined)?.[name];
  const fallback = (en[namespace as Namespace] as Record<string, string> | undefined)?.[name];
  return fill(localized ?? fallback ?? key, params);
}

const storageListeners = new Set<() => void>();

function subscribeStored(listener: () => void) {
  storageListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storageListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(): Language | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children, userLanguage }: { children: React.ReactNode; userLanguage?: Language }) {
  const stored = useSyncExternalStore(subscribeStored, readStored, () => null);
  // A pick made in the UI holds until the signed-in user's profile language changes.
  const [picked, setPicked] = useState<{ language: Language; base: Language | undefined } | null>(null);
  const language = (picked && picked.base === userLanguage ? picked.language : null) ?? userLanguage ?? stored ?? "en";

  // Set during render so the first requests from child components already carry the language.
  setApiLanguage(language);

  const queryClient = useQueryClient();
  const shown = useRef(language);
  useEffect(() => {
    document.documentElement.lang = language;
    // Alerts, decisions and briefings are translated by the server, so refetch them in the new language.
    if (shown.current !== language) queryClient.invalidateQueries();
    shown.current = language;
  }, [language, queryClient]);

  const setLanguage = useCallback(
    (next: Language) => {
      setPicked({ language: next, base: userLanguage });
      setApiLanguage(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // storage unavailable (private mode); the choice still applies for this session
      }
      storageListeners.forEach((listener) => listener());
    },
    [userLanguage]
  );

  const value = useMemo<I18nValue>(() => {
    const formatter = (digits: number) => new Intl.NumberFormat(numberLocale(language), { maximumFractionDigits: digits });
    return {
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
      tx: (key, params) => translate(language, key, params),
      number: (value, digits = 0) => formatter(digits).format(value),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
