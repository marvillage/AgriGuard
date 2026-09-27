"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FieldGroup, selectClass } from "@/components/field/ops/shared";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { FieldOverview } from "@/lib/types";
import { lastToolField, rememberToolField } from "./phone-store";

// Shared frame of the phone tools: a field picker (kept in ?field= and remembered) and that field's overview.
export function ToolPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (overview: FieldOverview) => React.ReactNode;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const fields = dashboard.data?.fields ?? [];
  const requested = Number(searchParams.get("field"));
  const remembered = lastToolField();
  const fieldId = fields.find((field) => field.id === requested)?.id ?? fields.find((field) => field.id === remembered)?.id ?? fields[0]?.id ?? null;

  const overview = useQuery({
    queryKey: ["field", fieldId],
    queryFn: () => api.fieldOverview(fieldId!),
    enabled: fieldId !== null,
  });

  useEffect(() => {
    if (fieldId !== null) rememberToolField(fieldId);
  }, [fieldId]);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/phone" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("phone.title")}
      </Link>
      <PageHeader title={title} description={description} />

      {dashboard.isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-slate-100" /> : null}
      {dashboard.isSuccess && fields.length === 0 ? (
        <Alert variant="info">
          {t("phone.noFields")}{" "}
          <Link href="/farms" className="font-semibold underline">
            {t("nav.farms")}
          </Link>
        </Alert>
      ) : null}

      {fields.length > 1 ? (
        <Card className="mb-4">
          <CardContent className="p-4 sm:p-5">
            <FieldGroup label={t("phone.field")} htmlFor="tool-field">
              <select
                id="tool-field"
                className={selectClass}
                value={fieldId ?? ""}
                onChange={(event) => router.replace(`${pathname}?field=${event.target.value}`, { scroll: false })}
              >
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} · {field.farmName}
                  </option>
                ))}
              </select>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : null}

      {overview.isError ? <Alert variant="destructive">{t("phone.loadError")}</Alert> : null}
      {fieldId !== null && overview.isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-slate-100" /> : null}
      {overview.data ? <div key={overview.data.field.id}>{children(overview.data)}</div> : null}
    </div>
  );
}
