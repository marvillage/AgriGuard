import type { Language } from "./index.js";

type LocalNames = Record<Exclude<Language, "en">, string>;

// Covers the agronomy profiles (data/crops.ts) and the scan-model crops (data/disease-knowledge.ts).
// `en` lists every English spelling stored in the data files so saved names are recognised too.
const cropNames: Array<{ key: string; en: string[]; names: LocalNames }> = [
  { key: "wheat", en: ["Wheat"], names: { hi: "गेहूँ", mr: "गहू", pa: "ਕਣਕ", te: "గోధుమ", ta: "கோதுமை" } },
  { key: "paddy", en: ["Paddy (rice)", "Paddy", "Rice"], names: { hi: "धान", mr: "भात", pa: "ਝੋਨਾ", te: "వరి", ta: "நெல்" } },
  { key: "maize", en: ["Maize", "Corn (Maize)", "Corn"], names: { hi: "मक्का", mr: "मका", pa: "ਮੱਕੀ", te: "మొక్కజొన్న", ta: "மக்காச்சோளம்" } },
  { key: "corn", en: [], names: { hi: "मक्का", mr: "मका", pa: "ਮੱਕੀ", te: "మొక్కజొన్న", ta: "மக்காச்சோளம்" } },
  { key: "cotton", en: ["Cotton"], names: { hi: "कपास", mr: "कापूस", pa: "ਕਪਾਹ", te: "పత్తి", ta: "பருத்தி" } },
  { key: "sugarcane", en: ["Sugarcane"], names: { hi: "गन्ना", mr: "ऊस", pa: "ਗੰਨਾ", te: "చెరకు", ta: "கரும்பு" } },
  { key: "tomato", en: ["Tomato"], names: { hi: "टमाटर", mr: "टोमॅटो", pa: "ਟਮਾਟਰ", te: "టమాటా", ta: "தக்காளி" } },
  { key: "potato", en: ["Potato"], names: { hi: "आलू", mr: "बटाटा", pa: "ਆਲੂ", te: "బంగాళాదుంప", ta: "உருளைக்கிழங்கு" } },
  { key: "onion", en: ["Onion"], names: { hi: "प्याज़", mr: "कांदा", pa: "ਪਿਆਜ਼", te: "ఉల్లిపాయ", ta: "வெங்காயம்" } },
  { key: "chilli", en: ["Chilli / pepper", "Chilli"], names: { hi: "मिर्च", mr: "मिरची", pa: "ਮਿਰਚ", te: "మిరప", ta: "மிளகாய்" } },
  { key: "soybean", en: ["Soybean"], names: { hi: "सोयाबीन", mr: "सोयाबीन", pa: "ਸੋਇਆਬੀਨ", te: "సోయాబీన్", ta: "சோயாபீன்" } },
  { key: "groundnut", en: ["Groundnut"], names: { hi: "मूंगफली", mr: "भुईमूग", pa: "ਮੂੰਗਫਲੀ", te: "వేరుశనగ", ta: "நிலக்கடலை" } },
  { key: "mustard", en: ["Mustard"], names: { hi: "सरसों", mr: "मोहरी", pa: "ਸਰ੍ਹੋਂ", te: "ఆవాలు", ta: "கடுகு" } },
  { key: "chickpea", en: ["Chickpea"], names: { hi: "चना", mr: "हरभरा", pa: "ਛੋਲੇ", te: "శనగ", ta: "கொண்டைக்கடலை" } },
  { key: "grapes", en: ["Grapes", "Grape"], names: { hi: "अंगूर", mr: "द्राक्षे", pa: "ਅੰਗੂਰ", te: "ద్రాక్ష", ta: "திராட்சை" } },
  { key: "grape", en: [], names: { hi: "अंगूर", mr: "द्राक्षे", pa: "ਅੰਗੂਰ", te: "ద్రాక్ష", ta: "திராட்சை" } },
  { key: "apple", en: ["Apple"], names: { hi: "सेब", mr: "सफरचंद", pa: "ਸੇਬ", te: "ఆపిల్", ta: "ஆப்பிள்" } },
  { key: "blueberry", en: ["Blueberry"], names: { hi: "ब्लूबेरी", mr: "ब्लूबेरी", pa: "ਬਲੂਬੇਰੀ", te: "బ్లూబెర్రీ", ta: "புளுபெர்ரி" } },
  { key: "cherry", en: ["Cherry"], names: { hi: "चेरी", mr: "चेरी", pa: "ਚੈਰੀ", te: "చెర్రీ", ta: "செர்ரி" } },
  { key: "orange", en: ["Orange"], names: { hi: "संतरा", mr: "संत्रा", pa: "ਸੰਤਰਾ", te: "నారింజ", ta: "ஆரஞ்சு" } },
  { key: "peach", en: ["Peach"], names: { hi: "आड़ू", mr: "पीच", pa: "ਆੜੂ", te: "పీచ్", ta: "பீச்" } },
  { key: "pepper", en: ["Bell Pepper"], names: { hi: "शिमला मिर्च", mr: "ढोबळी मिरची", pa: "ਸ਼ਿਮਲਾ ਮਿਰਚ", te: "క్యాప్సికం", ta: "குடைமிளகாய்" } },
  { key: "raspberry", en: ["Raspberry"], names: { hi: "रास्पबेरी", mr: "रास्पबेरी", pa: "ਰਸਭਰੀ", te: "రాస్ప్బెర్రీ", ta: "ராஸ்பெர்ரி" } },
  { key: "squash", en: ["Squash"], names: { hi: "कद्दू", mr: "भोपळा", pa: "ਕੱਦੂ", te: "గుమ్మడి", ta: "பூசணி" } },
  { key: "strawberry", en: ["Strawberry"], names: { hi: "स्ट्रॉबेरी", mr: "स्ट्रॉबेरी", pa: "ਸਟ੍ਰਾਬੇਰੀ", te: "స్ట్రాబెర్రీ", ta: "ஸ்ட்ராபெர்ரி" } },
];

// Accepts a crop key or its English name; anything else (a farmer's own name) is returned unchanged.
export function localCropName(language: Language, value: string | null | undefined) {
  if (!value || language === "en") return value ?? null;
  const normalized = value.trim().toLowerCase();
  const entry = cropNames.find((crop) => crop.key === normalized || crop.en.some((name) => name.toLowerCase() === normalized));
  return entry ? entry.names[language] : value;
}

// For a crop key: the translated name, else the English display name (localCropName would echo the key).
export function cropDisplayName(language: Language, key: string, englishName: string) {
  const local = localCropName(language, key);
  return local && local !== key ? local : englishName;
}
