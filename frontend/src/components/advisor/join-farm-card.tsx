"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api, ApiRequestError } from "@/lib/api";

export function JoinFarmCard() {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const trimmed = code.trim();

  const mutation = useMutation({
    mutationFn: () => api.joinFarm(trimmed),
    onSuccess: async (result) => {
      setCode("");
      setError(null);
      toast({ title: t("advisor.joined", { name: result.name }), body: t("advisor.joinedBody"), tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["advisor"] }),
        queryClient.invalidateQueries({ queryKey: ["farms"] }),
      ]);
    },
    onError: (err) => setError(joinError(err)),
  });

  function joinError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.status === 404) return t("advisor.joinNotFound");
      if (err.status === 400) return t("advisor.joinOwnFarm");
      return err.message;
    }
    return t("advisor.joinFailed");
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (trimmed.length >= 4) mutation.mutate();
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-ink">{t("advisor.joinTitle")}</h2>
            <p className="text-sm text-slate-500">{t("advisor.joinBody")}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full gap-2 md:w-auto md:shrink-0">
          <Label htmlFor="share-code" className="sr-only">
            {t("advisor.joinLabel")}
          </Label>
          <Input
            id="share-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder={t("advisor.joinPlaceholder")}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
            className="min-w-0 flex-1 font-mono tracking-[0.2em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case md:w-56"
          />
          <Button type="submit" disabled={trimmed.length < 4 || mutation.isPending} className="shrink-0">
            {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {mutation.isPending ? t("advisor.joining") : t("advisor.joinButton")}
          </Button>
        </form>
      </div>
      {error ? (
        <div className="px-5 pb-5 sm:px-6">
          <Alert variant="destructive">{error}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
