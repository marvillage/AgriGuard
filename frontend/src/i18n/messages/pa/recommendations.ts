import type { PartialMessages } from "..";

const recommendations: NonNullable<PartialMessages["recommendations"]> = {
  description: "ਤੁਹਾਡੇ ਸੈਂਸਰਾਂ, ਮੌਸਮ ਅਤੇ ਫ਼ਸਲ ਮਾਡਲਾਂ ਤੋਂ ਸਮਝਾਈਆਂ, ਤਰਜੀਹ ਮੁਤਾਬਕ ਕਾਰਵਾਈਆਂ।",
  loadError: "ਤੁਹਾਡੀਆਂ ਸਿਫ਼ਾਰਸ਼ਾਂ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀਆਂ।",
  updateError: "ਸਿਫ਼ਾਰਸ਼ ਅੱਪਡੇਟ ਨਹੀਂ ਹੋ ਸਕੀ",

  statusFilter: "ਸਥਿਤੀ",
  typeFilter: "ਕਿਸਮ",
  status_OPEN: "ਬਾਕੀ",
  status_DONE: "ਪੂਰੀਆਂ",
  status_DISMISSED: "ਹਟਾਈਆਂ",
  allTypes: "ਸਾਰੀਆਂ ਕਿਸਮਾਂ",
  type_IRRIGATION: "ਸਿੰਚਾਈ",
  type_DISEASE: "ਬਿਮਾਰੀ",
  type_FERTILIZER: "ਖਾਦ",
  type_WEATHER: "ਮੌਸਮ",
  type_GENERAL: "ਆਮ",

  countHint_OPEN: "ਬਾਕੀ ਕੰਮ",
  countHint_DONE: "ਪੂਰੀਆਂ ਹੋਈਆਂ",
  countHint_DISMISSED: "ਹਟਾਈਆਂ ਗਈਆਂ",

  empty_OPEN: "ਇਸ ਵੇਲੇ ਕੋਈ ਕੰਮ ਨਹੀਂ",
  empty_DONE: "ਅਜੇ ਕੋਈ ਸਿਫ਼ਾਰਸ਼ ਪੂਰੀ ਨਹੀਂ ਹੋਈ",
  empty_DISMISSED: "ਕੋਈ ਹਟਾਈ ਹੋਈ ਸਿਫ਼ਾਰਸ਼ ਨਹੀਂ",
  emptyHint: "ਜਿਵੇਂ ਹੀ ਤੁਹਾਡੇ ਖੇਤਾਂ ਨੂੰ ਧਿਆਨ ਦੀ ਲੋੜ ਹੋਵੇਗੀ, ਨਵੀਂ ਸਲਾਹ ਇੱਥੇ ਦਿਸੇਗੀ।",

  why: "ਕਿਉਂ:",
  expectedImpact: "ਸੰਭਾਵੀ ਅਸਰ:",
  fromAgronomist: "ਤੁਹਾਡੇ ਖੇਤੀ ਮਾਹਿਰ ਵੱਲੋਂ",
  agronomistNote: "ਖੇਤੀ ਮਾਹਿਰ ਦਾ ਨੋਟ",
  translateTo: "{language} ਵਿੱਚ ਅਨੁਵਾਦ ਕਰੋ",
  translating: "ਅਨੁਵਾਦ ਹੋ ਰਿਹਾ ਹੈ…",
  translatedTo: "{language} ਵਿੱਚ ਅਨੁਵਾਦ ਕੀਤਾ",
  resolved_DONE: "{time} ਪੂਰੀ ਕੀਤੀ",
  resolved_DISMISSED: "{time} ਹਟਾਈ",

  markDone: "ਪੂਰੀ ਮਾਰਕ ਕਰੋ",
  dismiss: "ਹਟਾਓ",
  reopen: "ਮੁੜ ਖੋਲ੍ਹੋ",
  explain: "ਸਮਝਾਓ",
  hideExplanation: "ਵਿਆਖਿਆ ਲੁਕਾਓ",
  explaining: "AgriGuard AI ਤੋਂ ਪੁੱਛਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
  explainError: "ਵਿਆਖਿਆ ਇਸ ਵੇਲੇ ਉਪਲਬਧ ਨਹੀਂ।",
  toast_OPEN: "ਸਿਫ਼ਾਰਸ਼ ਮੁੜ ਖੋਲ੍ਹੀ ਗਈ",
  toast_DONE: "ਪੂਰੀ ਮਾਰਕ ਹੋ ਗਈ",
  toast_DISMISSED: "ਸਿਫ਼ਾਰਸ਼ ਹਟਾ ਦਿੱਤੀ ਗਈ",
};

export default recommendations;
