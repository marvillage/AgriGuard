"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, MessageSquarePlus, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { Priority, RecType } from "@/lib/types";
import { errorText, FieldGroup, selectClass, useCodeLabel } from "./shared";

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const types: RecType[] = ["GENERAL", "IRRIGATION", "FERTILIZER", "DISEASE", "WEATHER"];

export function NoteForm({ fieldId, fieldName }: { fieldId: number; fieldName: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const codeLabel = useCodeLabel();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [type, setType] = useState<RecType>("GENERAL");

  const send = useMutation({
    mutationFn: () => api.addNote(fieldId, { title: title.trim(), message: message.trim(), priority, type }),
    onSuccess: async () => {
      toast({ tone: "success", title: t("fieldOps.noteSent"), body: t("fieldOps.noteSentBody", { field: fieldName }) });
      setTitle("");
      setMessage("");
      setPriority("MEDIUM");
      setType("GENERAL");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["field", fieldId] }),
      ]);
    },
  });

  const priorityLabel = (value: Priority) =>
    value === "LOW" ? t("common.low") : value === "MEDIUM" ? t("common.medium") : value === "HIGH" ? t("common.high") : t("common.critical");
  const valid = title.trim().length >= 3 && title.trim().length <= 150 && message.trim().length >= 3 && message.trim().length <= 2000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-navy-700" aria-hidden="true" />
          {t("fieldOps.noteTitle")}
        </CardTitle>
        <p className="text-sm text-slate-500">{t("fieldOps.noteSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) send.mutate();
          }}
        >
          <FieldGroup label={t("fieldOps.noteHeading")} htmlFor="note-title">
            <Input
              id="note-title"
              required
              minLength={3}
              maxLength={150}
              placeholder={t("fieldOps.noteHeadingPlaceholder")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label={t("fieldOps.noteMessage")} htmlFor="note-message" hint={t("fieldOps.noteMessageHint", { count: message.trim().length })}>
            <Textarea
              id="note-message"
              required
              minLength={3}
              maxLength={2000}
              rows={4}
              placeholder={t("fieldOps.noteMessagePlaceholder")}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label={t("fieldOps.notePriority")} htmlFor="note-priority">
              <select id="note-priority" className={selectClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {priorityLabel(value)}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label={t("fieldOps.noteType")} htmlFor="note-type">
              <select id="note-type" className={selectClass} value={type} onChange={(event) => setType(event.target.value as RecType)}>
                {types.map((value) => (
                  <option key={value} value={value}>
                    {codeLabel("noteType", value)}
                  </option>
                ))}
              </select>
            </FieldGroup>
          </div>

          {send.isError ? <Alert variant="destructive">{errorText(send.error, t("common.error"))}</Alert> : null}

          <Button type="submit" variant="dark" disabled={!valid || send.isPending}>
            {send.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("fieldOps.noteSend")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
