import { Router } from "express";
import multer from "multer";
import db from "../config/database.js";
import { crops } from "../data/crops.js";
import { soils } from "../data/soils.js";
import { asLanguage, localCropName, type Language } from "../i18n/index.js";
import { soilLabel } from "../i18n/soils.js";
import { aiStatus } from "../lib/ai/index.js";
import { addClient } from "../lib/events.js";
import { vapidKeys } from "../lib/push.js";
import { twilioStatus } from "../lib/twilio.js";
import { verifyToken } from "../utils/jwt.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { farmAccess } from "../services/access.service.js";
import * as advisor from "../services/advisor.service.js";
import { dailyBriefing, explainRecommendation, translateText } from "../services/ai-features.service.js";
import * as copilot from "../services/copilot.service.js";
import { dashboard } from "../services/dashboard.service.js";
import { explainScan } from "../services/explain.service.js";
import { cropOptions } from "../services/fertilizer.service.js";
import { impactCsv, impactPdf, impactSummary } from "../services/impact.service.js";
import * as notifications from "../services/notification.service.js";
import { listRecommendations, setRecommendationStatus } from "../services/recommendation.service.js";
import { createScan, getScan, listScans, scanCrops } from "../services/scan.service.js";
import * as trials from "../services/trial.service.js";
import { geocode, getForecast, summarizeForecast, solarWindow } from "../services/weather.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { currentUser, idParam, languageOf, optionalNumber } from "../utils/request.js";
import { chatSchema, trialSchema, trialUpdateSchema } from "../utils/validation.schemas.js";
import type { Request } from "express";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const router = Router();

async function language(req: Request): Promise<Language> {
  const explicit = languageOf(req);
  if (explicit) return explicit;
  const user = req.user ? await db.orm.public.User.first({ id: req.user.id }) : null;
  return asLanguage(user?.language);
}

// Server-Sent Events: EventSource cannot send headers, so the token comes as a query parameter.
router.get("/stream", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  let userId: number;
  try {
    userId = verifyToken(token).sub;
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
    return;
  }
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`event: ready\ndata: {}\n\n`);
  const remove = addClient(userId, res);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});

router.get("/meta/crops", (req, res) => {
  const lang = languageOf(req) ?? "en";
  const localize = <T extends { key: string; name: string }>(crop: T) => ({ ...crop, name: localCropName(lang, crop.key) ?? crop.name });
  sendSuccess(res, { crops: cropOptions().map(localize), scanCrops: scanCrops().map(localize), soils: soils.map((soil) => ({ ...soil, label: soilLabel(lang, soil) })) });
});

router.get("/push/public-key", (_req, res) => {
  sendSuccess(res, { publicKey: vapidKeys().publicKey });
});

router.use(authMiddleware);

router.get("/dashboard", async (req, res) => {
  sendSuccess(res, await dashboard(currentUser(req), await language(req)));
});

router.get("/recommendations", async (req, res) => {
  const list = await listRecommendations(currentUser(req), await language(req), {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    fieldId: optionalNumber(req.query.fieldId),
    limit: optionalNumber(req.query.limit),
  });
  sendSuccess(res, { recommendations: list });
});

router.patch("/recommendations/:id", async (req, res) => {
  const status = req.body?.status;
  if (!["OPEN", "DONE", "DISMISSED"].includes(status)) throw new AppError("Status must be OPEN, DONE or DISMISSED", 400);
  sendSuccess(res, { recommendation: await setRecommendationStatus(currentUser(req), idParam(req, "id"), status) });
});

router.get("/recommendations/:id/explain", async (req, res) => {
  sendSuccess(res, { explanation: await explainRecommendation(currentUser(req), idParam(req, "id"), await language(req)) });
});

router.get("/impact", async (req, res) => {
  sendSuccess(res, await impactSummary(currentUser(req), { farmId: optionalNumber(req.query.farmId) }));
});

router.get("/impact/report.csv", async (req, res) => {
  const csv = await impactCsv(currentUser(req), optionalNumber(req.query.farmId));
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="agriguard-impact-report.csv"' });
  res.send(csv);
});

router.get("/impact/report.pdf", async (req, res) => {
  const pdf = await impactPdf(currentUser(req), optionalNumber(req.query.farmId));
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="agriguard-impact-report.pdf"' });
  res.send(pdf);
});

router.get("/scans/crops", (_req, res) => {
  sendSuccess(res, { crops: scanCrops() });
});

router.post("/scans", upload.single("image"), async (req, res) => {
  if (!req.file) throw new AppError("Attach a photo", 400);
  const fieldId = optionalNumber(req.body.fieldId);
  if (!fieldId) throw new AppError("Choose a field for this scan", 400);
  const scan = await createScan(
    currentUser(req),
    {
      fieldId,
      cropKey: typeof req.body.cropKey === "string" && req.body.cropKey ? req.body.cropKey : undefined,
      mode: req.body.mode === "pest" ? "pest" : "disease",
      language: await language(req),
    },
    { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype }
  );
  sendSuccess(res, { scan }, "Scan complete", 201);
});

router.get("/scans", async (req, res) => {
  sendSuccess(res, { scans: await listScans(currentUser(req), await language(req), optionalNumber(req.query.fieldId)) });
});

router.get("/scans/:id", async (req, res) => {
  sendSuccess(res, { scan: await getScan(currentUser(req), idParam(req, "id"), await language(req)) });
});

