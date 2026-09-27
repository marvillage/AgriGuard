"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const everyMs = 10 * 60 * 1000;
const lastRunKey = "agriguard_weather_relay";

function claimRun() {
  try {
    const last = Number(window.localStorage.getItem(lastRunKey) ?? 0);
    if (Date.now() - last < everyMs) return false;
    window.localStorage.setItem(lastRunKey, String(Date.now()));
  } catch {
    // storage blocked: this tab still relays, only without sharing the schedule with other tabs
  }
  return true;
}

// Open-Meteo sometimes refuses the shared server, so the browser fetches the Open-Meteo data the server
// still needs for this user's fields over its own connection and hands it to the server.
export function WeatherRelay() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let stopped = false;
    const run = async () => {
      if (document.visibilityState !== "visible" || !claimRun()) return;
      const { items } = await api.weatherRelayRequests();
      const fetched: Array<{ id: string; body: unknown }> = [];
      for (const item of items) {
        if (stopped) return;
        const response = await fetch(item.url).catch(() => null);
        if (response?.ok) fetched.push({ id: item.id, body: await response.json() });
      }
      if (!fetched.length || stopped) return;
      const { stored } = await api.weatherRelay(fetched);
      if (stored) await queryClient.invalidateQueries();
    };
    void run().catch(() => undefined);
    const timer = window.setInterval(() => void run().catch(() => undefined), everyMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [queryClient]);

  return null;
}
