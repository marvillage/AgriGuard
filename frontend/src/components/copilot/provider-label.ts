const names: Record<string, string> = {
  gemini: "Gemini",
  "gemini-lite": "Gemini Lite",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
};

export function providerName(provider: string) {
  return names[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function splitProvider(raw: string) {
  const index = raw.indexOf(":");
  if (index === -1) return { provider: providerName(raw), model: null };
  return { provider: providerName(raw.slice(0, index)), model: raw.slice(index + 1) };
}

export function providerText(raw: string) {
  const { provider, model } = splitProvider(raw);
  return model ? `${provider} · ${model}` : provider;
}
