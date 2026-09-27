import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import db from "../config/database.js";
import { diseaseKnowledge, diseaseText, getDiseaseInfo, type DiseaseInfo } from "../data/disease-knowledge.js";
import { generateJson } from "../lib/ai/index.js";
import { publish } from "../lib/events.js";
import { analyzeLeafPixels } from "../lib/leaf-analysis.js";
import { classifyLeaf, plantModelId } from "../lib/plant-model.js";
import { asLanguage, languageNames, type Language } from "../i18n/index.js";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { accessibleFieldIds, farmMemberIds, fieldAccess } from "./access.service.js";
import { upsertRecommendation } from "./recommendation.service.js";
import { fromRoot } from "../config/paths.js";

export const uploadsRoot = fromRoot("uploads");
const scanDir = resolve(uploadsRoot, "scans");
mkdirSync(scanDir, { recursive: true });

const scanQuery = () =>
  db.orm.public.AIAssessment
    .include("images")
    .include("diseasePredictions", (p) => p.orderBy((d) => d.rank.asc()));
type ScanRow = ResultType<ReturnType<typeof scanQuery>>;

export interface ScanUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

interface AiOpinion {
  status: "pending" | "done" | "unavailable" | "failed";
  provider?: string;
  model?: string;
  isPlant?: boolean;
  crop?: string;
  diagnosis?: string;
  confidence?: number;
  agreesWithModel?: boolean;
  damagePct?: number;
  explanation?: string;
  actions?: string[];
  pest?: string | null;
}

export async function createScan(
  user: AuthUser,
  input: { fieldId: number; cropKey?: string; mode?: "disease" | "pest"; language?: string },
  upload: ScanUpload
) {
  const { field, farm } = await fieldAccess(user, input.fieldId);
  if (!upload.mimeType.startsWith("image/")) throw new AppError("Please upload an image file", 400);
  const language = asLanguage(input.language ?? (await userLanguage(user.id)));
  const mode = input.mode ?? "disease";

  const normalized = await sharp(upload.buffer).rotate().resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const storageKey = `scans/${randomUUID()}.jpg`;
  writeFileSync(resolve(uploadsRoot, storageKey), normalized);

  const pixels = await analyzeLeafPixels(normalized);
  let ranked: Array<{ label: string; score: number }> = [];
  let cropFiltered = false;
  if (mode === "disease") {
    const all = await classifyLeaf(normalized);
    const crop = input.cropKey?.toLowerCase();
    const cropLabels = crop ? all.filter((item) => getDiseaseInfo(item.label)?.cropKey === crop) : [];
    if (cropLabels.length) {
      const total = cropLabels.reduce((sum, item) => sum + item.score, 0) || 1;
      ranked = cropLabels.map((item) => ({ label: item.label, score: item.score / total }));
      cropFiltered = true;
    } else {
      ranked = all;
    }
  }
  const top = ranked[0];
  const topInfo = top ? getDiseaseInfo(top.label) : undefined;
  const lowConfidence = mode === "disease" && (!top || top.score < 0.6);
  const diseased = Boolean(topInfo && !topInfo.healthy && top.score >= 0.5);

  const assessment = await db.orm.public.AIAssessment.create({
    fieldId: field.id,
    kind: "SCAN",
    status: "COMPLETED",
    diseaseRisk: diseased ? Math.round(top.score * 100) : topInfo?.healthy ? 5 : null,
    cropHealthScore: pixels.affectedPct !== null ? Math.max(0, Math.round(100 - pixels.affectedPct * 1.5)) : null,
    summary: JSON.stringify({
      mode,
      cropKey: input.cropKey ?? null,
      cropFiltered,
      lowConfidence,
      pixels,
      model: mode === "disease" ? plantModelId : null,
      ai: { status: "pending" } satisfies AiOpinion,
    }),
    completedAt: new Date().toISOString(),
  });

  await db.orm.public.CropImage.create({
    assessmentId: assessment.id,
    storageKey,
    originalName: upload.originalName.slice(0, 200),
    contentType: "image/jpeg",
    url: `/uploads/${storageKey}`,
  });

  for (const [index, item] of ranked.slice(0, 3).entries()) {
    const info = getDiseaseInfo(item.label);
    await db.orm.public.DiseasePrediction.create({
      assessmentId: assessment.id,
      label: item.label,
      diseaseName: info?.text.en.name ?? item.label,
      confidence: item.score,
      severity: index === 0 ? pixels.affectedPct : null,
      symptoms: info ? JSON.stringify(info.text.en.symptoms) : null,
      treatment: info ? JSON.stringify(info.text.en.actions) : null,
      source: "plantvillage-mobilenetv2",
      rank: index + 1,
    });
  }

  if (diseased && topInfo) {
    const text = diseaseText(topInfo, "en");
    await upsertRecommendation({
      fieldId: field.id,
      farmId: farm.id,
      code: "DISEASE_DETECTED",
      type: "DISEASE",
      priority: topInfo.spreadRisk === "high" ? "CRITICAL" : "HIGH",
      params: {
        field: field.name,
        disease: text.name,
        confidence: Math.round(top.score * 100),
        action: text.actions[0] ?? "",
      },
      assessmentId: assessment.id,
      dedupeScope: `${top.label}:${new Date().toISOString().slice(0, 10)}`,
      supportingFactors: `Leaf scan · ${Math.round(top.score * 100)}% model confidence · ~${pixels.affectedPct ?? "?"}% leaf area affected`,
    });
  }

  runSecondOpinion(assessment.id, normalized, { mode, language, cropKey: input.cropKey, top: top ?? null, farmId: farm.id }).catch((error) =>
    console.error("second opinion failed", error)
  );

  return getScan(user, assessment.id, language);
}

