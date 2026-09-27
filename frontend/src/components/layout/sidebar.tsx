"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Camera,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  LogOut,
  Settings,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type NavKey = "dashboard" | "farms" | "scan" | "risk" | "recommendations" | "copilot" | "sustainability" | "trials" | "validation" | "advisor" | "settings";

const navGroups: Array<{ label: "overview" | "intelligence" | "impact" | "advisorGroup" | "account"; items: Array<{ href: string; key: NavKey; icon: typeof Sprout; roles?: string[] }> }> = [
  {
    label: "overview",
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/farms", key: "farms", icon: Sprout },
    ],
  },
  {
    label: "intelligence",
    items: [
      { href: "/scan", key: "scan", icon: Camera },
      { href: "/risk", key: "risk", icon: TriangleAlert },
      { href: "/recommendations", key: "recommendations", icon: Lightbulb },
      { href: "/copilot", key: "copilot", icon: Bot },
    ],
  },
  {
    label: "impact",
    items: [
      { href: "/sustainability", key: "sustainability", icon: Leaf },
      { href: "/trials", key: "trials", icon: FlaskConical },
      { href: "/validation", key: "validation", icon: BadgeCheck },
    ],
  },
  {
    label: "advisorGroup",
    items: [{ href: "/advisor", key: "advisor", icon: BriefcaseBusiness, roles: ["AGRONOMIST", "ADMIN"] }],
  },
  {
    label: "account",
    items: [{ href: "/settings", key: "settings", icon: Settings }],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: async () => (await api.devices()).devices,
    staleTime: 60_000,
  });
  const devices = devicesQuery.data ?? [];
  const online = devices.filter((device) => device.online).length;
  const lowestBattery = devices.reduce<number | null>((min, device) => (device.batteryPct === null ? min : min === null ? device.batteryPct : Math.min(min, device.batteryPct)), null);
  const initials = (user?.name ?? "F")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="relative flex h-full w-72 flex-col overflow-hidden bg-navy-950 text-white">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sun-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative px-6 pt-6 pb-5">
        <Link href="/" onClick={onNavigate} aria-label="AgriGuard home">
          <Logo variant="onDark" subtitle={t("nav.precisionFarming")} />
        </Link>
      </div>

      <nav className="scrollbar-thin relative flex-1 space-y-5 overflow-y-auto px-4 py-2" aria-label="App">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-white/35 uppercase">
                {t(`nav.${group.label}`)}
              </p>
              <div className="space-y-1">
                {items.map(({ href, key, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/farms" && pathname.startsWith("/fields/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sun-400 text-ink shadow-glow"
                          : "text-white/65 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-ink" : "text-white/45 group-hover:text-sun-400")} />
                      {t(`nav.${key}`)}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative space-y-3 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/80">
              {devices.length ? t("nav.nodesOnline", { online, total: devices.length }) : t("nav.noNodes")}
            </span>
            {devices.length ? (
              <span className={cn("inline-flex items-center gap-1.5", online ? "text-emerald-300" : "text-white/40")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-emerald-300" : "bg-white/30")} />
                {online ? t("common.online") : t("common.offlineShort")}
              </span>
            ) : null}
          </div>
          {lowestBattery !== null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sun-400" style={{ width: `${lowestBattery}%` }} />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 font-display text-sm font-bold text-ink">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-white/45">{user ? t(`nav.role_${user.role}`) : ""}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label={t("common.signOut")}
            title={t("common.signOut")}
            className="cursor-pointer rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
