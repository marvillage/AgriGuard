import type { Language } from "./index.js";

// Local names for the soil types in data/soils.ts, keyed by soil key.
const soilNames: Record<string, Record<Exclude<Language, "en">, string>> = {
  sandy: { hi: "बलुई मिट्टी", mr: "वाळूमय माती", pa: "ਰੇਤਲੀ ਮਿੱਟੀ", te: "ఇసుక నేల", ta: "மணல் மண்" },
  red: { hi: "लाल मिट्टी", mr: "तांबडी माती", pa: "ਲਾਲ ਮਿੱਟੀ", te: "ఎర్ర నేల", ta: "செம்மண்" },
  laterite: { hi: "लैटेराइट मिट्टी", mr: "जांभी माती", pa: "ਲੈਟਰਾਈਟ ਮਿੱਟੀ", te: "లేటరైట్ నేల", ta: "லேட்டரைட் மண்" },
  loam: { hi: "दोमट मिट्टी", mr: "पोयटा माती", pa: "ਮੈਰਾ ਮਿੱਟੀ", te: "లోమ్ నేల", ta: "லோம் மண்" },
  alluvial: { hi: "जलोढ़ मिट्टी", mr: "गाळाची माती", pa: "ਜਲੋੜ੍ਹ ਮਿੱਟੀ", te: "ఒండ్రు నేల", ta: "வண்டல் மண்" },
  clay: { hi: "चिकनी मिट्टी", mr: "चिकणमाती", pa: "ਚੀਕਣੀ ਮਿੱਟੀ", te: "బంకమట్టి నేల", ta: "களிமண்" },
  black: { hi: "काली मिट्टी", mr: "काळी माती", pa: "ਕਾਲੀ ਮਿੱਟੀ", te: "నల్లరేగడి నేల", ta: "கரிசல் மண்" },
};

// The English name stays in the label so the stored value is always recognisable.
export function soilLabel(language: Language, soil: { key: string; name: string }) {
  const local = language === "en" ? null : soilNames[soil.key]?.[language];
  return local ? `${local} · ${soil.name}` : soil.name;
}