async function runSecondOpinion(
  assessmentId: number,
  image: Buffer,
  options: { mode: string; language: Language; cropKey?: string; top: { label: string; score: number } | null; farmId: number }
) {
  const small = await sharp(image).resize(768, 768, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  const modelHint = options.top
    ? `An on-device PlantVillage classifier predicted "${options.top.label}" with ${Math.round(options.top.score * 100)}% confidence.`
    : "No on-device classification is available for this image.";
  const task =
    options.mode === "pest"
      ? "Identify any insect pest or pest damage visible in this photo from an Indian farm."
      : "Diagnose the plant health problem visible on this leaf or plant photo from an Indian farm.";

  const result = await generateJson<AiOpinion>({
    system:
      "You are an expert plant pathologist and entomologist advising Indian smallholder farmers. Be accurate and conservative. Never invent pesticide doses; name active ingredients only and tell farmers to follow the label and consult their local KVK.",
    messages: [
      {
        role: "user",
        content: `${task} ${modelHint} Crop selected by the farmer: ${options.cropKey ?? "unknown"}.
Reply with JSON only, using this shape:
{"isPlant": boolean, "crop": string, "diagnosis": string, "pest": string | null, "confidence": number (0-1), "agreesWithModel": boolean, "damagePct": number (0-100, share of the visible leaf area that looks diseased or damaged), "explanation": string (2 short sentences), "actions": string[] (3 practical steps)}
Write "diagnosis", "explanation" and "actions" in ${languageNames[options.language]}.`,
        images: [{ mimeType: "image/jpeg", base64: small.toString("base64") }],
      },
    ],
    temperature: 0.2,
    maxTokens: 600,
  });

  const damage = result?.data.damagePct;
  const opinion: AiOpinion = result
    ? {
        ...result.data,
        damagePct: typeof damage === "number" && Number.isFinite(damage) ? Math.round(Math.max(0, Math.min(100, damage))) : undefined,
        status: "done",
        provider: result.provider,
        model: result.model,
      }
    : { status: "unavailable" };

  const assessment = await db.orm.public.AIAssessment.first({ id: assessmentId });
  if (!assessment) return;
  const summary = JSON.parse(assessment.summary ?? "{}");
  await db.orm.public.AIAssessment.where({ id: assessmentId }).update({ summary: JSON.stringify({ ...summary, ai: opinion }) });

  if (result && options.mode === "pest" && result.data.pest) {
    await db.orm.public.DiseasePrediction.create({
      assessmentId,
      label: `pest:${result.data.pest}`,
      diseaseName: result.data.pest,
      confidence: result.data.confidence ?? 0.5,
      treatment: JSON.stringify(result.data.actions ?? []),
      source: result.provider,
      rank: 1,
    });
  }

  publish(await farmMemberIds(options.farmId), "scan", { id: assessmentId, ai: opinion.status });
}

export async function getScan(user: AuthUser, id: number, language?: Language) {
  const assessment = await scanQuery().where({ id, kind: "SCAN" }).first();
  if (!assessment) throw new AppError("Scan not found", 404);
  await fieldAccess(user, assessment.fieldId);
  const lang = language ?? asLanguage(await userLanguage(user.id));
  return present(assessment, lang);
}

export async function listScans(user: AuthUser, language: Language, fieldId?: number) {
  const fieldIds = fieldId ? [fieldId] : await accessibleFieldIds(user);
  if (fieldId) await fieldAccess(user, fieldId);
  if (fieldIds.length === 0) return [];
  const rows = await scanQuery()
    .where({ kind: "SCAN" })
    .where((a) => a.fieldId.in(fieldIds))
    .orderBy((a) => a.createdAt.desc())
    .limit(30)
    .all();
  return rows.map((row) => present(row, language));
}

function present(assessment: ScanRow, language: Language) {
  const summary = JSON.parse(assessment.summary ?? "{}");
  const predictions = assessment.diseasePredictions.map((prediction) => {
    const info = prediction.label ? getDiseaseInfo(prediction.label) : undefined;
    return {
      label: prediction.label,
      confidence: prediction.confidence,
      source: prediction.source,
      ...(info ? describe(info, language) : { name: prediction.diseaseName, crop: null, healthy: false, pathogen: null, kind: null, spreadRisk: null, symptoms: [], actions: safeList(prediction.treatment), prevention: [] }),
    };
  });
  return {
    id: assessment.id,
    fieldId: assessment.fieldId,
    createdAt: assessment.createdAt,
    imageUrl: assessment.images[0]?.url ?? null,
    mode: summary.mode ?? "disease",
    lowConfidence: Boolean(summary.lowConfidence),
    cropFiltered: Boolean(summary.cropFiltered),
    affectedPct: summary.pixels?.affectedPct ?? null,
    yellowingPct: summary.pixels?.yellowingPct ?? null,
    model: summary.model,
    top: predictions[0] ?? null,
    alternatives: predictions.slice(1),
    ai: (summary.ai ?? { status: "unavailable" }) as AiOpinion,
  };
}

function describe(info: DiseaseInfo, language: Language) {
  const text = diseaseText(info, language);
  return {
    name: text.name,
    crop: info.crop,
    healthy: info.healthy,
    pathogen: info.pathogen,
    kind: info.kind,
    spreadRisk: info.spreadRisk,
    symptoms: text.symptoms,
    actions: text.actions,
    prevention: text.prevention,
  };
}

function safeList(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function scanCrops() {
  const crops = new Map<string, string>();
  for (const info of Object.values(diseaseKnowledge)) crops.set(info.cropKey, info.crop);
  return [...crops.entries()].map(([key, name]) => ({ key, name }));
}

async function userLanguage(userId: number) {
  const user = await db.orm.public.User.first({ id: userId });
  return user?.language ?? "en";
}
