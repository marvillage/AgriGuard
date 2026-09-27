import { createHash, randomBytes } from "node:crypto";

export function deviceKey() {
  return `agd_${randomBytes(18).toString("base64url")}`;
}

export function shareCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
