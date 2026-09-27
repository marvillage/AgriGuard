"use client";

import { useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, LoaderCircle, Share, SquarePlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { canPromptInstall, promptInstall, subscribeInstall, wasJustInstalled } from "@/lib/install-prompt";
import { isAppleMobile, isStandalone } from "./device";
import { SectionIcon } from "./section-icon";

type InstallState = "installed" | "ready" | "ios" | "manual";

function subscribe(listener: () => void) {
  const unsubscribe = subscribeInstall(listener);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => {
    unsubscribe();
    media.removeEventListener("change", listener);
  };
}

function snapshot(): InstallState {
  if (wasJustInstalled() || isStandalone()) return "installed";
  if (canPromptInstall()) return "ready";
  return isAppleMobile() ? "ios" : "manual";
}

export function InstallCard() {
  const { t } = useI18n();
  const toast = useToast();
  const state = useSyncExternalStore(subscribe, snapshot, () => "manual" as InstallState);
  const [prompting, setPrompting] = useState(false);

  const install = async () => {
    setPrompting(true);
    try {
      if (await promptInstall()) toast({ title: t("settings.installDone"), tone: "success" });
    } finally {
      setPrompting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={Download} />
        <div className="min-w-0">
          <CardTitle>{t("settings.installTitle")}</CardTitle>
          <CardDescription>{t("settings.installBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {state === "installed" ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("settings.installInstalled")}
          </div>
        ) : state === "ready" ? (
          <Button type="button" onClick={install} disabled={prompting}>
            {prompting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t("settings.installButton")}
          </Button>
        ) : state === "ios" ? (
          <Alert variant="info">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Share className="h-4 w-4" aria-hidden="true" />
              <SquarePlus className="h-4 w-4" aria-hidden="true" />
              {t("settings.installIos")}
            </span>
          </Alert>
        ) : (
          <Alert variant="info">{t("settings.installManual")}</Alert>
        )}
      </CardContent>
    </Card>
  );
}
