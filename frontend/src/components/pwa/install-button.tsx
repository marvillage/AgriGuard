"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { isAppleMobile, isStandalone } from "@/components/settings/device";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/i18n/provider";
import { canPromptInstall, promptInstall, subscribeInstall, wasJustInstalled } from "@/lib/install-prompt";

type Offer = "none" | "prompt" | "ios";

function subscribe(listener: () => void) {
  const unsubscribe = subscribeInstall(listener);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => {
    unsubscribe();
    media.removeEventListener("change", listener);
  };
}

function offer(): Offer {
  if (wasJustInstalled() || isStandalone()) return "none";
  if (canPromptInstall()) return "prompt";
  return isAppleMobile() ? "ios" : "none";
}

// Shown in the phone top bar until AgriGuard runs as an installed app.
export function InstallButton() {
  const { t } = useI18n();
  const state = useSyncExternalStore(subscribe, offer, () => "none" as Offer);
  const [showSteps, setShowSteps] = useState(false);

  if (state === "none") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (state === "prompt" ? void promptInstall() : setShowSteps(true))}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-900 lg:hidden"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {t("nav.install")}
      </button>
      {showSteps ? (
        <Modal title={t("phone.installIosTitle")} onClose={() => setShowSteps(false)}>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800">
                <Share className="h-4 w-4" aria-hidden="true" />
              </span>
              {t("phone.installIosStep1")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800">
                <SquarePlus className="h-4 w-4" aria-hidden="true" />
              </span>
              {t("phone.installIosStep2")}
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-800">
                <Download className="h-4 w-4" aria-hidden="true" />
              </span>
              {t("phone.installIosStep3")}
            </li>
          </ol>
        </Modal>
      ) : null}
    </>
  );
}
