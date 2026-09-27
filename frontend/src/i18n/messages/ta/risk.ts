import type { PartialMessages } from "..";

const risk: NonNullable<PartialMessages["risk"]> = {
  description: "ஒவ்வொரு வயலுக்குமான நீர்ப் பற்றாக்குறை, நோய், வானிலை அபாயங்கள்; மோசமானவை முதலில்.",
  loadError: "உங்கள் வயல் அபாயங்களை ஏற்ற முடியவில்லை.",
  emptyTitle: "மதிப்பிட இன்னும் வயல்கள் இல்லை",
  emptyBody: "ஒரு பண்ணையையும் வயலையும் சேருங்கள்; முதல் அளவீட்டுக்குப் பிறகு AgriGuard அதன் அபாயங்களை மதிப்பிடும்.",
  emptyCta: "பண்ணை சேர்",

  statFields: "கண்காணிக்கும் வயல்கள்",
  statFieldsHint: "உங்கள் எல்லாப் பண்ணைகளிலும்",
  statHigh: "அதிக அபாய வயல்கள்",
  statHighHint: "குறைந்தது ஒரு அபாயம் ‘அதிகம்’",
  statModerate: "கவனிக்க வேண்டிய வயல்கள்",
  statModerateHint: "அதிகபட்ச அபாயம் ‘மிதமானது’",
  statHealth: "சராசரி பயிர் ஆரோக்கியம்",
  statHealthHint: "மதிப்பிட்ட எல்லா வயல்களிலும்",
  scale: "அபாய நிலைகள்: அதிகம் = 65 அல்லது அதற்கு மேல், மிதமானது = 35–64, குறைவு = 35-க்குக் கீழ்.",

  water: "நீர்",
  disease: "நோய்",
  weather: "வானிலை",
  chip: "{risk}: {level}",
  noData: "தரவு இல்லை",
  healthy: "ஆரோக்கியம்",
  watch: "கவனம் தேவை",
  atRisk: "அபாயத்தில்",
  healthAria: "பயிர் ஆரோக்கியம் 100-க்கு {value}",
  healthUnknown: "பயிர் ஆரோக்கியம் இன்னும் மதிப்பிடப்படவில்லை",

  showDetails: "விவரங்களைக் காட்டு",
  hideDetails: "விவரங்களை மறை",
  openField: "வயலைத் திற",
  detailsError: "இந்த வயலின் விவரங்களை ஏற்ற முடியவில்லை.",
  humidHours: "ஈரப்பதம் மிகுந்த நேரம் (24 மணி)",
  hoursValue: "{value} மணி நேரம்",
  meanTemp: "சராசரி வெப்பநிலை",
  npk: "மண் சத்துகள்",
  nutrientNone: "அளவீடு இல்லை",
  decision: "நீர்ப்பாசன முடிவு",

  ctaTitle: "என்ன செய்ய வேண்டும் எனப் பாருங்கள்",
  ctaBody: "மேலே உள்ள ஒவ்வொரு அபாயத்துக்கும் பரிந்துரைக்கப்பட்ட செயல் உண்டு.",
};

export default risk;
