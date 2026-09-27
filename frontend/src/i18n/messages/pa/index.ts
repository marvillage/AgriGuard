import type { PartialMessages } from "..";
import advisor from "./advisor";
import auth from "./auth";
import common from "./common";
import copilot from "./copilot";
import dashboard from "./dashboard";
import farms from "./farms";
import fertilizer from "./fertilizer";
import field from "./field";
import fieldOps from "./fieldOps";
import nav from "./nav";
import recommendations from "./recommendations";
import risk from "./risk";
import scan from "./scan";
import settings from "./settings";
import sustainability from "./sustainability";
import trials from "./trials";
import validation from "./validation";

const messages: PartialMessages = {
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
  advisor,
  settings,
};

export default messages;
