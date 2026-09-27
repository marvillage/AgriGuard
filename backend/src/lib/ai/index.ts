import db from "../../config/database.js";
import { sha256 } from "../ids.js";
import { providers } from "./providers.js";
import type { AiRequest, AiResult } from "./types.js";

export type { AiImage, AiMessage, AiRequest, AiResult } from "./types.js";

const cooldown = new Map<string, number>();

// Tries each configured provider in order (Gemini, Gemini Lite, Groq, OpenRouter, Ollama) and returns the first answer.
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
    const pausedUntil = cooldown.get(provider.name) ?? 0;
    if (pausedUntil > Date.now()) continue;
    try {
      const model = await provider.pickModel(vision);
      if (!model) continue;
      const text = await provider.generate(request, model);
      if (!text) throw new Error("empty response");
      if (key) {
        await db.orm.public.AiCache.create({ cacheKey: key, value: text, provider: `${provider.name}:${model}` }).catch(() => undefined);
      }
      return { text, provider: provider.name, model };
    } catch (error) {
      const message = (error as Error).message;
      errors.push(`${provider.name}: ${message}`);
      if (/HTTP (429|5\d\d)/.test(message)) cooldown.set(provider.name, Date.now() + 60000);
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
    let error: string | null = null;
    if (configured) {
      try {
        textModel = await provider.pickModel(false);
        visionModel = await provider.pickModel(true);
      } catch (err) {
        error = (err as Error).message;
      }
    }
    result.push({ provider: provider.name, configured: configured && (textModel !== null || visionModel !== null), textModel, visionModel, error });
  }
  return { providers: result, available: result.some((p) => p.configured) };
}
