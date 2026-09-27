import { Router } from "express";
import multer from "multer";
import db from "../config/database.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { fieldAccess } from "../services/access.service.js";
import { addAdvisorNote } from "../services/advisor.service.js";
import { weeklyFieldReport } from "../services/ai-features.service.js";
import * as devices from "../services/device.service.js";
import { analyzeField } from "../services/engine.service.js";
import { explainField, isExplainTopic } from "../services/explain.service.js";
import * as fertilizer from "../services/fertilizer.service.js";
import * as fields from "../services/field.service.js";
import { forecastMoisture } from "../services/forecast.service.js";
import { listNdvi, refreshNdvi } from "../services/ndvi.service.js";
import { fieldOverview, hourlySeries, presentDecision } from "../services/overview.service.js";
import * as pump from "../services/pump.service.js";
import { hoursAgo } from "../lib/time.js";
import { asLanguage } from "../i18n/index.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { currentUser, idParam, languageOf, optionalNumber } from "../utils/request.js";
import {
  cropSchema,
  deviceSchema,
  flowTestSchema,
  harvestSchema,
  noteSchema,
  observationSchema,
  pumpSchema,
  scheduleSchema,
  scheduleUpdateSchema,
  soilTestSchema,
  updateFieldSchema,
} from "../utils/validation.schemas.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();
router.use(authMiddleware);

const fieldId = (req: Parameters<typeof idParam>[0]) => idParam(req, "fieldId");

router.get("/:fieldId/overview", async (req, res) => {
  sendSuccess(res, await fieldOverview(currentUser(req), fieldId(req), languageOf(req)));
});

router.patch("/:fieldId", validateBody(updateFieldSchema), async (req, res) => {
  const field = await fields.updateById(currentUser(req), fieldId(req), req.body);
  analyzeField(field!.id, { trigger: "settings" }).catch(() => undefined);
  sendSuccess(res, { field }, "Field updated");
});

router.post("/:fieldId/flow-test", validateBody(flowTestSchema), async (req, res) => {
  const field = await fields.recordFlowTest(currentUser(req), fieldId(req), req.body);
  analyzeField(field!.id, { trigger: "settings" }).catch(() => undefined);
  sendSuccess(res, { field }, "Pump flow saved");
});

router.post("/:fieldId/analyze", async (req, res) => {
  const user = currentUser(req);
  await fieldAccess(user, fieldId(req), { write: true });
  const result = await analyzeField(fieldId(req), { trigger: "manual" });
  sendSuccess(res, { action: result.decision.action, risks: result.risks }, "Analysis complete");
});

router.get("/:fieldId/observations", async (req, res) => {
  await fieldAccess(currentUser(req), fieldId(req));
  const hours = Math.min(24 * 30, optionalNumber(req.query.hours) ?? 48);
  const readings = await db.orm.public.FieldObservation
    .where({ fieldId: fieldId(req) })
    .where((o) => o.observedAt.gte(hoursAgo(hours).toISOString()))
    .orderBy((o) => o.observedAt.asc())
    .limit(20000)
    .all();
  sendSuccess(res, { hourly: hourlySeries(readings), latest: readings[readings.length - 1] ?? null, count: readings.length });
});

// Raw readings, newest first; page with ?before=<observedAt of the last row>.
router.get("/:fieldId/observations/raw", async (req, res) => {
  await fieldAccess(currentUser(req), fieldId(req));
  const limit = Math.max(1, Math.min(200, optionalNumber(req.query.limit) ?? 50));
  const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : null;
  const sources = ["DEVICE", "SIMULATOR", "MANUAL", "OPEN_METEO"] as const;
  const source = sources.find((value) => value === req.query.source) ?? null;
  let query = db.orm.public.FieldObservation.where({ fieldId: fieldId(req) });
  if (before) query = query.where((o) => o.observedAt.lt(before.toISOString()));
  if (source) query = query.where({ source });
  const rows = await query.orderBy((o) => o.observedAt.desc()).limit(limit + 1).all();
  const devices = await db.orm.public.Device.where({ fieldId: fieldId(req) }).all();
  const names = new Map(devices.map((device) => [device.id, device.name]));
  const readings = rows.slice(0, limit).map((row) => ({ ...row, deviceName: row.deviceId ? names.get(row.deviceId) ?? null : null }));
  sendSuccess(res, { readings, hasMore: rows.length > limit });
});

router.post("/:fieldId/observations", validateBody(observationSchema), async (req, res) => {
  const observation = await fields.addObservation(currentUser(req), fieldId(req), req.body);
  analyzeField(fieldId(req), { trigger: "manual-reading" }).catch(() => undefined);
  sendSuccess(res, { observation }, "Reading saved", 201);
});

router.get("/:fieldId/forecast", async (req, res) => {
  await fieldAccess(currentUser(req), fieldId(req));
  sendSuccess(res, { forecast: await forecastMoisture(fieldId(req)) });
});

router.get("/:fieldId/crops", async (req, res) => {
  sendSuccess(res, { crops: await fields.listCrops(currentUser(req), fieldId(req)) });
});

router.post("/:fieldId/crops", validateBody(cropSchema), async (req, res) => {
  const crop = await fields.plantCrop(currentUser(req), fieldId(req), req.body);
  analyzeField(fieldId(req), { trigger: "crop" }).catch(() => undefined);
  sendSuccess(res, { crop }, "Crop added", 201);
});

