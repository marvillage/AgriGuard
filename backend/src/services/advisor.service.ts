import db from "../config/database.js";
import { asLanguage } from "../i18n/index.js";
import { shareCode } from "../lib/ids.js";
import { parseTimestamp } from "../lib/time.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser } from "../utils/auth.types.js";
import { accessibleFarms, farmAccess, fieldAccess } from "./access.service.js";
import { upsertRecommendation, localize } from "./recommendation.service.js";

export async function ensureShareCode(user: AuthUser, farmId: number) {
  const { farm, access } = await farmAccess(user, farmId);
  if (access === "advisor") throw new AppError("Only the farm owner can share the farm", 403);
  if (farm.shareCode) return { shareCode: farm.shareCode };
  const updated = await db.orm.public.Farm.where({ id: farmId }).update({ shareCode: shareCode() });
  return { shareCode: updated!.shareCode };
}

export async function resetShareCode(user: AuthUser, farmId: number) {
  const { access } = await farmAccess(user, farmId);
  if (access === "advisor") throw new AppError("Only the farm owner can share the farm", 403);
  const updated = await db.orm.public.Farm.where({ id: farmId }).update({ shareCode: shareCode() });
  return { shareCode: updated!.shareCode };
}

export async function joinFarm(user: AuthUser, code: string) {
  const farm = await db.orm.public.Farm.where({ shareCode: code.trim().toUpperCase() }).first();
  if (!farm) throw new AppError("No farm uses that share code", 404);
  if (farm.ownerId === user.id) throw new AppError("You already own this farm", 400);
  const existing = await db.orm.public.FarmAdvisor.where({ farmId: farm.id, advisorId: user.id }).first();
  if (!existing) await db.orm.public.FarmAdvisor.create({ farmId: farm.id, advisorId: user.id });
  return { farmId: farm.id, name: farm.name };
}

export async function listAdvisors(user: AuthUser, farmId: number) {
  await farmAccess(user, farmId);
  const links = await db.orm.public.FarmAdvisor.where({ farmId }).all();
  if (links.length === 0) return [];
  const advisors = await db.orm.public.User.where((u) => u.id.in(links.map((l) => l.advisorId))).select("id", "name", "email", "role").all();
  return advisors.map((advisor) => ({ ...advisor, since: links.find((l) => l.advisorId === advisor.id)?.createdAt ?? null }));
}

export async function removeAdvisor(user: AuthUser, farmId: number, advisorId: number) {
  const { access } = await farmAccess(user, farmId);
  if (access === "advisor" && advisorId !== user.id) throw new AppError("Only the farm owner can remove advisors", 403);
  await db.orm.public.FarmAdvisor.where({ farmId, advisorId }).delete();
}

export async function advisorOverview(user: AuthUser) {
  const language = asLanguage((await db.orm.public.User.first({ id: user.id }))?.language);
  const farms = await accessibleFarms(user);
  const rows = [];

  for (const { farm, access } of farms) {
    const owner = await db.orm.public.User.first({ id: farm.ownerId });
    const fields = await db.orm.public.Field.where({ farmId: farm.id }).all();
    const fieldIds = fields.map((f) => f.id);
    const fieldRows = [];
    for (const field of fields) {
      const assessment = await db.orm.public.AIAssessment
        .where({ fieldId: field.id, kind: "RISK" })
        .orderBy((a) => a.createdAt.desc())
        .first();
      const latest = await db.orm.public.FieldObservation.where({ fieldId: field.id }).orderBy((o) => o.observedAt.desc()).first();
      const seen = parseTimestamp(latest?.observedAt ?? null);
      fieldRows.push({
        id: field.id,
        name: field.name,
        areaAcres: field.area,
        cropHealth: assessment?.cropHealthScore ?? null,
        waterStress: assessment?.waterStress ?? null,
        diseaseRisk: assessment?.diseaseRisk ?? null,
        weatherRisk: assessment?.weatherRisk ?? null,
        moisture: latest?.soilMoisture ?? null,
        minutesSinceReading: seen ? Math.round((Date.now() - seen.getTime()) / 60000) : null,
      });
    }
    const openRecs = fieldIds.length
      ? await db.orm.public.Recommendation
          .where((r) => r.fieldId.in(fieldIds))
          .where({ status: "OPEN" })
          .orderBy((r) => r.createdAt.desc())
          .limit(50)
          .all()
      : [];
    const saved = fieldIds.length
      ? await db.orm.public.SustainabilityRecord
          .where((r) => r.fieldId.in(fieldIds))
          .aggregate((a) => ({ water: a.sum("waterSaved"), rupees: a.sum("rupeesSaved") }))
      : { water: 0, rupees: 0 };

    const worst = Math.max(0, ...fieldRows.map((f) => Math.max(f.waterStress ?? 0, f.diseaseRisk ?? 0, f.weatherRisk ?? 0)));
    rows.push({
      farm: { id: farm.id, name: farm.name, location: farm.location, latitude: farm.latitude, longitude: farm.longitude },
      access,
      owner: owner ? { id: owner.id, name: owner.name, phone: owner.phone } : null,
      fields: fieldRows,
      openAlerts: openRecs.length,
      criticalAlerts: openRecs.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH").length,
      topAlerts: openRecs.slice(0, 3).map((r) => localize(r, language)),
      waterSavedL: Math.round(saved.water ?? 0),
      rupeesSaved: Math.round(saved.rupees ?? 0),
      worstRisk: worst,
    });
  }

  return rows.sort((a, b) => b.criticalAlerts - a.criticalAlerts || b.worstRisk - a.worstRisk);
}

export async function addAdvisorNote(
  user: AuthUser,
  fieldId: number,
  input: { title: string; message: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; type?: "IRRIGATION" | "FERTILIZER" | "DISEASE" | "WEATHER" | "GENERAL" }
) {
  const { field, farm } = await fieldAccess(user, fieldId);
  const { recommendation } = await upsertRecommendation({
    fieldId: field.id,
    farmId: farm.id,
    code: "ADVISOR_NOTE",
    type: input.type ?? "GENERAL",
    priority: input.priority,
    params: { title: input.title, message: input.message },
    authorId: user.id,
    dedupeScope: `note:${Date.now()}`,
    supportingFactors: `From ${user.name} (${user.role.toLowerCase()})`,
    notify: true,
  });
  return recommendation;
}
