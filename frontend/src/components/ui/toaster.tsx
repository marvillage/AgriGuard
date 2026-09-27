"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "critical";

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
  link?: string | null;
}

interface ToastValue {
  toast: (input: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const tones: Record<Tone, { icon: typeof Info; style: string }> = {
  info: { icon: Info, style: "border-navy-100 bg-white" },
  success: { icon: CircleCheck, style: "border-emerald-200 bg-white" },
  warning: { icon: CircleAlert, style: "border-sun-300 bg-sun-50" },
  critical: { icon: CircleAlert, style: "border-red-200 bg-red-50" },
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const toast = useCallback<ToastValue["toast"]>(
    (input) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { ...input, id, tone: input.tone ?? "info" }]);
      window.setTimeout(() => dismiss(id), input.tone === "critical" ? 12000 : 6000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((item) => {
          const { icon: Icon, style } = tones[item.tone];
          const content = (
            <>
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", item.tone === "critical" ? "text-red-600" : item.tone === "warning" ? "text-sun-700" : item.tone === "success" ? "text-emerald-600" : "text-navy-700")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.body ? <p className="mt-0.5 line-clamp-3 text-sm text-slate-600">{item.body}</p> : null}
              </div>
            </>
          );
          return (
            <div key={item.id} className={cn("pointer-events-auto flex animate-fade-up items-start gap-3 rounded-2xl border p-4 shadow-lift", style)}>
              {item.link ? (
                <Link href={item.link} className="flex min-w-0 flex-1 items-start gap-3" onClick={() => dismiss(item.id)}>
                  {content}
                </Link>
              ) : (
                content
              )}
              <button type="button" onClick={() => dismiss(item.id)} className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.toast;
}
