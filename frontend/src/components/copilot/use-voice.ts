"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface RecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

export type VoiceError = "micDenied" | "noSpeech" | "voiceNetwork" | "voiceError";

const subscribeNever = () => () => {};

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function useBrowserSupport(check: () => boolean) {
  return useSyncExternalStore(subscribeNever, check, () => false);
}

function errorCode(error: string): VoiceError | null {
  if (error === "aborted") return null;
  if (error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture") return "micDenied";
  if (error === "no-speech") return "noSpeech";
  if (error === "network") return "voiceNetwork";
  return "voiceError";
}

export function useVoiceInput({
  locale,
  onInterim,
  onFinal,
}: {
  locale: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  const supported = useBrowserSupport(() => recognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const handlers = useRef({ onInterim, onFinal });

  useEffect(() => {
    handlers.current = { onInterim, onFinal };
  }, [onInterim, onFinal]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognitionRef.current?.abort();
    const recognition = new Constructor();
    recognition.lang = locale;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let transcript = "";
      let final = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
        if (event.results[index].isFinal) final = true;
      }
      if (final) handlers.current.onFinal(transcript.trim());
      else handlers.current.onInterim(transcript);
    };
    recognition.onerror = (event) => setError(errorCode(event.error));
    recognition.onend = () => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("voiceError");
    }
  }, [locale]);

  return { supported, listening, error, start, stop };
}

function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentencesOf(text: string) {
  const parts = text.split(/([.!?।]+\s+)/);
  const sentences: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const sentence = `${parts[index]}${parts[index + 1] ?? ""}`.trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}

function pickVoice(locale: string) {
  const voices = window.speechSynthesis.getVoices();
  const wanted = locale.toLowerCase();
  const base = wanted.split("-")[0];
  return (
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase() === wanted) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

export function useSpeaker(locale: string) {
  const supported = useBrowserSupport(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const warmUp = () => synth.getVoices();
    warmUp();
    synth.addEventListener("voiceschanged", warmUp);
    return () => {
      synth.removeEventListener("voiceschanged", warmUp);
      synth.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: number, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const sentences = sentencesOf(cleanForSpeech(text));
      if (sentences.length === 0) return;
      const voice = pickVoice(locale);
      const finish = () => setSpeakingId((current) => (current === id ? null : current));
      setSpeakingId(id);
      // Chromium drops long utterances, so each sentence is queued on its own.
      sentences.forEach((sentence, index) => {
        const utterance = new SpeechSynthesisUtterance(sentence.trim());
        utterance.lang = locale;
        if (voice) utterance.voice = voice;
        if (index === sentences.length - 1) utterance.onend = finish;
        utterance.onerror = finish;
        synth.speak(utterance);
      });
    },
    [locale, supported]
  );

  return { supported, speakingId, speak, stop };
}

const autoReadKey = "agriguard_copilot_autoread";

function readAutoRead() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(autoReadKey) === "1";
  } catch {
    return false;
  }
}

export function useAutoRead() {
  const [enabled, setEnabled] = useState(readAutoRead);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(autoReadKey, next ? "1" : "0");
    } catch {
      // storage blocked; keep the choice for this visit only
    }
  }, [enabled]);

  return { enabled, toggle };
}
