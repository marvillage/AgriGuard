"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { download } from "@/lib/api";

type Format = "csv" | "pdf";

export function ReportDownloads({ farmId }: { farmId: number | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState<Format | null>(null);

  const run = async (format: Format) => {
    setBusy(format);
    try {
      const query = farmId ? `?farmId=${farmId}` : "";
      await download(`/api/impact/report.${format}${query}`, `agriguard-impact-report.${format}`);
      toast({ title: t("sustainability.downloaded"), tone: "success" });
    } catch (error) {
      toast({
        title: t("sustainability.downloadFailed"),
        body: error instanceof Error ? error.message : t("common.error"),
        tone: "critical",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => run("csv")} disabled={busy !== null} aria-busy={busy === "csv"}>
        {busy === "csv" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        {busy === "csv" ? t("sustainability.preparingCsv") : t("sustainability.downloadCsv")}
      </Button>
      <Button
        variant="dark"
        onClick={() => run("pdf")}
        disabled={busy !== null}
        aria-busy={busy === "pdf"}
        title={t("sustainability.pdfHint")}
      >
        {busy === "pdf" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {busy === "pdf" ? t("sustainability.preparingPdf") : t("sustainability.downloadPdf")}
      </Button>
    </>
  );
}
