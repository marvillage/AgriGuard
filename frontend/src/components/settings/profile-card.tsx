"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { SectionIcon } from "./section-icon";

export function ProfileCard({ user }: { user: User }) {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== user.name || phone.trim() !== (user.phone ?? "");

  const mutation = useMutation({
    mutationFn: () => api.updateMe({ name: name.trim(), phone: phone.trim() || null }),
    onSuccess: ({ user: updated }) => {
      setUser(updated);
      setName(updated.name);
      setPhone(updated.phone ?? "");
      toast({ title: t("settings.profileSaved"), tone: "success" });
    },
    onError: (err) => setError(err instanceof Error ? err.message : t("settings.saveFailed")),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError(t("settings.nameTooShort"));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={UserRound} />
        <div className="min-w-0">
          <CardTitle>{t("settings.profileTitle")}</CardTitle>
          <CardDescription>{t("settings.profileBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("settings.name")}</Label>
            <Input id="profile-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">
              {t("settings.phone")} <span className="font-normal text-slate-400">({t("common.optional")})</span>
            </Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("settings.phonePlaceholder")}
              maxLength={20}
              aria-describedby="profile-phone-hint"
            />
            <p id="profile-phone-hint" className="text-xs text-slate-500">
              {t("settings.phoneHint")}
            </p>
          </div>
          <Button type="submit" disabled={!changed || mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? t("common.saving") : t("settings.saveProfile")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
