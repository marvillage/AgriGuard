"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Eye, Handshake, LoaderCircle, MessageSquare, RefreshCw, ShieldCheck, Trash, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Farm } from "@/lib/types";

type Advisor = Awaited<ReturnType<typeof api.advisors>>["advisors"][number];

function CopyableCode({ code }: { code: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("advisor.copyFailed"), tone: "warning" });
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-sun-400 bg-sun-50/70 p-4 @md:flex-row @md:items-center @md:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-widest text-sun-800 uppercase">{t("advisor.shareCodeLabel")}</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] break-all text-ink select-all @md:text-4xl" aria-live="polite">
          {code}
        </p>
      </div>
      <Button type="button" variant="dark" onClick={copy} className="shrink-0">
        {copied ? <Check className="h-4 w-4 text-sun-400" /> : <Copy className="h-4 w-4" />}
        {copied ? t("common.copied") : t("advisor.copyCode")}
      </Button>
    </div>
  );
}

function AdvisorList({ farmId }: { farmId: number }) {
  const { t, tx, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<Advisor | null>(null);
  const query = useQuery({
    queryKey: ["farm", farmId, "advisors"],
    queryFn: async () => (await api.advisors(farmId)).advisors,
  });

  const remove = async (advisor: Advisor) => {
    try {
      await api.removeAdvisor(farmId, advisor.id);
      toast({ title: t("advisor.removed", { name: advisor.name }), tone: "success" });
      setPendingRemove(null);
      await queryClient.invalidateQueries({ queryKey: ["farm", farmId, "advisors"] });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("common.error"), tone: "critical" });
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-ink">{t("advisor.advisorsTitle")}</h4>
      {query.isPending ? (
        <div className="mt-3 h-14 animate-pulse rounded-xl bg-slate-100" />
      ) : query.isError ? (
        <p className="mt-2 text-sm text-red-700">{t("advisor.advisorsError")}</p>
      ) : query.data.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t("advisor.noAdvisors")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200/80">
          {query.data.map((advisor) => (
            <li key={advisor.id} className="flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-ink">
                  <span className="truncate">{advisor.name}</span>
                  <Badge variant="navy">{tx(`nav.role_${advisor.role}`)}</Badge>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {advisor.email}
                  {advisor.since ? ` · ${t("advisor.since", { date: formatDate(advisor.since, language, { day: "numeric", month: "short", year: "numeric" }) })}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPendingRemove(advisor)}
                aria-label={t("advisor.removeLabel", { name: advisor.name })}
                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash className="h-3.5 w-3.5" />
                <span className="hidden @sm:inline">{t("advisor.remove")}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pendingRemove ? (
        <ConfirmDialog
          title={t("advisor.removeTitle", { name: pendingRemove.name })}
          description={t("advisor.removeBody", { name: pendingRemove.name })}
          confirmLabel={t("advisor.removeConfirm")}
          onConfirm={() => remove(pendingRemove)}
          onCancel={() => setPendingRemove(null)}
        />
      ) : null}
    </div>
  );
}

export function ShareFarm({ farm }: { farm: Farm }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ farmId: number; code: string } | null>(null);
  const code = created?.farmId === farm.id ? created.code : farm.shareCode;
  const [confirmReset, setConfirmReset] = useState(false);

  const share = useMutation({
    mutationFn: () => api.shareFarm(farm.id),
    onSuccess: (result) => {
      setCreated({ farmId: farm.id, code: result.shareCode });
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      queryClient.invalidateQueries({ queryKey: ["farm", farm.id], exact: true });
    },
    onError: (err) => toast({ title: t("advisor.shareFailed"), body: err instanceof Error ? err.message : undefined, tone: "critical" }),
  });

  const reset = async () => {
    try {
      const result = await api.resetShareCode(farm.id);
      setCreated({ farmId: farm.id, code: result.shareCode });
      setConfirmReset(false);
      toast({ title: t("advisor.newCodeDone"), tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farms"] }),
        queryClient.invalidateQueries({ queryKey: ["farm", farm.id], exact: true }),
      ]);
    } catch (err) {
      toast({ title: t("advisor.shareFailed"), body: err instanceof Error ? err.message : undefined, tone: "critical" });
    }
  };

  if (farm.access === "advisor") return null;

  const points = [
    { icon: Eye, text: t("advisor.shareCanSee") },
    { icon: MessageSquare, text: t("advisor.shareCanNote") },
    { icon: ShieldCheck, text: t("advisor.shareCannot") },
  ];

  return (
    <Card className="@container">
      <CardHeader className="flex-row items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-sun-400">
          <Handshake className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <CardTitle>{t("advisor.shareTitle")}</CardTitle>
          <CardDescription>{t("advisor.shareBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="grid gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 @2xl:grid-cols-3">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2 text-xs text-slate-700">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>

        {code ? (
          <div className="space-y-3">
            <CopyableCode code={code} />
            <Alert variant="info">{t("advisor.shareHowTo")}</Alert>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> {t("advisor.newCode")}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => share.mutate()} disabled={share.isPending}>
            {share.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
            {t("advisor.shareButton")}
          </Button>
        )}

        <AdvisorList farmId={farm.id} />
      </CardContent>

      {confirmReset ? (
        <ConfirmDialog
          title={t("advisor.newCodeTitle")}
          description={t("advisor.newCodeBody")}
          confirmLabel={t("advisor.newCodeConfirm")}
          onConfirm={reset}
          onCancel={() => setConfirmReset(false)}
        />
      ) : null}
    </Card>
  );
}
