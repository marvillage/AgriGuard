"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, LoaderCircle, Mic, MicOff, Send, Trash, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { speechLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatBubble, TypingBubble } from "./chat-message";
import { CopilotContext } from "./copilot-context";
import { useAutoRead, useSpeaker, useVoiceInput } from "./use-voice";

const chatKey = ["chat"];
const welcomeId = 0;

export function CopilotChat() {
  const { t, tx, language } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(false);
  const locale = speechLocale(language);
  const speaker = useSpeaker(locale);
  const autoRead = useAutoRead();

  const history = useQuery({ queryKey: chatKey, queryFn: () => api.chatHistory().then((data) => data.messages) });
  const messages = history.data ?? [];

  const send = useMutation({
    mutationFn: (message: string) => api.chat(message, language),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: chatKey });
      const previous = queryClient.getQueryData<ChatMessage[]>(chatKey);
      const optimistic: ChatMessage = { id: -Date.now(), role: "user", content: message, provider: null, createdAt: new Date().toISOString() };
      queryClient.setQueryData<ChatMessage[]>(chatKey, (current = []) => [...current, optimistic]);
      return { previous };
    },
    onSuccess: (data) => {
      const reply: ChatMessage = { id: data.id, role: "assistant", content: data.answer, provider: data.provider, createdAt: new Date().toISOString() };
      queryClient.setQueryData<ChatMessage[]>(chatKey, (current = []) => [...current, reply]);
      if (autoRead.enabled) speaker.speak(data.id, data.answer);
    },
    onError: (error, message, context) => {
      queryClient.setQueryData(chatKey, context?.previous);
      setInput((current) => current || message);
      toast({ title: t("copilot.sendFailed"), body: error.message, tone: "critical" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKey }),
  });

  const ask = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    setInput("");
    speaker.stop();
    send.mutate(message);
  };

  const voice = useVoiceInput({
    locale,
    onInterim: setInput,
    onFinal: (text) => {
      if (send.isPending) setInput(text);
      else ask(text);
    },
  });

  const voiceMessage = voice.error ? tx(`copilot.${voice.error}`) : showUnsupported ? t("copilot.voiceUnsupported") : null;

  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending, voice.listening, voiceMessage]);

  const toggleMic = () => {
    if (!voice.supported) {
      setShowUnsupported(true);
      return;
    }
    if (voice.listening) {
      voice.stop();
      return;
    }
    speaker.stop();
    voice.start();
  };

  const clearChat = async () => {
    try {
      await api.clearChat();
      speaker.stop();
      queryClient.setQueryData<ChatMessage[]>(chatKey, []);
      queryClient.invalidateQueries({ queryKey: chatKey });
      setConfirmClear(false);
      toast({ title: t("copilot.cleared"), tone: "success" });
    } catch (error) {
      toast({ title: t("common.error"), body: error instanceof Error ? error.message : undefined, tone: "critical" });
    }
  };

  const suggestions = [
    t("copilot.suggestWater"),
    t("copilot.suggestDisease"),
    t("copilot.suggestFertilizer"),
    t("copilot.suggestSavings"),
    t("copilot.suggestPump"),
    t("copilot.suggestWeather"),
  ];

  const welcome: ChatMessage = { id: welcomeId, role: "assistant", content: t("copilot.welcome"), provider: null, createdAt: "" };

  const bubble = (message: ChatMessage) => (
    <ChatBubble
      key={message.id}
      message={message}
      canSpeak={speaker.supported}
      speaking={speaker.speakingId === message.id}
      onSpeak={() => speaker.speak(message.id, message.content)}
      onStop={speaker.stop}
    />
  );

  return (
    <div>
      <PageHeader eyebrow={t("nav.intelligence")} title={t("copilot.title")} description={t("copilot.description")} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="flex h-[calc(100dvh-17rem)] min-h-[34rem] min-w-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-sun-400 sm:flex">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display font-semibold text-ink">{t("copilot.assistantName")}</p>
                <p className="hidden truncate text-xs text-slate-500 sm:block">{t("copilot.assistantTagline")}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {speaker.supported ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoRead.enabled}
                  aria-label={t("copilot.autoRead")}
                  title={t("copilot.autoRead")}
                  onClick={() => {
                    if (autoRead.enabled) speaker.stop();
                    autoRead.toggle();
                  }}
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
                >
                  <Volume2 className={cn("h-4 w-4", autoRead.enabled ? "text-navy-700" : "text-slate-400")} />
                  <span className="hidden sm:inline">{t("copilot.autoRead")}</span>
                  <span className={cn("relative h-4 w-7 rounded-full transition-colors", autoRead.enabled ? "bg-sun-400" : "bg-slate-200")}>
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-soft transition-transform",
                        autoRead.enabled && "translate-x-3"
                      )}
                    />
                  </span>
                </button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
                disabled={messages.length === 0 || send.isPending}
                aria-label={t("copilot.clear")}
                title={t("copilot.clear")}
              >
                <Trash className="h-4 w-4" />
                <span className="hidden sm:inline">{t("copilot.clear")}</span>
              </Button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-5" aria-live="polite">
            {bubble(welcome)}
            {history.isPending ? (
              <p className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> {t("copilot.loadingHistory")}
              </p>
            ) : history.isError ? (
              <Alert variant="destructive">
                <p>{t("copilot.loadFailed")}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => history.refetch()}>
                  {t("common.retry")}
                </Button>
              </Alert>
            ) : null}
            {messages.map(bubble)}
            {send.isPending ? <TypingBubble /> : null}
          </div>

          <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("copilot.suggestionsLabel")}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={send.isPending}
                  className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-sun-300 hover:bg-sun-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {voice.listening ? (
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-red-600" role="status">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {t("copilot.listening")}
              </p>
            ) : voiceMessage ? (
              <p className="mb-2 text-xs text-slate-500" role="status">
                {voiceMessage}
              </p>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
              className="flex gap-2"
            >
              <Button
                type="button"
                variant={voice.listening ? "destructive" : "secondary"}
                size="icon"
                className={cn("h-11 w-11 shrink-0", voice.listening && "ring-4 ring-red-200")}
                onClick={toggleMic}
                aria-pressed={voice.listening}
                aria-label={voice.listening ? t("copilot.micStop") : t("copilot.micStart")}
                title={voice.supported ? (voice.listening ? t("copilot.micStop") : t("copilot.micStart")) : t("copilot.voiceUnsupported")}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={voice.listening ? t("copilot.listening") : t("copilot.placeholder")}
                aria-label={t("copilot.inputLabel")}
                maxLength={2000}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-ink transition-all placeholder:text-slate-400 focus-visible:border-sun-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-sun-400/25 focus-visible:outline-none"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!input.trim() || send.isPending} aria-label={t("copilot.send")}>
                {send.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        <CopilotContext />
      </div>

      {confirmClear ? (
        <ConfirmDialog
          title={t("copilot.clearTitle")}
          description={t("copilot.clearBody")}
          confirmLabel={t("copilot.clearConfirm")}
          onConfirm={clearChat}
          onCancel={() => setConfirmClear(false)}
        />
      ) : null}
    </div>
  );
}
