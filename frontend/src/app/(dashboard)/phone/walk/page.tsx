"use client";

import { Suspense } from "react";
import { FieldWalk } from "@/components/phone/field-walk";
import { ToolPage } from "@/components/phone/tool-field";
import { useI18n } from "@/i18n/provider";

export default function PhoneWalkPage() {
  return (
    <Suspense fallback={null}>
      <PhoneWalk />
    </Suspense>
  );
}

function PhoneWalk() {
  const { t } = useI18n();
  return (
    <ToolPage title={t("phone.walkTitle")} description={t("phone.walkDescription")}>
      {(overview) => <FieldWalk overview={overview} />}
    </ToolPage>
  );
}
