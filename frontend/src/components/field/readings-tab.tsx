"use client";

import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/i18n/provider";
import type { FieldOverview } from "@/lib/types";
import { ReadingForm } from "./reading-form";
import { ReadingsHistory } from "./readings-history";

export function ReadingsTab({ overview }: { overview: FieldOverview }) {
  const { t } = useI18n();
  const readOnly = overview.access === "advisor";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <ReadingsHistory fieldId={overview.field.id} />
      </div>
      <div>
        {readOnly ? <Alert variant="info">{t("field.readOnlyHint")}</Alert> : <ReadingForm fieldId={overview.field.id} />}
      </div>
    </div>
  );
}
