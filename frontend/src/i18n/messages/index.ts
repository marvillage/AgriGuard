import type { Language } from "@/lib/types";
import advisor from "./en/advisor";
import auth from "./en/auth";
import common from "./en/common";
import copilot from "./en/copilot";
import dashboard from "./en/dashboard";
import farms from "./en/farms";
import fertilizer from "./en/fertilizer";
import field from "./en/field";
import fieldOps from "./en/fieldOps";
import nav from "./en/nav";
import phone from "./en/phone";
import recommendations from "./en/recommendations";
import risk from "./en/risk";
import scan from "./en/scan";
import settings from "./en/settings";
import sustainability from "./en/sustainability";
import trials from "./en/trials";
import validation from "./en/validation";
import hi from "./hi";
import mr from "./mr";
import pa from "./pa";
import ta from "./ta";
import te from "./te";

export const en = {
  common,
  nav,
  auth,
  dashboard,
  farms,
  field,
  fieldOps,
  fertilizer,
  scan,
  risk,
  recommendations,
  sustainability,
  copilot,
  trials,
  validation,
  phone,
  advisor,
  settings,
};

export type Messages = typeof en;
export type Namespace = keyof Messages;
export type PartialMessages = { [N in Namespace]?: Partial<Record<keyof Messages[N], string>> };

export const catalog: Record<Language, PartialMessages> = { en, hi, mr, pa, te, ta };
