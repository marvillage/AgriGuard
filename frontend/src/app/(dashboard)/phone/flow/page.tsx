"use client";

import { Suspense } from "react";
import { FlowTimer } from "@/components/phone/flow-timer";
import { ToolPage } from "@/components/phone/tool-field";
import { useI18n } from "@/i18n/provider";

export default function PhoneFlowPage() {
  return (
    <Suspense fallback={null}>
      <PhoneFlow />
    </Suspense>
  );
}

function PhoneFlow() {
  const { t } = useI18n();
  return (
    <ToolPage title={t("phone.flowTitle")} description={t("phone.flowDescription")}>
      {(overview) => <FlowTimer overview={overview} />}
    </ToolPage>
  );
}
