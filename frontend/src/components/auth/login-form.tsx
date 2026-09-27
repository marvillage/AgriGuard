"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Droplets, LoaderCircle, Sparkles, Sprout, Sun, Tractor, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { languages } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const demoPassword = "agriguard123";

// Matches backend/scripts/seed-demo.ts. Set NEXT_PUBLIC_DEMO_LOGINS=false to hide the panel.
const showDemo = process.env.NEXT_PUBLIC_DEMO_LOGINS !== "false";

const demoAccounts = [
  { key: "ravi", name: "Ravi Kumar", email: "demo@agriguard.in", icon: Tractor, role: "auth.demoRoleFarmer", language: "en", hint: "auth.demoRaviHint" },
  { key: "sunita", name: "Sunita Devi", email: "sunita@agriguard.in", icon: Sun, role: "auth.demoRoleFarmer", language: "hi", hint: "auth.demoSunitaHint" },
  { key: "anil", name: "Anil Pawar", email: "anil@agriguard.in", icon: Droplets, role: "auth.demoRoleFarmer", language: "mr", hint: "auth.demoAnilHint" },
  { key: "lakshmi", name: "Lakshmi Reddy", email: "lakshmi@agriguard.in", icon: Sprout, role: "auth.demoRoleFarmer", language: "te", hint: "auth.demoLakshmiHint" },
  { key: "advisor", name: "Dr. Meera Patil", email: "advisor@agriguard.in", icon: BriefcaseBusiness, role: "auth.demoRoleAdvisor", language: "en", hint: "auth.demoAdvisorHint" },
  { key: "fpo", name: "Prakash Joshi", email: "fpo@agriguard.in", icon: Users, role: "auth.demoRoleFpo", language: "en", hint: "auth.demoFpoHint" },
] as const;

const nativeName = (code: string) => languages.find((language) => language.code === code)?.native ?? code;

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);

  const errorMessage = (err: unknown) => {
    if (err instanceof ApiRequestError) {
      if (err.status === 0) return t("auth.errorOffline");
      if (err.status === 429) return t("auth.errorRateLimit");
      if (err.status === 401) return t("auth.errorInvalid");
      return err.message;
    }
    return t("auth.errorGeneric");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInDemo = async (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(demoPassword);
    setDemo(account.key);
    setError(null);
    setIsSubmitting(true);
    try {
      await login(account.email, demoPassword);
    } catch (err) {
      setError(errorMessage(err));
      setDemo(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">{t("auth.loginEyebrow")}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{t("auth.loginTitle")}</h2>
      <p className="mt-2 mb-8 text-slate-500">{t("auth.loginSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setDemo(null);
            }}
            placeholder={t("auth.emailPlaceholder")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> {t("auth.signingIn")}
            </>
          ) : (
            <>
              {t("auth.signIn")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {showDemo ? (
          <section aria-labelledby="demo-title" className="rounded-2xl border border-sun-300/70 bg-sun-50/70 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sun-700" aria-hidden="true" />
              <h3 id="demo-title" className="font-display text-sm font-semibold text-ink">
                {t("auth.demoTitle")}
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {t("auth.demoBody")}{" "}
              <span className="whitespace-nowrap">
                {t("auth.demoPassword")}: <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink ring-1 ring-sun-300/70">{demoPassword}</code>
              </span>
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                const active = demo === account.key;
                const busy = active && isSubmitting;
                return (
                  <button
                    key={account.key}
                    type="button"
                    onClick={() => signInDemo(account)}
                    disabled={isSubmitting}
                    aria-busy={busy}
                    aria-label={t("auth.demoSignInAs", { name: account.name })}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-soft disabled:cursor-wait",
                      active ? "border-sun-400 ring-2 ring-sun-400/40" : "border-slate-200 enabled:hover:border-navy-200",
                      isSubmitting && !active && "opacity-60"
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-sun-400 text-ink" : "bg-navy-50 text-navy-700")}>
                      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{account.name}</span>
                      <span className="block text-xs font-medium text-navy-700">
                        {t(account.role)} · {nativeName(account.language)}
                      </span>
                      <span className="block text-xs leading-snug text-slate-500">{t(account.hint)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <p className="text-center text-sm text-slate-500">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-navy-700 underline-offset-4 hover:text-navy-900 hover:underline"
          >
            {t("auth.createOne")}
          </Link>
        </p>
      </form>
    </div>
  );
}
