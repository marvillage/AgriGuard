"use client";

import { useSyncExternalStore } from "react";
import { themeKey } from "./theme-script";

export type Theme = "light" | "dark" | "system";

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  try {
    const value = window.localStorage.getItem(themeKey);
    return value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function isDark(theme: Theme) {
  return theme === "dark" || (theme === "system" && prefersDark());
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", isDark(theme));
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(themeKey, theme);
  } catch {
    // private mode: the choice lasts for this visit only
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readTheme() === "system") applyTheme("system");
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeKey) return;
    applyTheme(readTheme());
    listener();
  };
  media.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const dark = useSyncExternalStore(subscribe, () => isDark(readTheme()), () => false);
  return { theme, dark };
}
