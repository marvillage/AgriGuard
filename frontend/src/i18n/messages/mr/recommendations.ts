import type { PartialMessages } from "..";

const recommendations: NonNullable<PartialMessages["recommendations"]> = {
  description: "तुमचे सेन्सर, हवामान आणि पीक मॉडेलवरून, कारणासह आणि प्राधान्यानुसार मांडलेली कामे.",
  loadError: "तुमच्या शिफारशी लोड करता आल्या नाहीत.",
  updateError: "शिफारस अपडेट करता आली नाही",

  statusFilter: "स्थिती",
  typeFilter: "प्रकार",
  status_OPEN: "बाकी",
  status_DONE: "पूर्ण",
  status_DISMISSED: "नाकारलेल्या",
  allTypes: "सर्व प्रकार",
  type_IRRIGATION: "सिंचन",
  type_DISEASE: "रोग",
  type_FERTILIZER: "खत",
  type_WEATHER: "हवामान",
  type_GENERAL: "सामान्य",

  countHint_OPEN: "बाकी कामे",
  countHint_DONE: "पूर्ण झालेल्या",
  countHint_DISMISSED: "नाकारलेल्या",

  empty_OPEN: "सध्या करण्यासारखे काही नाही",
  empty_DONE: "अजून पूर्ण झालेल्या शिफारशी नाहीत",
  empty_DISMISSED: "नाकारलेल्या शिफारशी नाहीत",
  emptyHint: "तुमच्या शेतांकडे लक्ष देण्याची गरज पडताच नवीन सल्ला इथे दिसेल.",

  why: "का:",
  expectedImpact: "अपेक्षित परिणाम:",
  fromAgronomist: "तुमच्या कृषितज्ज्ञांकडून",
  agronomistNote: "कृषितज्ज्ञांची टीप",
  translateTo: "{language} मध्ये भाषांतर करा",
  translating: "भाषांतर होत आहे…",
  translatedTo: "{language} मध्ये भाषांतर केले",
  resolved_DONE: "{time} पूर्ण केले",
  resolved_DISMISSED: "{time} नाकारले",

  markDone: "पूर्ण झाले",
  dismiss: "नाकारा",
  reopen: "पुन्हा उघडा",
  explain: "समजावून सांगा",
  hideExplanation: "स्पष्टीकरण लपवा",
  explaining: "AgriGuard AI ला विचारत आहे…",
  explainError: "स्पष्टीकरण सध्या उपलब्ध नाही.",
  toast_OPEN: "शिफारस पुन्हा उघडली",
  toast_DONE: "पूर्ण झाली म्हणून खूण केली",
  toast_DISMISSED: "शिफारस नाकारली",
};

export default recommendations;
