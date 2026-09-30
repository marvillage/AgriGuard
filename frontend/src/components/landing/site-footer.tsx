import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#hardware", label: "Field node (concept)" },
      { href: "#impact", label: "Impact calculator" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/scan", label: "Crop scan" },
      { href: "/sustainability", label: "Sustainability" },
      { href: "/copilot", label: "AI copilot" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/register", label: "Create account" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.3fr_2fr] lg:px-8">
        <div>
          <Logo variant="onDark" subtitle="Smart irrigation & crop intelligence" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/50">
            Sensors, AI and automation that save water, energy and fertilizer
            on real farms, with the impact measured in litres, kWh, CO₂ and ₹.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-white">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition-colors hover:text-sun-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/40 sm:flex-row sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} AgriGuard. Built for the Smart Agriculture challenge.</p>
          <p>* Savings estimates use the assumptions shown in the impact calculator.</p>
        </div>
      </div>
    </footer>
  );
}
