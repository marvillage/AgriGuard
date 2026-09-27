import db from "../../config/database.js";
import { sha256 } from "../ids.js";
import { providers } from "./providers.js";
import type { AiProvider, AiRequest, AiResult } from "./types.js";

export type { AiImage, AiMessage, AiRequest, AiResult } from "./types.js";

const cooldown = new Map<string, number>();

// Gemini free-tier daily quotas reset at midnight Pacific time.
function msUntilPacificMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return 86400000 - (part("hour") * 3600 + part("minute") * 60 + part("second")) * 1000 + 60000;
}

export function pauseAfter(message: string) {
  // Retired models stay in the model list but answer 404 ("no longer available to new users").
  if (/HTTP 404/.test(message)) return 24 * 3600 * 1000;
  if (/HTTP 429/.test(message) && /PerDay/.test(message)) return msUntilPacificMidnight();
  if (/HTTP (429|5\d\d)/.test(message)) return 60000;
  return 0;
}

async function modelsFor(provider: AiProvider, vision: boolean) {
  if (provider.models) return provider.models(vision);
  const model = await provider.pickModel(vision);
  return model ? [model] : [];
}

// Tries each configured provider in order (Gemini, Gemini Lite, Groq, OpenRouter, Ollama), model by model, and returns the first answer.
export async function generate(request: AiRequest, options: { cacheKey?: string } = {}): Promise<AiResult | null> {
  const vision = request.messages.some((message) => (message.images?.length ?? 0) > 0);
  const key = options.cacheKey ? `ai:${sha256(options.cacheKey)}` : null;
  if (key) {
    const hit = await db.orm.public.AiCache.where({ cacheKey: key }).first();
    if (hit) {
      const stored = hit.provider ?? "cache";
      const split = stored.indexOf(":");
      return split === -1
        ? { text: hit.value, provider: stored, model: "unknown", cached: true }
        : { text: hit.value, provider: stored.slice(0, split), model: stored.slice(split + 1), cached: true };
    }
  }

  const errors: string[] = [];
  for (const provider of providers) {
    if (!provider.configured()) continue;
    let models: string[];
    try {
      models = await modelsFor(provider, vision);
    } catch (error) {
      errors.push(`${provider.name}: ${(error as Error).message.slice(0, 200)}`);
      continue;
    }
    for (const model of models) {
      const slot = `${provider.name}:${model}`;
      if ((cooldown.get(slot) ?? 0) > Date.now()) continue;
      try {
        const text = await provider.generate(request, model);
        if (!text) throw new Error("empty response");
        if (key) {
          await db.orm.public.AiCache.create({ cacheKey: key, value: text, provider: slot }).catch(() => undefined);
        }
        return { text, provider: provider.name, model };
      } catch (error) {
        const message = (error as Error).message;
        errors.push(`${slot}: ${message.slice(0, 200)}`);
        const pause = pauseAfter(message);
        if (pause) cooldown.set(slot, Date.now() + pause);
      }
    }
  }
  if (errors.length) console.warn("AI providers failed:", errors.join(" | "));
  return null;
}

export async function generateJson<T>(request: AiRequest, options: { cacheKey?: string } = {}) {
  const result = await generate({ ...request, json: true }, options);
  if (!result) return null;
  const data = parseJson<T>(result.text);
  return data ? { data, provider: result.provider, model: result.model } : null;
}

export function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export async function aiStatus() {
  const result = [];
  for (const provider of providers) {
    const configured = provider.configured();
    let textModel: string | null = null;
    let visionModel: string | null = null;
    let models: Array<{ model: string; pausedUntil: string | null }> = [];
    let error: string | null = null;
    if (configured) {
      try {
        textModel = await provider.pickModel(false);
        visionModel = await provider.pickModel(true);
        models = (await modelsFor(provider, false)).map((model) => {
          const until = cooldown.get(`${provider.name}:${model}`) ?? 0;
          return { model, pausedUntil: until > Date.now() ? new Date(until).toISOString() : null };
        });
      } catch (err) {
        error = (err as Error).message.slice(0, 200);
      }
    }
    result.push({ provider: provider.name, configured: configured && (textModel !== null || visionModel !== null), textModel, visionModel, models, error });
  }
  return { providers: result, available: result.some((p) => p.configured) };
}
