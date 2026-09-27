"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { Field } from "@/lib/types";
import { plotColors } from "./plot-colors";

function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function FieldSelect({
  id,
  fields,
  value,
  disabledId,
  onChange,
  placeholder,
  optionLabel,
}: {
  id: string;
  fields: Field[];
  value: number | null;
  disabledId: number | null;
  onChange: (fieldId: number | null) => void;
  placeholder: string;
  optionLabel: (field: Field) => string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pr-9 pl-3.5 text-sm text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none"
      >
        <option value="">{placeholder}</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id} disabled={field.id === disabledId}>
            {optionLabel(field)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
}

export function NewTrialDialog({ farmId, onClose }: { farmId: number; onClose: () => void }) {
  const { t, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ids = { name: useId(), treatment: useId(), control: useId(), start: useId(), notes: useId() };
  const [name, setName] = useState("");
  const [treatmentId, setTreatmentId] = useState<number | null>(null);
  const [controlId, setControlId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(localDay());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const farmQuery = useQuery({
    queryKey: ["farm", farmId],
    queryFn: async () => (await api.getFarm(farmId)).farm,
  });
  const fields = farmQuery.data?.fields ?? [];

  const mutation = useMutation({
    mutationFn: (body: { name: string; treatmentFieldId: number; controlFieldId: number; startDate?: string; notes?: string }) =>
      api.createTrial(farmId, body),
    onSuccess: async () => {
      toast({ title: t("trials.created"), tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trials", farmId] }),
        queryClient.invalidateQueries({ queryKey: ["impact"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      onClose();
    },
    onError: (failure) => setError(failure instanceof Error ? failure.message : t("trials.createFailed")),
  });

  const optionLabel = (field: Field) => t("trials.fieldOption", { name: field.name, area: formatNumber(field.area, 2, language) });

  const problem = () => {
    if (name.trim().length < 2) return t("trials.nameRequired");
    if (!treatmentId || !controlId) return t("trials.fieldsRequired");
    if (treatmentId === controlId) return t("trials.fieldsDifferent");
    return null;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = problem();
    setError(message);
    if (message || !treatmentId || !controlId) return;
    mutation.mutate({
      name: name.trim(),
      treatmentFieldId: treatmentId,
      controlFieldId: controlId,
      startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={t("trials.newTitle")} description={t("trials.newDescription")} onClose={onClose}>
      {farmQuery.isPending ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </p>
      ) : fields.length < 2 ? (
        <div className="space-y-4">
          <Alert variant="info">{t("trials.needTwoFields")}</Alert>
          <Link href={`/farms/${farmId}`} className={buttonVariants({ variant: "default" })}>
            {t("trials.addFields")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto px-0.5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={ids.name}>{t("trials.nameLabel")}</Label>
            <Input
              id={ids.name}
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("trials.namePlaceholder")}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={ids.treatment} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: plotColors.treatment }} aria-hidden="true" />
              {t("trials.treatmentLabel")}
            </Label>
            <FieldSelect
              id={ids.treatment}
              fields={fields}
              value={treatmentId}
              disabledId={controlId}
              onChange={setTreatmentId}
              placeholder={t("trials.chooseField")}
              optionLabel={optionLabel}
            />
            <p className="text-xs text-slate-500">{t("trials.treatmentHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={ids.control} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: plotColors.control }} aria-hidden="true" />
              {t("trials.controlLabel")}
            </Label>
            <FieldSelect
              id={ids.control}
              fields={fields}
              value={controlId}
              disabledId={treatmentId}
              onChange={setControlId}
              placeholder={t("trials.chooseField")}
              optionLabel={optionLabel}
            />
            <p className="text-xs text-slate-500">{t("trials.controlHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={ids.start}>{t("trials.startDateLabel")}</Label>
            <Input id={ids.start} type="date" value={startDate} max={localDay()} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={ids.notes}>
              {t("trials.notesLabel")} <span className="font-normal text-slate-400">({t("common.optional")})</span>
            </Label>
            <Textarea
              id={ids.notes}
              value={notes}
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("trials.notesPlaceholder")}
              className="min-h-20"
            />
          </div>

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mutation.isPending ? t("trials.creating") : t("trials.create")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
