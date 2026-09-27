"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "./button";
import { Modal } from "./modal";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} description={description} onClose={onCancel}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button type="button" variant="destructive" onClick={handleConfirm} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel ?? t("common.delete")}
        </Button>
      </div>
    </Modal>
  );
}
