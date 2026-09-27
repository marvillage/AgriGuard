"use client";

import { Suspense } from "react";
import { PumpController } from "@/components/phone/pump-controller";
import { ToolPage } from "@/components/phone/tool-field";
import { useI18n } from "@/i18n/provider";

export default function PhonePumpPage() {
  return (
    <Suspense fallback={null}>
      <PhonePump />
    </Suspense>
  );
}

function PhonePump() {
  const { t } = useI18n();
  return (
    <ToolPage title={t("phone.pumpTitle")} description={t("phone.pumpDescription")}>
      {(overview) => <PumpController overview={overview} />}
    </ToolPage>
  );
}
