"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Languages, Menu, WifiOff } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { InstallButton } from "@/components/pwa/install-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { languages } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Language } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLive } from "@/providers/live-provider";

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

function LanguageMenu() {
  const { language, setLanguage, t } = useI18n();
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = languages.find((item) => item.code === language);

  const choose = async (code: Language) => {
    setLanguage(code);
    setOpen(false);
    if (user) {
      const updated = await api.updateMe({ language: code }).catch(() => null);
      if (updated) setUser(updated.user);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
        aria-label={t("common.language")}
        aria-expanded={open}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{current?.native}</span>
      </button>
      {open ? (
        <div className="glass absolute right-0 z-40 mt-2 w-44 animate-scale-in overflow-hidden rounded-2xl border py-1 shadow-lift">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => choose(item.code)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span>
                <span className="font-medium text-ink">{item.native}</span>
                <span className="ml-2 text-xs text-slate-400">{item.label}</span>
              </span>
              {item.code === language ? <Check className="h-4 w-4 text-sun-600" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell() {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const query = useQuery({ queryKey: ["notifications"], queryFn: api.notifications, refetchInterval: 120_000 });
  const markRead = useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = query.data?.unread ?? 0;
  const items = query.data?.notifications ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("nav.notifications")}
        aria-expanded={open}
        className="relative cursor-pointer rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="glass absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-2xl border shadow-lift">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-display font-semibold text-ink">{t("nav.notifications")}</p>
            {unread > 0 ? (
              <button type="button" onClick={() => markRead.mutate()} className="cursor-pointer text-xs font-semibold text-navy-700 hover:text-navy-900">
                {t("nav.markAllRead")}
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">{t("nav.noNotifications")}</p>
            ) : (
              items.slice(0, 20).map((note) => (
                <Link
                  key={note.id}
                  href={note.link ?? "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={cn("flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50", !note.readAt && "bg-sun-50/60")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", note.severity === "critical" ? "bg-red-500" : note.severity === "warning" ? "bg-sun-500" : "bg-navy-400")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{note.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{note.body}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(note.createdAt, language)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { t, language } = useI18n();
  const online = useOnline();
  const { connected } = useLive();
  const today = new Intl.DateTimeFormat(language === "en" ? "en-IN" : `${language}-IN-u-nu-latn`, { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="glass sticky top-0 z-30 border-b">
      {!online ? (
        <div className="flex items-center justify-center gap-2 bg-navy-950 px-4 py-1.5 text-xs font-medium text-white">
          <WifiOff className="h-3.5 w-3.5 text-sun-400" /> {t("common.offline")}
        </div>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t("nav.openNavigation")}
          className="-ml-2 cursor-pointer rounded-lg p-2 text-ink transition-colors hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard">
          <LogoMark className="h-8 w-8" />
        </Link>

        <p className="hidden text-sm text-slate-500 sm:block">{today.format(new Date())}</p>

        <div className="ml-auto flex items-center gap-1">
          <span
            className={cn(
              "mr-1 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset sm:inline-flex",
              connected ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "animate-pulse bg-emerald-500" : "bg-slate-400")} />
            {connected ? t("common.live") : t("common.offlineShort")}
          </span>
          <InstallButton />
          <ThemeToggle />
          <LanguageMenu />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
