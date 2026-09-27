"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardPen, LoaderCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import { SectionTitle, errorMessage } from "./field-ui";

const numericFields = [
  { key: "soilMoisture", label: "field.soilMoistureInput", min: 0, max: 100, placeholder: "32" },
  { key: "temperature", label: "field.airTempInput", min: -20, max: 60, placeholder: "29" },
  { key: "humidity", label: "field.humidityInput", min: 0, max: 100, placeholder: "65" },
  { key: "rainfall", label: "field.rainInput", min: 0, max: 1000, placeholder: "0" },
  { key: "nitrogen", label: "field.nitrogenInput", min: 0, max: 5000, placeholder: "180" },
  { key: "phosphorus", label: "field.phosphorusInput", min: 0, max: 5000, placeholder: "8" },
  { key: "potassium", label: "field.potassiumInput", min: 0, max: 5000, placeholder: "90" },
] as const;

type NumericKey = (typeof numericFields)[number]["key"];
type Values = Record<NumericKey, string>;

const emptyValues: Values = {
  soilMoisture: "",
  temperature: "",
  humidity: "",
  rainfall: "",
  nitrogen: "",
  phosphorus: "",
  potassium: "",
};

export function ReadingForm({ fieldId }: { fieldId: number }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(emptyValues);
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: Parameters<typeof api.addObservation>[1]) => api.addObservation(fieldId, body),
    onSuccess: async () => {
      toast({ title: t("field.readingSaved"), body: t("field.readingSavedBody"), tone: "success" });
      setValues(emptyValues);
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body: Parameters<typeof api.addObservation>[1] = {};
    for (const { key } of numericFields) {
      if (values[key].trim() !== "") body[key] = Number(values[key]);
    }
    if (Object.keys(body).length === 0) {
      setValidation(t("field.readingEmpty"));
      return;
    }
    setValidation(null);
    save.mutate({ ...body, notes: notes.trim() || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={<ClipboardPen className="h-4 w-4 text-navy-700" />} title={t("field.readingTitle")} />
        <p className="text-sm text-slate-500">{t("field.readingIntro")}</p>
      </CardHeader>
      <CardContent className="pt-4">
        <form className="space-y-4" onSubmit={submit}>
          {validation ? <Alert variant="destructive">{validation}</Alert> : null}
          {save.isError ? <Alert variant="destructive">{errorMessage(save.error, t("common.error"))}</Alert> : null}
          <div className="grid grid-cols-2 gap-3">
            {numericFields.map((item) => (
              <div key={item.key} className="space-y-1.5">
                <Label htmlFor={`reading-${item.key}`} className="block text-xs">
                  {t(item.label)}
                </Label>
                <Input
                  id={`reading-${item.key}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={item.min}
                  max={item.max}
                  placeholder={item.placeholder}
                  value={values[item.key]}
                  onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reading-notes" className="block text-xs">
              {t("field.notes")}
            </Label>
            <Textarea
              id="reading-notes"
              className="min-h-20"
              value={notes}
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("field.notesPlaceholder")}
            />
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            {save.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardPen className="h-4 w-4" />}
            {t("field.readingSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
