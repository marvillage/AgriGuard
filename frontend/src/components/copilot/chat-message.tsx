"use client";

import { Cpu, Sparkles, Square, User, Volume2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageText } from "./message-text";
import { providerText } from "./provider-label";

export function ChatBubble({
  message,
  speaking,
  canSpeak,
  onSpeak,
  onStop,
}: {
  message: ChatMessage;
  speaking: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
  onStop: () => void;
}) {
  const { t, language } = useI18n();
  const mine = message.role === "user";
  const provider = message.provider
    ? message.provider === "rules"
      ? t("common.rulesEngine")
      : t("common.poweredBy", { provider: providerText(message.provider) })
    : null;

  return (
    <div className={cn("flex animate-fade-up items-start gap-2.5", mine && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-sun-400 text-ink" : "bg-navy-950 text-sun-400"
        )}
      >
        {mine ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </span>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1.5 sm:max-w-[78%]", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft",
            mine ? "rounded-br-md bg-navy-950 whitespace-pre-wrap break-words text-white" : "rounded-bl-md border border-slate-200/80 bg-white text-slate-700"
          )}
        >
          {mine ? message.content : <MessageText text={message.content} />}
        </div>
        <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-slate-400", mine && "justify-end")}>
          {message.createdAt ? <span>{formatTime(message.createdAt, language)}</span> : null}
          {!mine && provider ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
              <Cpu className="h-3 w-3 shrink-0" />
              <span className="min-w-0 break-all">{provider}</span>
            </span>
          ) : null}
          {!mine && canSpeak ? (
            <button
              type="button"
              onClick={speaking ? onStop : onSpeak}
              aria-label={speaking ? t("copilot.stopSpeaking") : t("copilot.speak")}
              title={speaking ? t("copilot.stopSpeaking") : t("copilot.speak")}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors",
                speaking ? "bg-sun-100 text-sun-800 hover:bg-sun-200" : "text-navy-700 hover:bg-navy-50"
              )}
            >
              {speaking ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
              {speaking ? t("copilot.stopSpeaking") : t("copilot.speak")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TypingBubble() {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-2.5" role="status">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-sun-400">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex gap-1">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="h-2 w-2 animate-typing rounded-full bg-navy-700" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </span>
          <span className="text-sm font-medium text-slate-600">{t("copilot.thinking")}</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{t("copilot.thinkingHint")}</p>
      </div>
    </div>
  );
}
