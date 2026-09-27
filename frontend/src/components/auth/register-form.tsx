"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronDown, LoaderCircle, Tractor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { isLanguage, languages } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type Role = "FARMER" | "AGRONOMIST";

const roles = [
  { value: "FARMER", icon: Tractor, label: "auth.roleFarmer", hint: "auth.roleFarmerHint" },
  { value: "AGRONOMIST", icon: BriefcaseBusiness, label: "auth.roleAdvisor", hint: "auth.roleAdvisorHint" },
] as const;

export function RegisterForm() {
  const { register } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [role, setRole] = useState<Role>("FARMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorMessage = (err: unknown) => {
    if (err instanceof ApiRequestError) {
      if (err.status === 0) return t("auth.errorOffline");
      if (err.status === 429) return t("auth.errorRateLimit");
      if (err.status === 409) return t("auth.errorExists");
      return err.message;
    }
    return t("auth.errorGeneric");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(name, email, password, { role, phone: phone.trim() || undefined, language });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold tracking-widest text-sun-600 uppercase">{t("auth.registerEyebrow")}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{t("auth.registerTitle")}</h2>
      <p className="mt-2 mb-8 text-slate-500">{t("auth.registerSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">{t("auth.roleLabel")}</legend>
          <div role="radiogroup" aria-label={t("auth.roleLabel")} className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {roles.map((option) => {
              const Icon = option.icon;
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                    active ? "bg-white shadow-soft ring-1 ring-sun-400" : "text-slate-600 hover:bg-white/70"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sun-600" : "text-slate-400")} aria-hidden="true" />
                    <span className="leading-tight">{t(option.label)}</span>
                  </span>
                  <span className="text-xs leading-snug text-slate-500">{t(option.hint)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.name")}</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.namePlaceholder")}
            minLength={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.newPasswordPlaceholder")}
            minLength={6}
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t("auth.phone")} <span className="font-normal text-slate-400">({t("common.optional")})</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("auth.phonePlaceholder")}
              maxLength={20}
              aria-describedby="phone-hint"
            />
            <p id="phone-hint" className="text-xs text-slate-500">{t("auth.phoneHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t("auth.preferredLanguage")}</Label>
            <div className="relative">
              <select
                id="language"
                value={language}
                onChange={(e) => {
                  if (isLanguage(e.target.value)) setLanguage(e.target.value);
                }}
                aria-describedby="language-hint"
                className="flex h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none"
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code === "en" ? item.native : `${item.native} · ${item.label}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>
            <p id="language-hint" className="text-xs text-slate-500">{t("auth.preferredLanguageHint")}</p>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> {t("auth.creatingAccount")}
            </>
          ) : (
            <>
              {t("auth.createAccount")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-500">
          {t("auth.haveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-navy-700 underline-offset-4 hover:text-navy-900 hover:underline"
          >
            {t("auth.signInLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
