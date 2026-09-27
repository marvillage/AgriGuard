import db from "../config/database.js";
import { asLanguage, t, type Language, type Params } from "../i18n/index.js";
import { dayKey } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import type { RecommendationRow } from "../types/models.js";
import { accessibleFieldIds, farmMemberIds, fieldAccess } from "./access.service.js";
import { notifyUsers } from "./notification.service.js";

type RecType = "IRRIGATION" | "FERTILIZER" | "DISEASE" | "WEATHER" | "GENERAL";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RecommendationInput {
  fieldId: number;
  farmId: number;
  code: string;
  type: RecType;
  priority: Priority;
  params: Params;
  supportingFactors?: string;
  expectedImpact?: string;
  assessmentId?: number | null;
  authorId?: number | null;
  dedupeScope?: string;
  notify?: boolean;
}

// Creates a recommendation once per field, code and day (or custom scope).
export async function upsertRecommendation(input: RecommendationInput) {
  const scope = input.dedupeScope ?? dayKey(new Date());
  const dedupeKey = `${input.fieldId}:${input.code}:${scope}`;
  const existing = await db.orm.public.Recommendation.where({ dedupeKey }).first();
  if (existing) return { recommendation: existing, created: false };

  const recommendation = await db.orm.public.Recommendation.create({
    fieldId: input.fieldId,
    assessmentId: input.assessmentId ?? null,
    authorId: input.authorId ?? null,
    type: input.type,
    priority: input.priority,
    code: input.code,
    params: JSON.stringify(input.params),
    title: t("en", `rec.${input.code}.title`, input.params),
    message: t("en", `rec.${input.code}.message`, input.params),
    supportingFactors: input.supportingFactors ?? null,
    expectedImpact: input.expectedImpact ?? null,
    dedupeKey,
  });

  const shouldNotify = input.notify ?? (input.priority === "HIGH" || input.priority === "CRITICAL");
  if (shouldNotify) {
    const memberIds = (await farmMemberIds(input.farmId)).filter((id) => id !== input.authorId);
    for (const userId of memberIds) {
      const user = await db.orm.public.User.first({ id: userId });
      const language = asLanguage(user?.language);
      await notifyUsers([userId], {
        title: t(language, `rec.${input.code}.title`, input.params),
        body: t(language, `rec.${input.code}.message`, input.params),
        severity: input.priority === "CRITICAL" ? "critical" : "warning",
        link: `/fields/${input.fieldId}`,
        fieldId: input.fieldId,
      });
    }
  }

  return { recommendation, created: true };
}

export function localize(rec: RecommendationRow, language: Language) {
  const params = rec.params ? (JSON.parse(rec.params) as Params) : {};
  const hasTemplate = rec.code && rec.code !== "ADVISOR_NOTE";
  return {
    ...rec,
    params,
    title: hasTemplate ? t(language, `rec.${rec.code}.title`, params) : rec.title,
    message: hasTemplate ? t(language, `rec.${rec.code}.message`, params) : rec.message,
  };
}

export async function listRecommendations(
  user: AuthUser,
  language: Language,
  filters: { status?: string; type?: string; fieldId?: number; limit?: number } = {}
) {
  const fieldIds = filters.fieldId ? [filters.fieldId] : await accessibleFieldIds(user);
  if (filters.fieldId) await fieldAccess(user, filters.fieldId);
  if (fieldIds.length === 0) return [];

  let query = db.orm.public.Recommendation.where((r) => r.fieldId.in(fieldIds));
  if (filters.status) query = query.where({ status: filters.status as "OPEN" | "DONE" | "DISMISSED" });
  if (filters.type) query = query.where({ type: filters.type as RecType });

  const rows = await query.orderBy((r) => r.createdAt.desc()).limit(filters.limit ?? 100).all();
  const fields = await db.orm.public.Field.where((f) => f.id.in(fieldIds)).select("id", "name", "farmId").all();
  const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  return rows
    .map((rec) => ({
      ...localize(rec, language),
      fieldName: fields.find((field) => field.id === rec.fieldId)?.name ?? "",
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      return order[a.priority] - order[b.priority];
    });
}

export async function setRecommendationStatus(user: AuthUser, id: number, status: "OPEN" | "DONE" | "DISMISSED") {
  const rec = await db.orm.public.Recommendation.first({ id });
  if (!rec || !rec.fieldId) throw new AppError("Recommendation not found", 404);
  await fieldAccess(user, rec.fieldId);
  return db.orm.public.Recommendation.where({ id }).update({
    status,
    resolvedAt: status === "OPEN" ? null : new Date().toISOString(),
  });
}
