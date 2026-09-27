import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import webpush from "web-push";
import { env } from "../config/env.js";
import { fromRoot } from "../config/paths.js";

const keyFile = fromRoot("data", "vapid.json");
let keys: { publicKey: string; privateKey: string } | null = null;

export function vapidKeys() {
  if (keys) return keys;
  if (env.vapid.publicKey && env.vapid.privateKey) {
    keys = { publicKey: env.vapid.publicKey, privateKey: env.vapid.privateKey };
  } else if (existsSync(keyFile)) {
    keys = JSON.parse(readFileSync(keyFile, "utf8"));
  } else {
    keys = webpush.generateVAPIDKeys();
    mkdirSync(resolve(keyFile, ".."), { recursive: true });
    writeFileSync(keyFile, JSON.stringify(keys, null, 2));
  }
  webpush.setVapidDetails(env.vapid.subject, keys!.publicKey, keys!.privateKey);
  return keys!;
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; link?: string | null; severity?: string }
) {
  vapidKeys();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 3600 }
    );
    return { ok: true as const };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return { ok: false as const, gone: statusCode === 404 || statusCode === 410, error: String((error as Error).message ?? error) };
  }
}
