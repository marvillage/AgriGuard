import { localCropName } from "./crops.js";
import { translations } from "./translations.js";

export const languages = ["en", "hi", "mr", "pa", "te", "ta"] as const;
export type Language = (typeof languages)[number];

export function asLanguage(value: unknown): Language {
  return languages.includes(value as Language) ? (value as Language) : "en";
}

export type Params = Record<string, string | number | null | undefined>;

export function fill(template: string, params: Params = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === null || value === undefined) return match;
    return typeof value === "number" ? formatNumber(value) : value;
  });
}

export function t(language: Language, key: string, params: Params = {}) {
  const template = translations[language]?.[key] ?? translations.en[key] ?? key;
  return fill(template, typeof params.crop === "string" ? { ...params, crop: localCropName(language, params.crop) } : params);
}

export { localCropName };

export function formatNumber(value: number) {
  if (Math.abs(value) >= 1000) return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

export const languageNames: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  pa: "Punjabi",
  te: "Telugu",
  ta: "Tamil",
};