router.patch("/:fieldId/crops/:cropId/harvest", validateBody(harvestSchema), async (req, res) => {
  sendSuccess(res, { crop: await fields.harvestCrop(currentUser(req), fieldId(req), idParam(req, "cropId"), req.body) }, "Harvest recorded");
});

router.post("/:fieldId/pump", validateBody(pumpSchema), async (req, res) => {
  sendSuccess(res, { device: await pump.setPumpMode(currentUser(req), fieldId(req), req.body) }, "Pump mode updated");
});

router.get("/:fieldId/events", async (req, res) => {
  sendSuccess(res, { events: await pump.listEvents(currentUser(req), fieldId(req)) });
});

router.get("/:fieldId/decisions", async (req, res) => {
  const user = currentUser(req);
  const language = languageOf(req) ?? asLanguage((await db.orm.public.User.first({ id: user.id }))?.language);
  const decisions = await pump.listDecisions(user, fieldId(req));
  sendSuccess(res, { decisions: decisions.map((decision) => presentDecision(decision, language)) });
});

router.get("/:fieldId/schedules", async (req, res) => {
  sendSuccess(res, { schedules: await pump.listSchedules(currentUser(req), fieldId(req)) });
});

router.post("/:fieldId/schedules", validateBody(scheduleSchema), async (req, res) => {
  sendSuccess(res, { schedule: await pump.createSchedule(currentUser(req), fieldId(req), req.body) }, "Schedule added", 201);
});

router.patch("/:fieldId/schedules/:scheduleId", validateBody(scheduleUpdateSchema), async (req, res) => {
  sendSuccess(res, { schedule: await pump.updateSchedule(currentUser(req), fieldId(req), idParam(req, "scheduleId"), req.body) }, "Schedule updated");
});

router.delete("/:fieldId/schedules/:scheduleId", async (req, res) => {
  await pump.deleteSchedule(currentUser(req), fieldId(req), idParam(req, "scheduleId"));
  sendSuccess(res, null, "Schedule removed");
});

router.get("/:fieldId/devices", async (req, res) => {
  sendSuccess(res, { devices: await devices.listDevices(currentUser(req), fieldId(req)) });
});

router.post("/:fieldId/devices", validateBody(deviceSchema), async (req, res) => {
  sendSuccess(res, { device: await devices.registerDevice(currentUser(req), fieldId(req), req.body) }, "Field node registered", 201);
});

router.get("/:fieldId/fertilizer-plans", async (req, res) => {
  sendSuccess(res, { plans: await fertilizer.listPlans(currentUser(req), fieldId(req)) });
});

router.post("/:fieldId/fertilizer/preview", validateBody(soilTestSchema), async (req, res) => {
  sendSuccess(res, { plan: await fertilizer.previewPlan(currentUser(req), fieldId(req), req.body) });
});

router.post("/:fieldId/fertilizer-plans", validateBody(soilTestSchema), async (req, res) => {
  sendSuccess(res, { plan: await fertilizer.savePlan(currentUser(req), fieldId(req), req.body) }, "Plan saved", 201);
});

router.post("/:fieldId/fertilizer-plans/:planId/applied", async (req, res) => {
  sendSuccess(res, { plan: await fertilizer.markApplied(currentUser(req), fieldId(req), idParam(req, "planId")) }, "Marked as applied");
});

router.post("/:fieldId/soil-card", upload.single("image"), async (req, res) => {
  if (!req.file) throw new AppError("Attach a photo of the Soil Health Card", 400);
  const card = await fertilizer.readSoilCard(currentUser(req), fieldId(req), { buffer: req.file.buffer, mimeType: req.file.mimetype });
  sendSuccess(res, { card }, "Card read");
});

router.get("/:fieldId/ndvi", async (req, res) => {
  sendSuccess(res, { snapshots: await listNdvi(currentUser(req), fieldId(req)) });
});

router.post("/:fieldId/ndvi", async (req, res) => {
  sendSuccess(res, { snapshot: await refreshNdvi(currentUser(req), fieldId(req)) }, "Satellite analysis complete");
});

router.get("/:fieldId/report", async (req, res) => {
  const user = currentUser(req);
  const language = languageOf(req) ?? asLanguage((await db.orm.public.User.first({ id: user.id }))?.language);
  sendSuccess(res, { report: await weeklyFieldReport(user, fieldId(req), language) });
});

router.get("/:fieldId/explain/:topic", async (req, res) => {
  const topic = String(req.params.topic);
  if (!isExplainTopic(topic)) throw new AppError("Unknown explanation topic", 400);
  const user = currentUser(req);
  const language = languageOf(req) ?? asLanguage((await db.orm.public.User.first({ id: user.id }))?.language);
  const options = { planId: optionalNumber(req.query.planId), snapshotId: optionalNumber(req.query.snapshotId) };
  sendSuccess(res, { explanation: await explainField(user, fieldId(req), topic, language, options) });
});

router.post("/:fieldId/notes", validateBody(noteSchema), async (req, res) => {
  sendSuccess(res, { recommendation: await addAdvisorNote(currentUser(req), fieldId(req), req.body) }, "Note sent", 201);
});

export default router;
