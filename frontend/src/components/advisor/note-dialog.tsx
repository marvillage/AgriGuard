"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LoaderCircle, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Priority, RecType } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const types: RecType[] = ["GENERAL", "IRRIGATION", "FERTILIZER", "DISEASE", "WEATHER"];

const priorityStyle: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-800 ring-slate-300",
  MEDIUM: "bg-sky-50 text-sky-800 ring-sky-300",
  HIGH: "bg-amber-50 text-amber-800 ring-amber-300",
  CRITICAL: "bg-red-50 text-red-700 ring-red-300",
};

export function NoteDialog({
  field,
  farmerName,
  onClose,
}: {
  field: { id: number; name: string };
  farmerName: string;
  onClose: () => void;
}) {
  const { t, tx } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [type, setType] = useState<RecType>("GENERAL");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.addNote(field.id, { title: title.trim(), message: message.trim(), priority, type }),
    onSuccess: async () => {
      toast({ title: t("advisor.noteSent"), body: t("advisor.noteSentBody", { title: title.trim(), field: field.name }), tone: "success" });
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["advisor"] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
      ]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t("common.error")),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 3 || message.trim().length < 3) {
      setError(t("advisor.noteTooShort"));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal title={t("advisor.noteTitle", { field: field.name })} description={t("advisor.noteDescription", { farmer: farmerName })} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="note-title">{t("advisor.noteTitleLabel")}</Label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("advisor.noteTitlePlaceholder")}
            maxLength={150}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-message">{t("advisor.noteMessageLabel")}</Label>
          <Textarea
            id="note-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("advisor.noteMessagePlaceholder")}
            maxLength={2000}
            rows={4}
            required
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">{t("advisor.notePriority")}</legend>
          <div role="radiogroup" aria-label={t("advisor.notePriority")} className="grid grid-cols-4 gap-1.5">
            {priorities.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={priority === value}
                onClick={() => setPriority(value)}
                className={cn(
                  "min-w-0 cursor-pointer truncate rounded-lg px-1.5 py-2 text-xs font-semibold ring-1 transition-all duration-200",
                  priority === value ? cn(priorityStyle[value], "ring-2") : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {tx(`common.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="note-type">{t("advisor.noteType")}</Label>
          <div className="relative">
            <select
              id="note-type"
              value={type}
              onChange={(e) => setType(e.target.value as RecType)}
              className="flex h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3.5 text-sm text-ink transition-all hover:border-slate-300 focus-visible:border-sun-400 focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none"
            >
              {types.map((value) => (
                <option key={value} value={value}>
                  {tx(`advisor.type_${value}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {mutation.isPending ? t("advisor.sending") : t("advisor.sendNote")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
