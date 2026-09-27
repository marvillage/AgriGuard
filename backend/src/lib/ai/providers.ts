import { env } from "../../config/env.js";
import type { AiProvider, AiRequest } from "./types.js";

const modelCacheMs = 60 * 60 * 1000;

async function http(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

function cached<T>(loader: () => Promise<T>) {
  let value: { at: number; data: T } | null = null;
  return async () => {
    if (value && Date.now() - value.at < modelCacheMs) return value.data;
    const data = await loader();
    value = { at: Date.now(), data };
    return data;
  };
}

function versionScore(name: string) {
  const match = name.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

// ---------------- Google Gemini ----------------
const geminiBase = "https://generativelanguage.googleapis.com/v1beta";

const geminiModels = cached(async () => {
  const body = await http(`${geminiBase}/models?pageSize=200&key=${env.ai.geminiApiKey}`, {}, 15000);
  return (body.models ?? []) as Array<{ name: string; supportedGenerationMethods?: string[] }>;
});

async function geminiCandidates() {
  const models = await geminiModels();
  return models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.startsWith("gemini") && name.includes("flash"))
    .filter((name) => !/tts|image|embedding|live|audio|thinking|exp/.test(name))
    .sort((a, b) => {
      const preview = Number(a.includes("preview")) - Number(b.includes("preview"));
      if (preview !== 0) return preview;
      return versionScore(b) - versionScore(a);
    });
}

// Flash-Lite models reject thinkingConfig with HTTP 400; they don't think by default, so they're sent without it.
const noThinkingConfig = new Set<string>();

async function geminiGenerate(request: AiRequest, model: string) {
  const contents = request.messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      ...(message.images ?? []).map((image) => ({ inline_data: { mime_type: image.mimeType, data: image.base64 } })),
      { text: message.content },
    ],
  }));
  const maxTokens = request.maxTokens ?? 1024;
  // Thinking tokens count against maxOutputTokens, so a thinking model would cut the visible answer short.
  const send = (thinkingOff: boolean) =>
    http(
      `${geminiBase}/models/${model}:generateContent?key=${env.ai.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.4,
            maxOutputTokens: thinkingOff ? maxTokens : maxTokens + 2048,
            ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            ...(request.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
      45000
    );
  let body;
  if (noThinkingConfig.has(model)) {
    body = await send(false);
  } else {
    try {
      body = await send(true);
    } catch (error) {
      if (!/HTTP 400/.test((error as Error).message)) throw error;
      body = await send(false);
      noThinkingConfig.add(model);
    }
  }
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part: { thought?: boolean }) => !part.thought)
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
}

// Two Gemini entries so a rate limit or overload on the main Flash model falls through to Flash-Lite
// (a separate free-tier quota) before the chain reaches the local Ollama model.
function geminiProvider(name: string, lite: boolean): AiProvider {
  return {
    name,
    configured: () => Boolean(env.ai.geminiApiKey),
    async pickModel() {
      if (!lite && env.ai.geminiModel) return env.ai.geminiModel.replace(/^models\//, "");
      const names = (await geminiCandidates()).filter((candidate) => candidate.includes("lite") === lite);
      return names[0] ?? (lite ? null : "gemini-flash-latest");
    },
    generate: geminiGenerate,
  };
}

export const gemini = geminiProvider("gemini", false);
export const geminiLite = geminiProvider("gemini-lite", true);

// ---------------- OpenAI-compatible (Groq, OpenRouter) ----------------
interface OpenAiModel {
  id: string;
  context_length?: number;
  architecture?: { input_modalities?: string[] };
}

function openAiCompatible(options: {
  name: string;
  base: string;
  key: () => string | undefined;
  override: () => string | undefined;
  headers?: Record<string, string>;
  choose: (models: OpenAiModel[], vision: boolean) => string | null;
}): AiProvider {
  const list = cached(async () => {
    const body = await http(`${options.base}/models`, { headers: { Authorization: `Bearer ${options.key()}` } }, 15000);
    return (body.data ?? []) as OpenAiModel[];
  });
  return {
    name: options.name,
    configured: () => Boolean(options.key()),
    async pickModel(vision) {
      const override = options.override();
      if (override && !vision) return override;
      return options.choose(await list(), vision) ?? override ?? null;
    },
    async generate(request: AiRequest, model: string) {
      const messages = [
        ...(request.system ? [{ role: "system", content: request.system }] : []),
        ...request.messages.map((message) => ({
          role: message.role,
          content: message.images?.length
            ? [
                { type: "text", text: message.content },
                ...message.images.map((image) => ({
                  type: "image_url",
                  image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
                })),
              ]
            : message.content,
        })),
      ];
      const body = await http(
        `${options.base}/chat/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.key()}`, ...options.headers },
          body: JSON.stringify({
            model,
            messages,
            temperature: request.temperature ?? 0.4,
            max_tokens: request.maxTokens ?? 1024,
            ...(request.json ? { response_format: { type: "json_object" } } : {}),
          }),
        },
        45000
      );
      return String(body.choices?.[0]?.message?.content ?? "").trim();
    },
  };
}

export const groq = openAiCompatible({
  name: "groq",
  base: "https://api.groq.com/openai/v1",
  key: () => env.ai.groqApiKey,
  override: () => env.ai.groqModel,
  choose(models, vision) {
    const ids = models.map((m) => m.id).filter((id) => !/whisper|tts|guard|embed|distil|playai/.test(id));
    if (vision) {
      return ids.find((id) => /llama-4|scout|maverick|vision/.test(id)) ?? null;
    }
    const preferences = [/llama-3\.3-70b-versatile/, /gpt-oss-120b/, /llama-4-maverick/, /70b/, /qwen/, /llama/];
    for (const pattern of preferences) {
      const hit = ids.find((id) => pattern.test(id));
      if (hit) return hit;
    }
    return ids[0] ?? null;
  },
});

export const openRouter = openAiCompatible({
  name: "openrouter",
  base: "https://openrouter.ai/api/v1",
  key: () => env.ai.openRouterApiKey,
  override: () => env.ai.openRouterModel,
  headers: { "HTTP-Referer": env.frontendUrl, "X-Title": "AgriGuard" },
  choose(models, vision) {
    const free = models.filter((m) => m.id.endsWith(":free") && !/safety|guard|code/.test(m.id));
    const pool = vision ? free.filter((m) => m.architecture?.input_modalities?.includes("image")) : free;
    const preferences = [/google\/gemma/, /qwen/, /meta-llama/, /deepseek/, /mistral/, /nvidia\/nemotron/];
    for (const pattern of preferences) {
      const hits = pool.filter((m) => pattern.test(m.id)).sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0));
      if (hits[0]) return hits[0].id;
    }
    return pool[0]?.id ?? null;
  },
});

// ---------------- Ollama (local, offline) ----------------
const ollamaBase = () => (env.ai.ollamaUrl ?? "http://localhost:11434").replace(/\/$/, "");

const ollamaModels = cached(async () => {
  const body = await http(`${ollamaBase()}/api/tags`, {}, 4000);
  const models = (body.models ?? []) as Array<{ name: string; size: number; details?: { family?: string } }>;
  const detailed = [];
  for (const model of models) {
    let capabilities: string[] = [];
    try {
      const info = await http(`${ollamaBase()}/api/show`, { method: "POST", body: JSON.stringify({ model: model.name }) }, 8000);
      capabilities = info.capabilities ?? [];
    } catch {
      capabilities = [];
    }
    detailed.push({ ...model, capabilities });
  }
  return detailed;
});

let ollamaReachable: { at: number; ok: boolean } | null = null;

export const ollama: AiProvider = {
  name: "ollama",
  configured: () => {
    if (ollamaReachable && Date.now() - ollamaReachable.at < 60000) return ollamaReachable.ok;
    return env.ai.ollamaUrl !== undefined || ollamaReachable?.ok !== false;
  },
  async pickModel(vision) {
    try {
      const models = (await ollamaModels()).filter((m) => m.capabilities.includes("completion") || m.capabilities.length === 0);
      ollamaReachable = { at: Date.now(), ok: true };
      if (env.ai.ollamaModel && !vision) return env.ai.ollamaModel;
      const usable = models.filter((m) => !/embed|bge|nomic|minilm/.test(m.name));
      if (vision) return usable.find((m) => m.capabilities.includes("vision"))?.name ?? null;
      const withVision = usable.find((m) => m.capabilities.includes("vision") && m.size < 9e9);
      const largestText = [...usable].sort((a, b) => b.size - a.size).find((m) => m.size < 9e9);
      return withVision?.name ?? largestText?.name ?? usable[0]?.name ?? null;
    } catch {
      ollamaReachable = { at: Date.now(), ok: false };
      return null;
    }
  },
  async generate(request, model) {
    const messages = [
      ...(request.system ? [{ role: "system", content: request.system }] : []),
      ...request.messages.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.images?.length ? { images: message.images.map((image) => image.base64) } : {}),
      })),
    ];
    const body = await http(
      `${ollamaBase()}/api/chat`,
      {
        method: "POST",
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          ...(request.json ? { format: "json" } : {}),
          options: { temperature: request.temperature ?? 0.4, num_predict: request.maxTokens ?? 1024 },
        }),
      },
      180000
    );
    return String(body.message?.content ?? "").trim();
  },
};

export const providers: AiProvider[] = [gemini, geminiLite, groq, openRouter, ollama];
