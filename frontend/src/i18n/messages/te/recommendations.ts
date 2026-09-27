import type { PartialMessages } from "..";

const recommendations: NonNullable<PartialMessages["recommendations"]> = {
  description: "మీ సెన్సార్లు, వాతావరణం, పంట మోడళ్ల నుండి, వివరణతో కూడిన, ప్రాధాన్య క్రమంలో చర్యలు.",
  loadError: "మీ సలహాలను లోడ్ చేయలేకపోయాం.",
  updateError: "సలహాను అప్‌డేట్ చేయలేకపోయాం",

  statusFilter: "స్థితి",
  typeFilter: "రకం",
  status_OPEN: "పెండింగ్",
  status_DONE: "పూర్తయినవి",
  status_DISMISSED: "పక్కన పెట్టినవి",
  allTypes: "అన్ని రకాలు",
  type_IRRIGATION: "నీటి పారుదల",
  type_DISEASE: "తెగులు",
  type_FERTILIZER: "ఎరువు",
  type_WEATHER: "వాతావరణం",
  type_GENERAL: "సాధారణం",

  countHint_OPEN: "చేయాల్సిన పనులు",
  countHint_DONE: "పూర్తి చేసినవి",
  countHint_DISMISSED: "పక్కన పెట్టినవి",

  empty_OPEN: "ప్రస్తుతం చేయాల్సిందేమీ లేదు",
  empty_DONE: "ఇంకా పూర్తయిన సలహాలు లేవు",
  empty_DISMISSED: "పక్కన పెట్టిన సలహాలు లేవు",
  emptyHint: "మీ పొలాలకు శ్రద్ధ అవసరమైన వెంటనే కొత్త సలహాలు ఇక్కడ కనిపిస్తాయి.",

  why: "ఎందుకు:",
  expectedImpact: "ఆశించిన ఫలితం:",
  fromAgronomist: "మీ వ్యవసాయ నిపుణుడి నుండి",
  agronomistNote: "వ్యవసాయ నిపుణుడి నోట్",
  translateTo: "{language}లోకి అనువదించండి",
  translating: "అనువదిస్తోంది…",
  translatedTo: "{language}లోకి అనువదించాం",
  resolved_DONE: "{time} పూర్తయింది",
  resolved_DISMISSED: "{time} పక్కన పెట్టారు",

  markDone: "పూర్తయింది",
  dismiss: "పక్కన పెట్టండి",
  reopen: "మళ్లీ తెరవండి",
  explain: "వివరించండి",
  hideExplanation: "వివరణ దాచండి",
  explaining: "AgriGuard AI ని అడుగుతోంది…",
  explainError: "వివరణ ఇప్పుడు అందుబాటులో లేదు.",
  toast_OPEN: "సలహాను మళ్లీ తెరిచాం",
  toast_DONE: "పూర్తయినట్లు గుర్తించాం",
  toast_DISMISSED: "సలహాను పక్కన పెట్టాం",
};

export default recommendations;
