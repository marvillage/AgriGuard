import type { PartialMessages } from "..";

const recommendations: NonNullable<PartialMessages["recommendations"]> = {
  description: "आपके सेंसर, मौसम और फसल मॉडल से मिले काम, कारण के साथ और ज़रूरत के क्रम में।",
  loadError: "आपकी सलाह लोड नहीं हो सकी।",
  updateError: "सलाह अपडेट नहीं हो सकी",

  statusFilter: "स्थिति",
  typeFilter: "प्रकार",
  status_OPEN: "बाकी",
  status_DONE: "पूरे हुए",
  status_DISMISSED: "हटाए गए",
  allTypes: "सभी प्रकार",
  type_IRRIGATION: "सिंचाई",
  type_DISEASE: "रोग",
  type_FERTILIZER: "खाद",
  type_WEATHER: "मौसम",
  type_GENERAL: "सामान्य",

  countHint_OPEN: "बाकी काम",
  countHint_DONE: "पूरे हुए",
  countHint_DISMISSED: "हटाए गए",

  empty_OPEN: "अभी करने को कुछ नहीं",
  empty_DONE: "अभी कोई पूरी हुई सलाह नहीं",
  empty_DISMISSED: "कोई हटाई गई सलाह नहीं",
  emptyHint: "जैसे ही आपके खेतों को ध्यान की ज़रूरत होगी, नई सलाह यहाँ दिखेगी।",

  why: "क्यों:",
  expectedImpact: "अनुमानित असर:",
  fromAgronomist: "आपके कृषि विशेषज्ञ की ओर से",
  agronomistNote: "कृषि विशेषज्ञ का नोट",
  translateTo: "{language} में अनुवाद करें",
  translating: "अनुवाद हो रहा है…",
  translatedTo: "{language} में अनुवाद किया गया",
  resolved_DONE: "{time} पूरा हुआ",
  resolved_DISMISSED: "{time} हटाया गया",

  markDone: "हो गया",
  dismiss: "हटाएँ",
  reopen: "फिर से खोलें",
  explain: "समझाएँ",
  hideExplanation: "जानकारी छुपाएँ",
  explaining: "AgriGuard AI से पूछा जा रहा है…",
  explainError: "अभी यह जानकारी नहीं मिल सकी।",
  toast_OPEN: "सलाह फिर से खोली गई",
  toast_DONE: "पूरा मार्क किया गया",
  toast_DISMISSED: "सलाह हटाई गई",
};

export default recommendations;
