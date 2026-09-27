"use client";

import { useEffect } from "react";
import "@/lib/install-prompt";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}
