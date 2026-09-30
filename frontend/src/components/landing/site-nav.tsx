"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#hardware", label: "Hardware concept" },
  { href: "#impact", label: "Impact" },
];

export function SiteNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        solid
          ? "border-b border-slate-200/70 bg-white/85 shadow-soft backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-18 lg:px-8">
        <Link href="/" aria-label="AgriGuard home">
          <Logo variant={solid ? "onLight" : "onDark"} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                solid
                  ? "text-slate-600 hover:bg-slate-100 hover:text-ink"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link href="/dashboard" className={buttonVariants()}>
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: solid ? "ghost" : "light" })}
              >
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={cn(
            "cursor-pointer rounded-lg p-2 transition-colors md:hidden",
            solid ? "text-ink hover:bg-slate-100" : "text-white hover:bg-white/10"
          )}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="animate-fade-up border-t border-slate-200/70 bg-white px-5 pt-3 pb-5 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {user ? (
              <Link href="/dashboard" className={cn(buttonVariants(), "col-span-2")}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonVariants()}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
