import type { PartialMessages } from "..";

const risk: NonNullable<PartialMessages["risk"]> = {
  description: "प्रत्येक शेतासाठी पाण्याचा ताण, रोग आणि हवामानाचा धोका, सर्वात जास्त धोका असलेली शेते आधी.",
  loadError: "तुमच्या शेतांचे धोके लोड करता आले नाहीत.",
  emptyTitle: "अजून तपासण्यासाठी शेत नाही",
  emptyBody: "फार्म आणि शेत जोडा, आणि पहिल्या रीडिंगनंतर AgriGuard त्याच्या धोक्यांना गुण देईल.",
  emptyCta: "फार्म जोडा",

  statFields: "देखरेखीखालील शेते",
  statFieldsHint: "तुमच्या सर्व फार्ममधील",
  statHigh: "जास्त धोक्याची शेते",
  statHighHint: "किमान एक धोका जास्त",
  statModerate: "लक्ष ठेवायची शेते",
  statModerateHint: "सर्वात मोठा धोका मध्यम",
  statHealth: "पिकांचे सरासरी आरोग्य",
  statHealthHint: "तपासलेल्या सर्व शेतांचे",
  scale: "धोक्याच्या पातळ्या: 65 किंवा जास्त गुण म्हणजे जास्त, 35–64 म्हणजे मध्यम, 35 पेक्षा कमी म्हणजे कमी.",

  water: "पाणी",
  disease: "रोग",
  weather: "हवामान",
  chip: "{risk}: {level}",
  noData: "डेटा नाही",
  healthy: "निरोगी",
  watch: "लक्ष ठेवा",
  atRisk: "धोक्यात",
  healthAria: "पिकाचे आरोग्य 100 पैकी {value}",
  healthUnknown: "पिकाचे आरोग्य अजून तपासलेले नाही",

  showDetails: "तपशील दाखवा",
  hideDetails: "तपशील लपवा",
  openField: "शेत उघडा",
  detailsError: "या शेताचा तपशील लोड करता आला नाही.",
  humidHours: "दमट तास (24 तास)",
  hoursValue: "{value} तास",
  meanTemp: "सरासरी तापमान",
  npk: "मातीतील अन्नद्रव्ये",
  nutrientNone: "रीडिंग नाही",
  decision: "सिंचनाचा निर्णय",

  ctaTitle: "यावर काय करायचे ते पाहा",
  ctaBody: "वरील प्रत्येक धोक्यासोबत शिफारस केलेली कृती आहे.",
};

export default risk;
