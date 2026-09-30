"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, Menu, Smartphone, Sprout, type LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

// Phone-width tab bar, like a native app; the full menu stays one tap away under More.
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items: Array<{ href: string; label: string; icon: LucideIcon; active: boolean; primary?: boolean }> = [
    { href: "/dashboard", label: t("nav.tabHome"), icon: LayoutDashboard, active: pathname === "/dashboard" },
    { href: "/farms", label: t("nav.tabFields"), icon: Sprout, active: pathname.startsWith("/farms") || pathname.startsWith("/fields/") },
    { href: "/scan", label: t("nav.tabScan"), icon: Camera, active: pathname.startsWith("/scan"), primary: true },
    { href: "/phone", label: t("nav.tabPhone"), icon: Smartphone, active: pathname.startsWith("/phone") },
  ];

  return (
    <nav
      aria-label={t("nav.openNavigation")}
      className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, active, primary }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors", active ? "text-ink" : "text-slate-500")}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full transition-all",
                primary ? "-mt-5 h-12 w-12 bg-sun-400 text-ink shadow-glow ring-4 ring-white/80" : "h-7 w-12",
                !primary && active && "bg-sun-100 text-sun-800"
              )}
            >
              <Icon className={primary ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
            </span>
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        ))}
        <button type="button" onClick={onMore} className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500">
          <span className="flex h-7 w-12 items-center justify-center">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{t("nav.tabMore")}</span>
        </button>
      </div>
    </nav>
  );
}
