import "dotenv/config";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const optionalEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port: Number(process.env.PORT ?? 5000),

  databaseUrl: requiredEnv("DATABASE_URL"),

  jwtSecret: requiredEnv("JWT_SECRET"),

  timezone: optionalEnv("APP_TIMEZONE") ?? "Asia/Kolkata",
  publicApiUrl: optionalEnv("PUBLIC_API_URL") ?? optionalEnv("RENDER_EXTERNAL_URL") ?? `http://localhost:${process.env.PORT ?? 5000}`,
  frontendUrl: optionalEnv("FRONTEND_URL") ?? "http://localhost:3100",
  enableJobs: optionalEnv("ENABLE_JOBS") !== "false",
  // Number of reverse proxies in front of the API (1 on Render), so rate limits see each visitor's own IP.
  trustProxy: Number(optionalEnv("TRUST_PROXY") ?? 0),

  ai: {
    geminiApiKey: optionalEnv("GEMINI_API_KEY"),
    geminiModel: optionalEnv("GEMINI_MODEL"),
    groqApiKey: optionalEnv("GROQ_API_KEY"),
    groqModel: optionalEnv("GROQ_MODEL"),
    openRouterApiKey: optionalEnv("OPENROUTER_API_KEY"),
    openRouterModel: optionalEnv("OPENROUTER_MODEL"),
    ollamaUrl: optionalEnv("OLLAMA_URL"),
    ollamaModel: optionalEnv("OLLAMA_MODEL"),
  },

  twilio: {
    accountSid: optionalEnv("TWILIO_ACCOUNT_SID"),
    authToken: optionalEnv("TWILIO_AUTH_TOKEN"),
    smsFrom: optionalEnv("TWILIO_SMS_FROM"),
    whatsappFrom: optionalEnv("TWILIO_WHATSAPP_FROM"),
  },

  vapid: {
    publicKey: optionalEnv("VAPID_PUBLIC_KEY"),
    privateKey: optionalEnv("VAPID_PRIVATE_KEY"),
    subject: optionalEnv("VAPID_SUBJECT") ?? "mailto:alerts@agriguard.local",
  },

  dataGovApiKey: optionalEnv("DATA_GOV_API_KEY"),
};
