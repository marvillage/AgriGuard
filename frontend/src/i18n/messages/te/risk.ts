import type { PartialMessages } from "..";

const risk: NonNullable<PartialMessages["risk"]> = {
  description: "ప్రతి పొలానికి నీటి ఎద్దడి, తెగులు, వాతావరణ ప్రమాదం, ఎక్కువ ప్రమాదం ఉన్నవి ముందు.",
  loadError: "మీ పొలాల ప్రమాదాలను లోడ్ చేయలేకపోయాం.",
  emptyTitle: "అంచనా వేయడానికి ఇంకా పొలాలు లేవు",
  emptyBody: "ఫారం, పొలం జోడించండి, మొదటి రీడింగ్ తర్వాత AgriGuard దాని ప్రమాదాలకు స్కోరు ఇస్తుంది.",
  emptyCta: "ఫారం జోడించండి",

  statFields: "పర్యవేక్షణలో ఉన్న పొలాలు",
  statFieldsHint: "మీ అన్ని ఫారాల్లో",
  statHigh: "ఎక్కువ ప్రమాదం ఉన్న పొలాలు",
  statHighHint: "కనీసం ఒక ప్రమాదానికి ఎక్కువ స్కోరు",
  statModerate: "గమనించాల్సిన పొలాలు",
  statModerateHint: "అత్యధిక ప్రమాదం మధ్యస్థం",
  statHealth: "సగటు పంట ఆరోగ్యం",
  statHealthHint: "అంచనా వేసిన అన్ని పొలాల్లో",
  scale: "ప్రమాద స్థాయిలు: స్కోరు 65 లేదా అంతకంటే ఎక్కువ = ఎక్కువ, 35–64 = మధ్యస్థం, 35 కంటే తక్కువ = తక్కువ.",

  water: "నీరు",
  disease: "తెగులు",
  weather: "వాతావరణం",
  chip: "{risk}: {level}",
  noData: "డేటా లేదు",
  healthy: "ఆరోగ్యంగా ఉంది",
  watch: "గమనించాలి",
  atRisk: "ప్రమాదంలో ఉంది",
  healthAria: "పంట ఆరోగ్యం 100కి {value}",
  healthUnknown: "పంట ఆరోగ్యం ఇంకా అంచనా వేయలేదు",

  showDetails: "వివరాలు చూపండి",
  hideDetails: "వివరాలు దాచండి",
  openField: "పొలం తెరవండి",
  detailsError: "ఈ పొలం వివరాలను లోడ్ చేయలేకపోయాం.",
  humidHours: "తేమగా ఉన్న గంటలు (24 గం.)",
  hoursValue: "{value} గం.",
  meanTemp: "సగటు ఉష్ణోగ్రత",
  npk: "నేల పోషకాలు",
  nutrientNone: "రీడింగ్ లేదు",
  decision: "నీటి పారుదల నిర్ణయం",

  ctaTitle: "దీనికి ఏం చేయాలో చూడండి",
  ctaBody: "పైన ఉన్న ప్రతి ప్రమాదానికి ఒక సూచించిన చర్య ఉంది.",
};

export default risk;
