import db from "../config/database.js";
import { publish } from "../lib/events.js";
import { sendPush } from "../lib/push.js";
import { sendMessage, twilioStatus } from "../lib/twilio.js";

export interface NotificationInput {
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
  link?: string | null;
  fieldId?: number | null;
}

type ChannelResult = { status: "sent" | "failed" | "skipped"; detail?: string };

export async function notifyUsers(userIds: number[], input: NotificationInput) {
  const results = [];
  for (const userId of new Set(userIds)) {
    results.push(await notifyUser(userId, input));
  }
  return results;
}

export async function notifyUser(userId: number, input: NotificationInput) {
  const user = await db.orm.public.User.first({ id: userId });
  if (!user) return null;

  const severity = input.severity ?? "info";
  const notification = await db.orm.public.Notification.create({
    userId,
    title: input.title,
    body: input.body,
    severity,
    link: input.link ?? null,
    fieldId: input.fieldId ?? null,
  });
  publish([userId], "notification", notification);

  const channels: Record<string, ChannelResult> = { inApp: { status: "sent" } };

  if (user.pushAlerts) {
    const subscriptions = await db.orm.public.PushSubscription.where({ userId }).all();
    if (subscriptions.length === 0) {
      channels.push = { status: "skipped", detail: "No browser subscribed" };
    } else {
      let sent = 0;
      for (const subscription of subscriptions) {
        const result = await sendPush(subscription, { title: input.title, body: input.body, link: input.link, severity });
        if (result.ok) sent += 1;
        else if (result.gone) await db.orm.public.PushSubscription.where({ id: subscription.id }).delete();
      }
      channels.push = sent > 0 ? { status: "sent", detail: `${sent} device(s)` } : { status: "failed" };
    }
  }

  const urgent = severity !== "info";
  const configured = twilioStatus();
  const text = `AgriGuard: ${input.title}. ${input.body}`;

  if (user.smsAlerts && urgent) {
    channels.sms = !user.phone
      ? { status: "skipped", detail: "No phone number" }
      : !configured.sms
        ? { status: "skipped", detail: "SMS provider not configured" }
        : toChannel(await sendMessage("sms", user.phone, text));
  }

  if (user.whatsappAlerts && urgent) {
    channels.whatsapp = !user.phone
      ? { status: "skipped", detail: "No phone number" }
      : !configured.whatsapp
        ? { status: "skipped", detail: "WhatsApp provider not configured" }
        : toChannel(await sendMessage("whatsapp", user.phone, text));
  }

  return db.orm.public.Notification.where({ id: notification.id }).update({ channels: JSON.stringify(channels) });
}

function toChannel(result: { ok: boolean; error?: string }): ChannelResult {
  return result.ok ? { status: "sent" } : { status: "failed", detail: result.error };
}

export async function listNotifications(userId: number, limit = 50) {
  return db.orm.public.Notification
    .where({ userId })
    .orderBy((n) => n.createdAt.desc())
    .limit(limit)
    .all();
}

export async function unreadCount(userId: number) {
  const result = await db.orm.public.Notification
    .where({ userId })
    .where((n) => n.readAt.isNull())
    .aggregate((a) => ({ count: a.count() }));
  return result.count;
}

export async function markRead(userId: number, id?: number) {
  const query = db.orm.public.Notification.where({ userId }).where((n) => n.readAt.isNull());
  const scoped = id ? query.where({ id }) : query;
  await scoped.updateAndCount({ readAt: new Date().toISOString() });
}

export async function saveSubscription(userId: number, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const existing = await db.orm.public.PushSubscription.where({ endpoint: subscription.endpoint }).first();
  if (existing) {
    return db.orm.public.PushSubscription.where({ id: existing.id }).update({
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }
  return db.orm.public.PushSubscription.create({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

export async function removeSubscription(userId: number, endpoint: string) {
  await db.orm.public.PushSubscription.where({ userId, endpoint }).deleteAndCount();
}
