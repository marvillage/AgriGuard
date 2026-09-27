import { existsSync, readFileSync, statSync } from "node:fs";
import { fromRoot } from "../config/paths.js";

// Results written by scripts/validate-disease-model.ts, scripts/replay-season.ts and scripts/test-report.ts.
const cache = new Map<string, { mtimeMs: number; data: unknown }>();

function readResult(name: string) {
  const file = fromRoot("data", "validation", name);
  if (!existsSync(file)) return null;
  const { mtimeMs } = statSync(file);
  const hit = cache.get(name);
  if (hit && hit.mtimeMs === mtimeMs) return hit.data as Record<string, any>;
  const data = JSON.parse(readFileSync(file, "utf8"));
  cache.set(name, { mtimeMs, data });
  return data as Record<string, any>;
}

// Drops long per-day and per-image arrays so the page gets summaries, not raw series.
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.length > 60 ? undefined : value.map(compact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, compact(item)] as const)
        .filter(([, item]) => item !== undefined)
    );
  }
  return value;
}

function diseaseSummary(result: Record<string, any>) {
  const { dataset, model, metrics, perCrop, gemini, notes } = result;
  return {
    generatedAt: result.generatedAt,
    dataset: {
      name: dataset.name,
      citation: dataset.citation,
      url: dataset.url,
      license: dataset.license,
      split: dataset.split,
      imagesEvaluated: dataset.imagesEvaluated,
      classesEvaluated: dataset.classesEvaluated,
      labelConflicts: dataset.labelConflictsByFileName?.length ?? 0,
    },
    model: { id: model.id, dtype: model.dtype },
    metrics: {
      noCrop: { top1: metrics.noCrop.top1, top3: metrics.noCrop.top3 },
      cropFiltered: { top1: metrics.cropFiltered.top1, top3: metrics.cropFiltered.top3 },
      multiLabelCrops: metrics.cropFiltered.multiLabelCrops
        ? { images: metrics.cropFiltered.multiLabelCrops.images, top1: metrics.cropFiltered.multiLabelCrops.top1, top3: metrics.cropFiltered.multiLabelCrops.top3 }
        : null,
      lowConfidence: {
        confident: metrics.cropFiltered.lowConfidenceSplit.confident,
        flagged: metrics.cropFiltered.lowConfidenceSplit.lowConfidence,
        shareFlaggedLow: metrics.cropFiltered.lowConfidenceSplit.shareFlaggedLow,
      },
    },
    perCrop: (perCrop as Array<Record<string, any>>).map((crop) => ({
      crop: crop.crop,
      cropKey: crop.cropKey,
      n: crop.n,
      labels: Array.isArray(crop.candidateLabels) ? crop.candidateLabels.length : crop.candidateLabels,
      noCropTop1: crop.noCropTop1,
      cropFilteredTop1: crop.cropFilteredTop1,
      cropFilteredTop3: crop.cropFilteredTop3,
    })),
    gemini: { model: gemini.model, imagesEvaluated: gemini.imagesEvaluated, stoppedEarly: gemini.stoppedEarly ?? null },
    notes,
  };
}

export function validationSummary() {
  const disease = readResult("disease-model.json");
  const replay = readResult("season-replay.json");
  return {
    tests: readResult("tests.json"),
    diseaseModel: disease ? diseaseSummary(disease) : null,
    seasonReplay: replay ? compact(replay) : null,
  };
}
