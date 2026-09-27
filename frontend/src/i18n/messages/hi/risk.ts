import type { PartialMessages } from "..";

const risk: NonNullable<PartialMessages["risk"]> = {
  description: "हर खेत में पानी की कमी, रोग और मौसम का खतरा, सबसे ज़्यादा खतरे वाले पहले।",
  loadError: "आपके खेतों के खतरे लोड नहीं हो सके।",
  emptyTitle: "अभी जाँचने के लिए कोई खेत नहीं",
  emptyBody: "फ़ार्म और खेत जोड़ें, पहली रीडिंग के बाद AgriGuard उसके खतरों का स्कोर बताएगा।",
  emptyCta: "फ़ार्म जोड़ें",

  statFields: "निगरानी वाले खेत",
  statFieldsHint: "आपके सभी फ़ार्म में",
  statHigh: "ज़्यादा खतरे वाले खेत",
  statHighHint: "कम से कम एक खतरा ज़्यादा",
  statModerate: "नज़र रखने वाले खेत",
  statModerateHint: "सबसे बड़ा खतरा मध्यम",
  statHealth: "फसल की औसत सेहत",
  statHealthHint: "जाँचे गए सभी खेतों में",
  scale: "खतरे के स्तर: स्कोर 65 या ज़्यादा हो तो ज़्यादा, 35–64 हो तो मध्यम, 35 से कम हो तो कम।",

  water: "पानी",
  disease: "रोग",
  weather: "मौसम",
  chip: "{risk}: {level}",
  noData: "डेटा नहीं",
  healthy: "स्वस्थ",
  watch: "नज़र रखें",
  atRisk: "खतरे में",
  healthAria: "फसल की सेहत 100 में से {value}",
  healthUnknown: "फसल की सेहत अभी जाँची नहीं गई",

  showDetails: "विवरण दिखाएँ",
  hideDetails: "विवरण छुपाएँ",
  openField: "खेत खोलें",
  detailsError: "इस खेत का विवरण लोड नहीं हो सका।",
  humidHours: "नमी वाले घंटे (24 घंटे)",
  hoursValue: "{value} घंटे",
  meanTemp: "औसत तापमान",
  npk: "मिट्टी के पोषक तत्व",
  nutrientNone: "रीडिंग नहीं",
  decision: "सिंचाई का फ़ैसला",

  ctaTitle: "देखें इसके लिए क्या करना है",
  ctaBody: "ऊपर के हर खतरे के साथ एक सुझाया गया काम है।",
};

export default risk;
