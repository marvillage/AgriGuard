import type { Language } from "@/lib/types";

export const languages: Array<{ code: Language; label: string; native: string; speech: string }> = [
  { code: "en", label: "English", native: "English", speech: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", speech: "mr-IN" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", speech: "pa-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
];

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language.code === value);
}

export function speechLocale(language: Language) {
  return languages.find((item) => item.code === language)?.speech ?? "en-IN";
}

export function numberLocale(language: Language) {
  return language === "en" ? "en-IN" : `${language}-IN-u-nu-latn`;
}
