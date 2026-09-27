"use client";

import { useEffect, useSyncExternalStore } from "react";

let audio: AudioContext | null = null;

// Browsers only allow sound after a tap, so the first tap on the controller unlocks it.
export function unlockSound() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

function tones(frequencies: number[]) {
  if (!audio) return;
  const context = audio;
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.28;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.26);
  });
}

export function alertFor(kind: "start" | "stop") {
  navigator.vibrate?.(kind === "start" ? [300, 150, 300] : [600, 200, 600, 200, 600]);
  tones(kind === "start" ? [660, 880, 1175] : [880, 440, 880, 440]);
}

const noop = () => () => undefined;

export function useWakeLock(active: boolean) {
  const supported = useSyncExternalStore(noop, () => "wakeLock" in navigator, () => true);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {
        // refused, for example in battery saver; the note on the page still asks to keep the screen on
      }
    };
    // The browser drops the lock whenever the page is hidden, so it is taken again on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);

  return supported;
}
