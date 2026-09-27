import type { PartialMessages } from "..";

const recommendations: NonNullable<PartialMessages["recommendations"]> = {
  description: "உங்கள் சென்சார்கள், வானிலை, பயிர் மாதிரிகளிலிருந்து விளக்கத்துடன், முன்னுரிமைப்படி செயல்கள்.",
  loadError: "உங்கள் பரிந்துரைகளை ஏற்ற முடியவில்லை.",
  updateError: "பரிந்துரையைப் புதுப்பிக்க முடியவில்லை",

  statusFilter: "நிலை",
  typeFilter: "வகை",
  status_OPEN: "நிலுவையில்",
  status_DONE: "முடிந்தவை",
  status_DISMISSED: "நிராகரித்தவை",
  allTypes: "எல்லா வகைகளும்",
  type_IRRIGATION: "நீர்ப்பாசனம்",
  type_DISEASE: "நோய்",
  type_FERTILIZER: "உரம்",
  type_WEATHER: "வானிலை",
  type_GENERAL: "பொது",

  countHint_OPEN: "நிலுவைச் செயல்கள்",
  countHint_DONE: "முடிந்தவை",
  countHint_DISMISSED: "நிராகரித்தவை",

  empty_OPEN: "இப்போது செய்ய எதுவும் இல்லை",
  empty_DONE: "இன்னும் முடிந்த பரிந்துரைகள் இல்லை",
  empty_DISMISSED: "நிராகரித்த பரிந்துரைகள் இல்லை",
  emptyHint: "உங்கள் வயல்களுக்குக் கவனம் தேவைப்பட்டதும் புதிய ஆலோசனை இங்கே தோன்றும்.",

  why: "ஏன்:",
  expectedImpact: "எதிர்பார்க்கும் பலன்:",
  fromAgronomist: "உங்கள் வேளாண் நிபுணரிடமிருந்து",
  agronomistNote: "நிபுணர் குறிப்பு",
  translateTo: "{language} மொழியில் மொழிபெயர்",
  translating: "மொழிபெயர்க்கிறது…",
  translatedTo: "{language} மொழியில் மொழிபெயர்க்கப்பட்டது",
  resolved_DONE: "{time} முடிந்தது",
  resolved_DISMISSED: "{time} நிராகரிக்கப்பட்டது",

  markDone: "முடிந்ததாகக் குறி",
  dismiss: "நிராகரி",
  reopen: "மீண்டும் திற",
  explain: "விளக்கு",
  hideExplanation: "விளக்கத்தை மறை",
  explaining: "AgriGuard AI-இடம் கேட்கிறது…",
  explainError: "விளக்கம் இப்போது கிடைக்கவில்லை.",
  toast_OPEN: "பரிந்துரை மீண்டும் திறக்கப்பட்டது",
  toast_DONE: "முடிந்ததாகக் குறிக்கப்பட்டது",
  toast_DISMISSED: "பரிந்துரை நிராகரிக்கப்பட்டது",
};

export default recommendations;