router.get("/scans/:id/explain", async (req, res) => {
  sendSuccess(res, { explanation: await explainScan(currentUser(req), idParam(req, "id"), await language(req)) });
});

router.post("/copilot/chat", validateBody(chatSchema), async (req, res) => {
  const lang = req.body.language ? asLanguage(req.body.language) : await language(req);
  sendSuccess(res, await copilot.chat(currentUser(req), req.body.message, lang));
});

router.get("/copilot/history", async (req, res) => {
  sendSuccess(res, { messages: await copilot.chatHistory(currentUser(req)) });
});

router.delete("/copilot/history", async (req, res) => {
  await copilot.clearHistory(currentUser(req));
  sendSuccess(res, null, "Conversation cleared");
});

router.get("/ai/status", async (_req, res) => {
  sendSuccess(res, await aiStatus());
});

router.post("/ai/translate", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 4000) : "";
  if (!text) throw new AppError("Text is required", 400);
  sendSuccess(res, await translateText(text, asLanguage(req.body.language)));
});

router.get("/ai/briefing", async (req, res) => {
  sendSuccess(res, { briefing: await dailyBriefing(currentUser(req), await language(req)) });
});

router.get("/notifications", async (req, res) => {
  const user = currentUser(req);
  sendSuccess(res, { notifications: await notifications.listNotifications(user.id), unread: await notifications.unreadCount(user.id) });
});

router.post("/notifications/read", async (req, res) => {
  await notifications.markRead(currentUser(req).id, optionalNumber(req.body?.id));
  sendSuccess(res, null, "Marked as read");
});

router.get("/notifications/channels", async (_req, res) => {
  sendSuccess(res, { ...twilioStatus(), push: true });
});

router.post("/notifications/test", async (req, res) => {
  const user = currentUser(req);
  const result = await notifications.notifyUser(user.id, {
    title: "Test alert from AgriGuard",
    body: "If you can read this, alerts reach you on this channel.",
    severity: "warning",
    link: "/settings",
  });
  sendSuccess(res, { notification: result }, "Test alert sent");
});

router.post("/push/subscribe", async (req, res) => {
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new AppError("Invalid push subscription", 400);
  await notifications.saveSubscription(currentUser(req).id, subscription);
  sendSuccess(res, null, "Push alerts enabled");
});

router.post("/push/unsubscribe", async (req, res) => {
  if (typeof req.body?.endpoint === "string") await notifications.removeSubscription(currentUser(req).id, req.body.endpoint);
  sendSuccess(res, null, "Push alerts disabled");
});

router.get("/farms/:farmId/weather", async (req, res) => {
  const { farm } = await farmAccess(currentUser(req), idParam(req, "farmId"));
  if (farm.latitude === null || farm.longitude === null) throw new AppError("Set the farm location first", 400);
  const forecast = await getForecast(farm.latitude, farm.longitude);
  const solar = farm.solarCapacityKw ? solarWindow(forecast, farm.solarCapacityKw, 0.8) : null;
  sendSuccess(res, { summary: summarizeForecast(forecast), daily: forecast.daily, hourly: forecast.hourly.slice(0, 96), solar });
});

router.get("/geocode", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2) throw new AppError("Type at least 2 characters", 400);
  sendSuccess(res, { results: await geocode(query) });
});

router.get("/farms/:farmId/trials", async (req, res) => {
  sendSuccess(res, { trials: await trials.listTrials(currentUser(req), idParam(req, "farmId")) });
});

router.post("/farms/:farmId/trials", validateBody(trialSchema), async (req, res) => {
  sendSuccess(res, { trial: await trials.createTrial(currentUser(req), idParam(req, "farmId"), req.body) }, "Trial started", 201);
});

router.patch("/trials/:id", validateBody(trialUpdateSchema), async (req, res) => {
  sendSuccess(res, { trial: await trials.updateTrial(currentUser(req), idParam(req, "id"), req.body) }, "Trial updated");
});

router.delete("/trials/:id", async (req, res) => {
  await trials.deleteTrial(currentUser(req), idParam(req, "id"));
  sendSuccess(res, null, "Trial deleted");
});

router.post("/farms/:farmId/share", async (req, res) => {
  sendSuccess(res, await advisor.ensureShareCode(currentUser(req), idParam(req, "farmId")));
});

router.post("/farms/:farmId/share/reset", async (req, res) => {
  sendSuccess(res, await advisor.resetShareCode(currentUser(req), idParam(req, "farmId")), "New share code created");
});

router.get("/farms/:farmId/advisors", async (req, res) => {
  sendSuccess(res, { advisors: await advisor.listAdvisors(currentUser(req), idParam(req, "farmId")) });
});

router.delete("/farms/:farmId/advisors/:advisorId", async (req, res) => {
  await advisor.removeAdvisor(currentUser(req), idParam(req, "farmId"), idParam(req, "advisorId"));
  sendSuccess(res, null, "Access removed");
});

router.post("/advisor/join", async (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (code.trim().length < 4) throw new AppError("Enter the farm's share code", 400);
  sendSuccess(res, await advisor.joinFarm(currentUser(req), code), "Farm added to your dashboard");
});

router.get("/advisor/overview", async (req, res) => {
  sendSuccess(res, { farms: await advisor.advisorOverview(currentUser(req)) });
});

router.get("/meta/crop-profiles", (_req, res) => {
  sendSuccess(res, { crops });
});

export default router;
