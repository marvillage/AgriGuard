import { env } from "../config/env.js";

export function twilioStatus() {
  const { accountSid, authToken, smsFrom, whatsappFrom } = env.twilio;
  return {
    sms: Boolean(accountSid && authToken && smsFrom),
    whatsapp: Boolean(accountSid && authToken && whatsappFrom),
  };
}

export async function sendMessage(channel: "sms" | "whatsapp", to: string, body: string) {
  const { accountSid, authToken, smsFrom, whatsappFrom } = env.twilio;
  const from = channel === "sms" ? smsFrom : whatsappFrom;
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio is not configured" };
  }

  const phone = normalizePhone(to);
  const form = new URLSearchParams({
    To: channel === "whatsapp" ? `whatsapp:${phone}` : phone,
    From: channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from,
    Body: body.slice(0, 1500),
  });

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const result = (await response.json()) as { sid?: string; message?: string };
    return response.ok ? { ok: true, id: result.sid } : { ok: false, error: result.message ?? `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}
