"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AppNotification } from "@/lib/types";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "./auth-provider";

const LiveContext = createContext<{ connected: boolean }>({ connected: false });

// One Server-Sent Events connection per signed-in user; events refresh the matching queries.
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;
    let source: EventSource | null = null;
    let retry = 1000;
    let timer: number | undefined;
    let closed = false;
    let dropped = false;

    const connect = () => {
      source = new EventSource(`${API_URL}/api/stream?token=${encodeURIComponent(token)}`);
      source.addEventListener("ready", () => {
        setConnected(true);
        retry = 1000;
        // Events sent while the stream was down are lost, so refresh everything once.
        if (dropped) queryClient.invalidateQueries();
        dropped = false;
      });
      source.addEventListener("telemetry", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { fieldId: number };
        queryClient.invalidateQueries({ queryKey: ["field", data.fieldId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      });
      source.addEventListener("analysis", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { fieldId: number };
        queryClient.invalidateQueries({ queryKey: ["field", data.fieldId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      });
      source.addEventListener("pump", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { fieldId: number };
        queryClient.invalidateQueries({ queryKey: ["field", data.fieldId] });
      });
      source.addEventListener("scan", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { id: number };
        queryClient.invalidateQueries({ queryKey: ["scan", data.id] });
        queryClient.invalidateQueries({ queryKey: ["scans"] });
      });
      source.addEventListener("notification", (event) => {
        const note = JSON.parse((event as MessageEvent).data) as AppNotification;
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        toast({
          title: note.title,
          body: note.body,
          tone: note.severity === "critical" ? "critical" : note.severity === "warning" ? "warning" : "info",
          link: note.link,
        });
      });
      source.onerror = () => {
        setConnected(false);
        dropped = true;
        source?.close();
        if (closed) return;
        timer = window.setTimeout(connect, retry);
        retry = Math.min(retry * 2, 30000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      source?.close();
      setConnected(false);
    };
  }, [user, queryClient, toast]);

  return <LiveContext.Provider value={{ connected }}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}
