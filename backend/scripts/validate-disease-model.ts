// Measures the leaf-disease pipeline on real-world photos: the official PlantDoc test split (Singh et al., CoDS-COMAD 2020).
// Runs the app's own classifyLeaf/getDiseaseInfo locally; it never calls the API server and never touches the database.
// Usage (from backend/): npx tsx scripts/validate-disease-model.ts [--skip-gemini] [--fresh] [--gemini-limit=N] [--out=path]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import sharp, { type Metadata } from "sharp";
import { fromRoot } from "../src/config/paths.js";
import { diseaseKnowledge, getDiseaseInfo } from "../src/data/disease-knowledge.js";

dotenv.config({ path: fromRoot(".env"), quiet: true });

// Imported after .env is loaded so PLANT_MODEL_DTYPE applies the same way it does for the server.
const { classifyLeaf, loadPlantModel, plantModelId } = await import("../src/lib/plant-model.js");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [name, ...value] = arg.replace(/^--/, "").split("=");
    return [name, value.join("=")] as const;
  })
);
const skipGemini = args.has("skip-gemini");
const freshGemini = args.has("fresh");
const geminiLimit = args.get("gemini-limit") ? Number(args.get("gemini-limit")) : Number.POSITIVE_INFINITY;
const outPath = resolve(args.get("out") || fromRoot("data", "validation", "disease-model.json"));

const repo = "pratikkayal/PlantDoc-Dataset";
const commit = "5467f6012d78d1c446145d5f582da6096f852ae8";
const cacheRoot = fromRoot(".cache", "plantdoc");
const geminiModel = "gemini-3.8-flash";
const geminiBase = "https://generativelanguage.googleapis.com/v1beta";
const lowConfidenceBelow = 0.6;
const requestGapMs = 15100;
const backoffSeconds = [30, 60, 120, 240];
const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
const dtype = (process.env.PLANT_MODEL_DTYPE as "fp32" | "q8" | undefined) ?? "fp32";

const geminiSystem =
  "You are an expert plant pathologist and entomologist advising Indian smallholder farmers. Be accurate and conservative.";

const healthyNote = 'PlantDoc\'s plain "<crop> leaf" folders are its healthy classes (paper Fig. 2 lists them as "<Crop> Healthy")';

const classMap: Record<string, { label: string; note?: string }> = {
  "Apple Scab Leaf": { label: "Apple Scab" },
  "Apple leaf": { label: "Healthy Apple", note: healthyNote },
  "Apple rust leaf": { label: "Cedar Apple Rust", note: 'PlantDoc only says "rust"; Cedar Apple Rust is PlantVillage\'s only apple rust class' },
  "Bell_pepper leaf": { label: "Healthy Bell Pepper Plant", note: healthyNote },
  "Bell_pepper leaf spot": {
    label: "Bell Pepper with Bacterial Spot",
    note: 'PlantDoc only says "leaf spot"; Bacterial Spot is PlantVillage\'s only bell pepper disease class',
  },
  "Blueberry leaf": { label: "Healthy Blueberry Plant", note: healthyNote },
  "Cherry leaf": { label: "Healthy Cherry Plant", note: healthyNote },
  "Corn Gray leaf spot": { label: "Corn (Maize) with Cercospora and Gray Leaf Spot" },
  "Corn leaf blight": {
    label: "Corn (Maize) with Northern Leaf Blight",
    note: 'PlantDoc only says "leaf blight"; Northern Leaf Blight is PlantVillage\'s only corn blight class',
  },
  "Corn rust leaf": { label: "Corn (Maize) with Common Rust", note: 'PlantDoc only says "rust"; Common Rust is PlantVillage\'s only corn rust class' },
  "Peach leaf": { label: "Healthy Peach Plant", note: healthyNote },
  "Potato leaf early blight": { label: "Potato with Early Blight" },
  "Potato leaf late blight": { label: "Potato with Late Blight" },
  "Raspberry leaf": { label: "Healthy Raspberry Plant", note: healthyNote },
  "Soyabean leaf": { label: "Healthy Soybean Plant", note: healthyNote },
  "Squash Powdery mildew leaf": { label: "Squash with Powdery Mildew" },
  "Strawberry leaf": { label: "Healthy Strawberry Plant", note: healthyNote },
  "Tomato Early blight leaf": { label: "Tomato with Early Blight" },
  "Tomato Septoria leaf spot": { label: "Tomato with Septoria Leaf Spot" },
  "Tomato leaf": { label: "Healthy Tomato Plant", note: healthyNote },
  "Tomato leaf bacterial spot": { label: "Tomato with Bacterial Spot" },
  "Tomato leaf late blight": { label: "Tomato with Late Blight" },
  "Tomato leaf mosaic virus": { label: "Tomato Mosaic Virus" },
  "Tomato leaf yellow virus": {
    label: "Tomato Yellow Leaf Curl Virus",
    note: 'PlantDoc only says "yellow virus"; Tomato Yellow Leaf Curl Virus is PlantVillage\'s only yellowing virus class for tomato',
  },
  "Tomato mold leaf": { label: "Tomato with Leaf Mold" },
  "Tomato two spotted spider mites leaf": { label: "Tomato with Spider Mites or Two-spotted Spider Mite" },
  "grape leaf": { label: "Healthy Grape Plant", note: healthyNote },
  "grape leaf black rot": { label: "Grape with Black Rot" },
};

// Test files whose own source file names contradict their PlantDoc label (found by reading names and spot-checking images; not exhaustive).
const nameConflicts: Record<string, string> = {
  "test/Squash Powdery mildew leaf/powdery-mildew-erysiphe-plantani-on-young-sycamore-leaves-b774tm.jpg":
    "name says powdery mildew on young sycamore leaves, not squash",
  "test/Soyabean leaf/leaf-raspberry-isolated-on-a-white-stock-photography-image-10106222-1625198.jpg": "name says a raspberry leaf, not soybean",
  "test/Potato leaf early blight/early-blight-or-target-spot-alternaria-solani-lesions-on-a-tomato-AXK6AY.jpg": "name says lesions on a tomato, not potato",
  "test/Potato leaf early blight/potato-blight-phytophthora-infestans-close-up-of-upper-surface-of-BMMRXC.jpg":
    "name says Phytophthora infestans, the late blight pathogen",
  "test/Corn leaf blight/2013Corn_GrayLeafSpot_0815_0003.JPG.jpg": "name says gray leaf spot, which is a separate PlantDoc class",
  "test/Corn leaf blight/corn-disease-update-fig-3-gray-leaf-spot.jpg": "name says gray leaf spot, which is a separate PlantDoc class",
  "test/Corn leaf blight/corn-gray-leaf-spot-f4.jpg": "name says gray leaf spot, which is a separate PlantDoc class",
  "test/Corn leaf blight/Corn-SCLB-2017-1.jpg": "name says SCLB (southern corn leaf blight), not northern leaf blight",
  "test/Bell_pepper leaf spot/CMVpepperLeafShock-copy-50QUALITY-1ge8umw.jpg": "name says CMV (cucumber mosaic virus), not a leaf spot",
  "test/Tomato leaf bacterial spot/07.17.18-Common_Tomato_Diseases_Canker-258x300.jpg": "name says bacterial canker, not bacterial spot",
  "test/Tomato leaf bacterial spot/tomato_bacterial-speck_01_zoom.jpg": "name says bacterial speck, not bacterial spot",
  "test/Blueberry leaf/blueberry-leaves-normal-above-and-iron-deficient-below-bgahf8.jpg": "name says the lower leaves are iron deficient; class is healthy",
  "test/Blueberry leaf/blueberrysilverleaf16-1372b.jpg": "name says silver leaf (a disease); class is healthy",
  "test/Raspberry leaf/iron-deficiency-raspberry-leaf-chlorosis-isolated-32457798.jpg": "name says iron-deficiency chlorosis; class is healthy",
  "test/Bell_pepper leaf/why-are-my-pepper-plants-yellow-yellow-pepper-plants-yellow-leaves-green-veins-pepper-plants-yellow-veins.jpg":
    "name says yellowing pepper leaves; class is healthy",
};

const stockMarkers = /isolated|stock|depositphotos|shutterstock|dreamstime|alamy|wallpaper|white-background|on-white|istock|getty|123rf/i;

interface TreeEntry {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

interface Scored {
  label: string;
  score: number;
}

interface Ranking {
  top3: Scored[];
  topScore: number;
  lowConfidence: boolean;
  correct: boolean;
  top3Correct: boolean;
}

interface GeminiAnswer {
  status: "answered" | "invalid" | "no-answer" | "not-attempted";
  label?: string;
  confidence?: number | null;
  correct?: boolean;
  reply?: string;
  error?: string;
  attempts: number;
  httpStatuses: number[];
  modelVersion?: string;
  finishReason?: string;
  thoughtsTokens?: number;
  answeredAt?: string;
  cached?: boolean;
}

interface ImageResult {
  file: string;
  gitBlobSha: string;
  plantDocClass: string;
  trueLabel: string;
  cropKey: string;
  candidates: number;
  format: string;
  width: number;
  height: number;
  noCrop: Ranking & { cropCorrect: boolean };
  cropFiltered: Ranking;
  gemini: GeminiAnswer | null;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { thoughtsTokenCount?: number };
  modelVersion?: string;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const redact = (text: string) => (apiKey ? text.split(apiKey).join("[redacted]") : text);
const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const gitBlobSha = (data: Buffer) => createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
const safeName = (name: string) => name.replace(/[<>:"\\|?*\u0000-\u001f]/g, "_");
const pct = (count: number, total: number) => (total ? Math.round((count / total) * 1000) / 10 : null);
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function rate<T>(items: T[], hit: (item: T) => boolean) {
  const correct = items.filter(hit).length;
  return { correct, n: items.length, pct: pct(correct, items.length) };
}

function wilson(correct: number, n: number) {
  if (!n) return null;
  const z = 1.959964;
  const p = correct / n;
  const scale = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / scale;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / scale;
  return [Math.round((centre - half) * 1000) / 10, Math.round((centre + half) * 1000) / 10];
}

function headline<T>(items: T[], hit: (item: T) => boolean) {
  const result = rate(items, hit);
  return { ...result, ci95: wilson(result.correct, result.n) };
}

async function download(url: string, headers: Record<string, string> = {}) {
  let failure: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      failure = error;
      await sleep(attempt * 3000);
    }
  }
  throw failure;
}

async function repoTree(): Promise<TreeEntry[]> {
  const file = resolve(cacheRoot, `tree-${commit}.json`);
  if (!existsSync(file)) {
    const listing = await download(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`, {
      Accept: "application/vnd.github+json",
    });
    if (JSON.parse(listing.toString("utf8")).truncated) throw new Error("GitHub returned a truncated tree listing");
    writeFileSync(file, listing);
  }
  return JSON.parse(readFileSync(file, "utf8")).tree;
}

async function repoFile(entry: TreeEntry, localPath: string) {
  if (existsSync(localPath)) {
    const cached = readFileSync(localPath);
    if (gitBlobSha(cached) === entry.sha) return cached;
  }
  const url = `https://raw.githubusercontent.com/${repo}/${commit}/${entry.path.split("/").map(encodeURIComponent).join("/")}`;
  const data = await download(url);
  if (gitBlobSha(data) !== entry.sha) throw new Error(`${entry.path} does not match git blob ${entry.sha}`);
  mkdirSync(dirname(localPath), { recursive: true });
  writeFileSync(localPath, data);
  return data;
}

async function inPool<T, R>(items: T[], size: number, task: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

function packageVersion(name: string) {
  const file = fromRoot("node_modules", name, "package.json");
  return existsSync(file) ? ((JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version ?? null) : null;
}

// The same two steps createScan runs inline (they are not exported): sharp normalisation, then the crop filter.
function normalizeUpload(buffer: Buffer) {
  return sharp(buffer).rotate().resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

function cropFilter(all: Scored[], crop: string) {
  const cropLabels = all.filter((item) => getDiseaseInfo(item.label)?.cropKey === crop);
  if (!cropLabels.length) return all;
  const total = cropLabels.reduce((sum, item) => sum + item.score, 0) || 1;
  return cropLabels.map((item) => ({ label: item.label, score: item.score / total }));
}

function rank(ranked: Scored[], trueLabel: string): Ranking {
  const top = ranked[0];
  return {
    top3: ranked.slice(0, 3),
    topScore: top?.score ?? 0,
    lowConfidence: !top || top.score < lowConfidenceBelow,
    correct: top?.label === trueLabel,
    top3Correct: ranked.slice(0, 3).some((item) => item.label === trueLabel),
  };
}

function geminiPrompt(cropName: string, candidates: string[]) {
  return [
    `Diagnose the plant health problem visible in this leaf or plant photo. Crop selected by the farmer: ${cropName}.`,
    "Choose exactly ONE label from this list of candidate labels:",
    ...candidates.map((label) => `- ${label}`),
    "Reply with JSON only, using this shape:",
    '{"label": string (copied exactly from the list above), "confidence": number (0-1)}',
  ].join("\n");
}

// Same request body as geminiGenerate in src/lib/ai/providers.ts with thinking off and JSON output.
function geminiBody(image: Buffer, prompt: string) {
  return {
    systemInstruction: { parts: [{ text: geminiSystem }] },
    contents: [
      {
        role: "user",
        parts: [{ inline_data: { mime_type: "image/jpeg", data: image.toString("base64") } }, { text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  };
}

function parseReply(text: string) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parse = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  return parse(cleaned) ?? parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? "");
}

function readAnswer(text: string, candidates: string[], attempts: number, httpStatuses: number[]): GeminiAnswer {
  const base = { attempts, httpStatuses, answeredAt: new Date().toISOString() };
  let body: GeminiResponse;
  try {
    body = JSON.parse(text) as GeminiResponse;
  } catch {
    return { ...base, status: "invalid", reply: redact(text.slice(0, 300)), error: "response body is not JSON" };
  }
  const candidate = body.candidates?.[0];
  const reply = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const meta = {
    ...base,
    modelVersion: body.modelVersion,
    finishReason: candidate?.finishReason,
    thoughtsTokens: body.usageMetadata?.thoughtsTokenCount ?? 0,
  };
  const parsed = parseReply(reply);
  const picked = typeof parsed?.label === "string" ? parsed.label.trim() : "";
  const label = candidates.find((item) => item === picked) ?? candidates.find((item) => item.toLowerCase() === picked.toLowerCase());
  const confidence = typeof parsed?.confidence === "number" ? parsed.confidence : null;
  if (!label) {
    const reason = body.promptFeedback?.blockReason ? `blocked: ${body.promptFeedback.blockReason}` : "no candidate label in the reply";
    return { ...meta, status: "invalid", reply: reply.slice(0, 300), confidence, error: reason };
  }
  return { ...meta, status: "answered", label, confidence };
}

function describeError(status: number, text: string) {
  try {
    const body = JSON.parse(text) as {
      error?: { status?: string; message?: string; details?: Array<{ violations?: Array<{ quotaId?: string; quotaValue?: string }> }> };
    };
    const quotas = (body.error?.details ?? []).flatMap((item) => item.violations ?? []).map((item) => `${item.quotaId}=${item.quotaValue}`);
    const message = (body.error?.message ?? "").replace(/\s+/g, " ").trim();
    return redact(`HTTP ${status} ${body.error?.status ?? ""}: ${message}${quotas.length ? ` [quota ${quotas.join(", ")}]` : ""}`).slice(0, 700);
  } catch {
    return redact(`HTTP ${status}: ${text.replace(/\s+/g, " ").slice(0, 400)}`);
  }
}

let lastRequestAt = 0;

async function askGemini(body: unknown, candidates: string[]): Promise<GeminiAnswer & { dailyQuota?: boolean }> {
  const httpStatuses: number[] = [];
  let error = "";
  for (let attempt = 0; ; attempt += 1) {
    const wait = lastRequestAt + requestGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    let status = 0;
    let text = "";
    try {
      const response = await fetch(`${geminiBase}/models/${geminiModel}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
      status = response.status;
      text = await response.text();
    } catch (failure) {
      status = 0;
      error = redact(`request failed: ${(failure as Error).message}`);
    }
    httpStatuses.push(status);
    if (status === 200) return readAnswer(text, candidates, attempt + 1, httpStatuses);
    if (status) error = describeError(status, text);
    const attempts = attempt + 1;
    if (status === 429 && /PerDay/i.test(text)) return { status: "no-answer", error, attempts, httpStatuses, dailyQuota: true };
    const retryable = status === 0 || status === 429 || status >= 500;
    if (!retryable || attempt >= backoffSeconds.length) return { status: "no-answer", error, attempts, httpStatuses };
    const hinted = Number(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(text)?.[1] ?? 0);
    const delay = Math.max(backoffSeconds[attempt], Math.ceil(hinted));
    console.log(`    ${status || "network error"}; retrying in ${delay}s`);
    await sleep(delay * 1000);
  }
}

function roundRobin(items: ImageResult[]) {
  const groups = new Map<string, ImageResult[]>();
  for (const item of items) groups.set(item.plantDocClass, [...(groups.get(item.plantDocClass) ?? []), item]);
  const order: ImageResult[] = [];
  for (let index = 0; order.length < items.length; index += 1) {
    for (const group of groups.values()) if (group[index]) order.push(group[index]);
  }
  return order;
}

function commonWrong(items: ImageResult[], pick: (item: ImageResult) => string | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = pick(item);
    if (label && label !== item.trueLabel) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || byText(a[0], b[0]))
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));
}

const geminiScored = (item: ImageResult) => item.gemini?.status === "answered" || item.gemini?.status === "invalid";

function confidenceSplit(items: ImageResult[], mode: "noCrop" | "cropFiltered") {
  const confident = items.filter((item) => !item[mode].lowConfidence);
  const low = items.filter((item) => item[mode].lowConfidence);
  return {
    rule: `the app flags a scan as low confidence when the top score is below ${lowConfidenceBelow}`,
    confident: headline(confident, (item) => item[mode].correct),
    lowConfidence: headline(low, (item) => item[mode].correct),
    shareFlaggedLow: pct(low.length, items.length),
    ...(mode === "cropFiltered" && !skipGemini
      ? {
          geminiOnSameImages: {
            confident: rate(confident.filter(geminiScored), (item) => item.gemini?.correct === true),
            lowConfidence: rate(low.filter(geminiScored), (item) => item.gemini?.correct === true),
          },
        }
      : {}),
  };
}

function agreement(items: ImageResult[]) {
  const answered = items.filter((item) => item.gemini?.status === "answered");
  const agree = answered.filter((item) => item.gemini?.label === item.cropFiltered.top3[0]?.label);
  const disagree = answered.filter((item) => item.gemini?.label !== item.cropFiltered.top3[0]?.label);
  const modelRight = disagree.filter((item) => item.cropFiltered.correct).length;
  const geminiRight = disagree.filter((item) => item.gemini?.correct).length;
  const neither = disagree.length - modelRight - geminiRight;
  return {
    imagesWithGeminiAnswer: answered.length,
    agree: { n: agree.length, pct: pct(agree.length, answered.length) },
    accuracyWhenAgree: headline(agree, (item) => item.cropFiltered.correct),
    disagree: {
      n: disagree.length,
      pct: pct(disagree.length, answered.length),
      modelRight: { n: modelRight, pct: pct(modelRight, disagree.length) },
      geminiRight: { n: geminiRight, pct: pct(geminiRight, disagree.length) },
      neitherRight: { n: neither, pct: pct(neither, disagree.length) },
    },
  };
}

const startedAt = Date.now();
mkdirSync(cacheRoot, { recursive: true });

if (!skipGemini && !apiKey) throw new Error("GEMINI_API_KEY is not set in backend/.env (or pass --skip-gemini)");

const tree = await repoTree();
const findEntry = (path: string) => {
  const entry = tree.find((item) => item.type === "blob" && item.path === path);
  if (!entry) throw new Error(`${path} is missing from ${repo}@${commit}`);
  return entry;
};
const licenseText = (await repoFile(findEntry("LICENSE.txt"), resolve(cacheRoot, "LICENSE.txt"))).toString("utf8");
const readmeText = (await repoFile(findEntry("README.md"), resolve(cacheRoot, "README.md"))).toString("utf8");
const licenseChecks = {
  licenseTxtStartsWithCcBy4: licenseText.trimStart().startsWith("Attribution 4.0 International"),
  licenseTxtHasPublicLicenseTitle: licenseText.includes("Creative Commons Attribution 4.0 International Public License"),
  readmeLicenseSection: /## License\s+Creative Commons Attribution 4\.0 International/.test(readmeText),
};
const licenseVerified = Object.values(licenseChecks).every(Boolean);

const testEntries = tree.filter((item) => item.type === "blob" && item.path.startsWith("test/")).sort((a, b) => byText(a.path, b.path));
const trainClasses = new Set(tree.filter((item) => item.type === "blob" && item.path.startsWith("train/")).map((item) => item.path.split("/")[1]));
const testClasses = [...new Set(testEntries.map((item) => item.path.split("/")[1]))].sort(byText);
for (const file of Object.keys(nameConflicts)) {
  if (!testEntries.some((item) => item.path === file)) throw new Error(`nameConflicts lists ${file}, which is not in the test split`);
}

const localPaths = new Map<string, string>();
for (const entry of testEntries) {
  const local = resolve(cacheRoot, ...entry.path.split("/").map(safeName));
  if ([...localPaths.values()].includes(local)) throw new Error(`Two dataset files map to ${local}`);
  localPaths.set(entry.path, local);
}
console.log(`PlantDoc ${commit.slice(0, 7)}: fetching/verifying ${testEntries.length} test files into ${cacheRoot}`);
const buffers = await inPool(testEntries, 6, (entry) => repoFile(entry, localPaths.get(entry.path) as string));

const classifier = (await loadPlantModel()) as unknown as { model: { config: { id2label: Record<string, string> } } };
const modelLabels = Object.values(classifier.model.config.id2label);
const appLabels = Object.keys(diseaseKnowledge);
const missingInApp = modelLabels.filter((label) => !appLabels.includes(label));
const missingInModel = appLabels.filter((label) => !modelLabels.includes(label));
for (const [plantDocClass, target] of Object.entries(classMap)) {
  if (!modelLabels.includes(target.label) || !getDiseaseInfo(target.label)) throw new Error(`${plantDocClass} maps to unknown label ${target.label}`);
}
const modelDir = fromRoot(".cache", "models", plantModelId);
const onnxFile = dtype === "q8" ? "onnx/model_quantized.onnx" : "onnx/model.onnx";
const onnxSha256 = sha256(readFileSync(resolve(modelDir, onnxFile)));
const processorConfig = JSON.parse(readFileSync(resolve(modelDir, "preprocessor_config.json"), "utf8"));
const candidatesFor = (cropKey: string) => modelLabels.filter((label) => getDiseaseInfo(label)?.cropKey === cropKey);

const results: ImageResult[] = [];
const skipped: Array<{ file: string; reason: string }> = [];
const excludedFiles = new Map<string, number>();
const smallImages = new Map<string, Buffer>();

for (const [index, entry] of testEntries.entries()) {
  const parts = entry.path.split("/");
  const plantDocClass = parts[1];
  const target = classMap[plantDocClass];
  if (parts.length !== 3 || !target) {
    excludedFiles.set(plantDocClass, (excludedFiles.get(plantDocClass) ?? 0) + 1);
    continue;
  }
  const info = getDiseaseInfo(target.label);
  if (!info) throw new Error(`No disease info for ${target.label}`);
  let normalized: Buffer;
  let meta: Metadata;
  let all: Scored[];
  try {
    meta = await sharp(buffers[index]).metadata();
    normalized = await normalizeUpload(buffers[index]);
  } catch (error) {
    skipped.push({ file: entry.path, reason: `not a decodable image: ${(error as Error).message}` });
    continue;
  }
  try {
    all = await classifyLeaf(normalized);
  } catch (error) {
    skipped.push({ file: entry.path, reason: `classifier failed: ${(error as Error).message}` });
    continue;
  }
  const noCrop = rank(all, target.label);
  results.push({
    file: entry.path,
    gitBlobSha: entry.sha,
    plantDocClass,
    trueLabel: target.label,
    cropKey: info.cropKey,
    candidates: candidatesFor(info.cropKey).length,
    format: meta.format ?? "unknown",
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    noCrop: { ...noCrop, cropCorrect: getDiseaseInfo(all[0]?.label ?? "")?.cropKey === info.cropKey },
    cropFiltered: rank(cropFilter(all, info.cropKey), target.label),
    gemini: null,
  });
  if (!skipGemini) smallImages.set(entry.path, await sharp(normalized).resize(768, 768, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer());
}
console.log(`Model: evaluated ${results.length} images, skipped ${skipped.length}`);

const geminiCachePath = resolve(cacheRoot, "gemini-answers.json");
const geminiCache: Record<string, GeminiAnswer> = existsSync(geminiCachePath) ? JSON.parse(readFileSync(geminiCachePath, "utf8")) : {};
let geminiInfo: { displayName?: string; version?: string } = {};
let stopReason = "";
let newRequests = 0;

if (!skipGemini) {
  const check = await fetch(`${geminiBase}/models/${geminiModel}`, { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(20000) });
  const checkText = await check.text();
  if (!check.ok) throw new Error(redact(`Gemini model ${geminiModel} is not available: HTTP ${check.status} ${checkText.slice(0, 200)}`));
  geminiInfo = JSON.parse(checkText);

  const queue = [...roundRobin(results.filter((item) => item.candidates > 1)), ...roundRobin(results.filter((item) => item.candidates === 1))];
  for (const [index, item] of queue.entries()) {
    const info = getDiseaseInfo(item.trueLabel);
    const candidates = candidatesFor(item.cropKey);
    const body = geminiBody(smallImages.get(item.file) as Buffer, geminiPrompt(info?.crop ?? item.cropKey, candidates));
    const cacheKey = sha256(`${geminiModel}\n${JSON.stringify(body)}`);
    let answer: GeminiAnswer;
    if (!freshGemini && geminiCache[cacheKey]) {
      answer = { ...geminiCache[cacheKey], cached: true };
    } else {
      if (!stopReason && newRequests >= geminiLimit) stopReason = `--gemini-limit=${geminiLimit} reached`;
      if (stopReason) {
        answer = { status: "not-attempted", error: stopReason, attempts: 0, httpStatuses: [] };
      } else {
        newRequests += 1;
        const { dailyQuota, ...result } = await askGemini(body, candidates);
        if (dailyQuota) stopReason = "Gemini daily quota exhausted; later images were not sent";
        answer = result;
        if (answer.status === "answered" || answer.status === "invalid") {
          geminiCache[cacheKey] = answer;
          writeFileSync(geminiCachePath, JSON.stringify(geminiCache, null, 1));
        }
      }
    }
    item.gemini = { ...answer, ...(answer.status === "answered" || answer.status === "invalid" ? { correct: answer.label === item.trueLabel } : {}) };
    const outcome = item.gemini.status === "answered" ? `${item.gemini.correct ? "right" : "wrong"}: ${item.gemini.label}` : `${item.gemini.status} ${item.gemini.error ?? ""}`;
    console.log(`[gemini ${index + 1}/${queue.length}] ${item.plantDocClass} -> ${outcome}${answer.cached ? " (cached)" : ""}`);
  }
}

const multi = results.filter((item) => item.candidates > 1);
const singleCrops = [...new Set(results.filter((item) => item.candidates === 1).map((item) => item.cropKey))].sort(byText);
const scored = results.filter(geminiScored);
const geminiCount = (status: GeminiAnswer["status"]) => results.filter((item) => item.gemini?.status === status).length;
const answeredTimes = scored.map((item) => item.gemini?.answeredAt ?? "").filter(Boolean).sort(byText);
const topCounts = new Map<string, number>();
for (const item of results) topCounts.set(item.noCrop.top3[0]?.label ?? "", (topCounts.get(item.noCrop.top3[0]?.label ?? "") ?? 0) + 1);

const geminiMetrics = (items: ImageResult[]) => {
  const sent = items.filter(geminiScored);
  return {
    images: sent.length,
    top1: headline(sent, (item) => item.gemini?.correct === true),
    modelCropFilteredTop1OnSameImages: headline(sent, (item) => item.cropFiltered.correct),
  };
};

const tableRow = (items: ImageResult[]) => ({
  n: items.length,
  noCropTop1: rate(items, (item) => item.noCrop.correct),
  cropFilteredTop1: rate(items, (item) => item.cropFiltered.correct),
  cropFilteredTop3: rate(items, (item) => item.cropFiltered.top3Correct),
  gemini: skipGemini ? null : rate(items.filter(geminiScored), (item) => item.gemini?.correct === true),
});

const cropKeysSeen = [...new Set(results.map((item) => item.cropKey))].sort(byText);
const perCrop = cropKeysSeen.map((cropKey) => {
  const items = results.filter((item) => item.cropKey === cropKey);
  const crop = getDiseaseInfo(items[0].trueLabel)?.crop ?? cropKey;
  return { crop, cropKey, candidateLabels: candidatesFor(cropKey).length, plantDocClasses: [...new Set(items.map((item) => item.plantDocClass))], ...tableRow(items) };
});

const perClass = testClasses
  .filter((plantDocClass) => classMap[plantDocClass])
  .map((plantDocClass) => {
    const items = results.filter((item) => item.plantDocClass === plantDocClass);
    return {
      plantDocClass,
      label: classMap[plantDocClass].label,
      cropKey: getDiseaseInfo(classMap[plantDocClass].label)?.cropKey,
      candidateLabels: candidatesFor(getDiseaseInfo(classMap[plantDocClass].label)?.cropKey ?? "").length,
      ...tableRow(items),
      commonWrongPredictions: {
        noCrop: commonWrong(items, (item) => item.noCrop.top3[0]?.label),
        cropFiltered: commonWrong(items, (item) => item.cropFiltered.top3[0]?.label),
        gemini: skipGemini ? [] : commonWrong(items, (item) => (item.gemini?.status === "answered" ? item.gemini.label : undefined)),
      },
    };
  });

const excludedClasses = [
  ...testClasses
    .filter((plantDocClass) => !classMap[plantDocClass])
    .map((plantDocClass) => ({
      plantDocClass,
      testImages: excludedFiles.get(plantDocClass) ?? 0,
      reason: "no counterpart among the model's 38 PlantVillage labels",
    })),
  ...[...trainClasses]
    .filter((plantDocClass) => !testClasses.includes(plantDocClass))
    .sort(byText)
    .map((plantDocClass) => ({
      plantDocClass,
      testImages: 0,
      trainImages: tree.filter((item) => item.type === "blob" && item.path.startsWith(`train/${plantDocClass}/`)).length,
      reason: `present only in train/; the official test split has no images of it${classMap[plantDocClass] ? ` (it would map to "${classMap[plantDocClass].label}")` : ""}`,
    })),
];

const mapping = testClasses
  .filter((plantDocClass) => classMap[plantDocClass])
  .map((plantDocClass) => {
    const info = getDiseaseInfo(classMap[plantDocClass].label);
    return {
      plantDocClass,
      label: classMap[plantDocClass].label,
      crop: info?.crop,
      cropKey: info?.cropKey,
      healthy: info?.healthy,
      testImages: testEntries.filter((item) => item.path.startsWith(`test/${plantDocClass}/`)).length,
      evaluated: results.filter((item) => item.plantDocClass === plantDocClass).length,
      ...(classMap[plantDocClass].note ? { note: classMap[plantDocClass].note } : {}),
    };
  });

const formats = [...new Set(results.map((item) => item.format))];
const trainFiles = tree.filter((item) => item.type === "blob" && item.path.startsWith("train/")).length;
const genericNames = mapping.filter((item) => item.note && item.note !== healthyNote).length;
const classSizes = perClass.map((item) => item.n);
const top3Trivial = perCrop.filter((item) => item.candidateLabels <= 3).map((item) => item.cropKey);
const top3Useful = perCrop.filter((item) => item.candidateLabels > 3).map((item) => `${item.cropKey} (${item.candidateLabels} labels)`);
const stockNames = testEntries.filter((item) => stockMarkers.test(item.path.split("/").pop() ?? ""));
const stockInHealthy = stockNames.filter((item) => getDiseaseInfo(classMap[item.path.split("/")[1]]?.label ?? "")?.healthy).length;
const clean = results.filter((item) => !nameConflicts[item.file]);
const subsetRule = skipGemini
  ? "Gemini not run (--skip-gemini)"
  : geminiCount("not-attempted")
    ? `Partial: ${stopReason}. Images were queued in class round-robin order (multi-label crops first) so the answered set stays close to stratified; perClass[].gemini.n gives n per class.`
    : "None: every evaluated image was sent to Gemini (full test split, no subset).";

const notes = [
  "PlantDoc photos were collected from Google Images and Ecosia and labelled by four annotators following APS guidelines (paper section 3.1). They are real-world web photos rather than PlantVillage-style lab shots, but not all are field photos: spot checks show field and garden close-ups (often a leaf held in a hand, with soil or other plants behind), indoor shots (picked leaves on a cutting board, a clinic photo), wallpapers and stock photos, several with watermarks. Many contain more than one leaf, and some are small or blurry.",
  `${stockNames.length} of the ${testEntries.length} test file names carry stock-photo, wallpaper or isolated-on-white markers; ${stockInHealthy} of them are among the ${results.filter((item) => getDiseaseInfo(item.trueLabel)?.healthy).length} healthy-class images, so the healthy classes rely heavily on stock photos of leaves on plain backgrounds.`,
  `Label noise: ${Object.keys(nameConflicts).length} test images have source file names that contradict their PlantDoc label (listed in dataset.labelConflictsByFileName; for example a sycamore leaf filed as squash, and three gray leaf spot photos filed as corn leaf blight). The list is not exhaustive. They stay in the headline metrics (official split unchanged); metrics.sensitivity shows the numbers without them. The paper itself notes that tomato bacterial spot and Septoria look alike (Fig. 6).`,
  `The repository README calls its contents the Cropped-PlantDoc set, but its file count (${trainFiles} train + ${testEntries.length} test) matches the paper's 2,598 uncropped photos (paper split 2,360/238), not the 9,216 leaf crops the paper reports for Cropped-PlantDoc, so these are whole photos.`,
  `Mapping: PlantDoc was collected by searching for the scientific and common names of PlantVillage's 38 classes (paper section 3.1), so every PlantDoc test class has a PlantVillage counterpart. ${genericNames} PlantDoc names are less specific than PlantVillage's (see dataset.mapping[].note); they were mapped to the only PlantVillage class of that kind for the crop, so a few photos may show a look-alike disease.`,
  `Crop filter: ${singleCrops.join(", ")} each have a single label in the model, so with the crop selected their ${results.length - multi.length} images are always correct with score 1.0 and never flagged low confidence. metrics.cropFiltered.multiLabelCrops excludes them; use it for an honest view of the crop filter.`,
  `Top-3 with the crop filter is automatically correct for crops with 3 or fewer labels (${top3Trivial.join(", ")}). It is informative only for ${top3Useful.join(", ")}.`,
  "The model was trained on PlantVillage (lab photos of single leaves on plain backgrounds) and never saw PlantDoc; its model card reports 95.41% accuracy on its own PlantVillage evaluation split. For comparison, the PlantDoc paper reports 15.08% accuracy for a PlantVillage-trained VGG16 tested on uncropped PlantDoc (Table 1).",
  "Preprocessing matches the app: the transformers.js processor resizes the shortest edge to 256 and centre-crops 224x224, so the edges of wide or tall photos are cut off before classification.",
  "Gemini was asked a closed-set question: pick one of the true crop's PlantVillage labels. It could not answer 'another disease' or 'not sure'. The app's own second opinion is free-text and is told the on-device prediction; here that prediction was withheld so Gemini acts as an independent rater.",
  "PlantDoc images are public web images, so Gemini may have seen some of them during pre-training; its accuracy here may be optimistic. Gemini ran at temperature 0.2, so a re-run can differ slightly; every answer is stored in images[].gemini.",
  "Invalid Gemini replies (HTTP 200 but no candidate label) count as wrong in Gemini accuracy and are left out of the agreement analysis. 'No answer' (HTTP errors after all retries) is left out of Gemini accuracy.",
  `Per-class n is small (${Math.min(...classSizes)} to ${Math.max(...classSizes)} images), so per-class percentages are very uncertain; the headline metrics include 95% Wilson score intervals (ci95, in percent).`,
  "The script loads classifyLeaf, getDiseaseInfo and diseaseKnowledge from the app. createScan's normalisation and crop filter are inline in scan.service.ts (not exported), so the script repeats those lines exactly instead of importing them; it never calls the API server or the database.",
  "Not measured here: pest mode, the pixel-based affected-area estimate, and photos of crops the model does not know.",
  ...(stopReason
    ? [
        scored.length
          ? `Gemini stopped early: ${stopReason}. Gemini metrics and the agreement analysis cover only the ${scored.length} images it answered; see gemini.subsetRule.`
          : `Gemini stopped early: ${stopReason}. No Gemini answers were collected, so the Gemini metrics and the agreement analysis are empty. Re-running after the quota resets continues where this run stopped (answers are cached in .cache/plantdoc/gemini-answers.json and reused).`,
      ]
    : []),
  ...(formats.some((format) => format !== "jpeg") ? [`Source formats seen: ${formats.join(", ")}. Every image goes through the app's sharp normalisation, so the model always receives JPEG.`] : []),
];

const output = {
  generatedAt: new Date().toISOString(),
  script: "backend/scripts/validate-disease-model.ts",
  command: `npx tsx scripts/validate-disease-model.ts${process.argv.slice(2).length ? ` ${process.argv.slice(2).join(" ")}` : ""}`,
  environment: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    packages: {
      "@huggingface/transformers": packageVersion("@huggingface/transformers"),
      "onnxruntime-node": packageVersion("onnxruntime-node"),
      sharp: packageVersion("sharp"),
    },
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
  },
  dataset: {
    name: "PlantDoc (classification images from pratikkayal/PlantDoc-Dataset)",
    citation:
      "Singh D., Jain N., Jain P., Kayal P., Kumawat S., Batra N. PlantDoc: A Dataset for Visual Plant Disease Detection. Proceedings of the 7th ACM IKDD CoDS and 25th COMAD (CoDS COMAD 2020), Hyderabad, India, pp. 249-253. https://doi.org/10.1145/3371158.3371196 (arXiv:1911.10317)",
    url: `https://github.com/${repo}`,
    commit,
    license: licenseVerified ? "CC BY 4.0 (Creative Commons Attribution 4.0 International)" : "unverified",
    licenseEvidence: {
      ...licenseChecks,
      files: `LICENSE.txt and README.md at commit ${commit}`,
      caveat: "The paper says the photos were downloaded from the internet, so the licence covers the dataset release; rights in individual source photos may differ.",
    },
    split: "test (the repository's official test/ folder)",
    localCopy: "backend/.cache/plantdoc/test (each file verified against its git blob SHA-1 at the pinned commit)",
    imagesFound: testEntries.length,
    imagesEvaluated: results.length,
    skipped: { count: skipped.length, files: skipped },
    classesFound: testClasses.length,
    classesEvaluated: mapping.filter((item) => item.evaluated > 0).length,
    excludedClasses,
    modelLabelsWithoutTestImages: modelLabels.filter((label) => !results.some((item) => item.trueLabel === label)),
    mapping,
    labelConflictsByFileName: Object.entries(nameConflicts).map(([file, says]) => ({ file, says })),
    stockPhotoFileNames: { count: stockNames.length, inHealthyClasses: stockInHealthy, pattern: stockMarkers.source },
  },
  model: {
    id: plantModelId,
    url: `https://huggingface.co/${plantModelId}`,
    baseModel:
      "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification: google/mobilenet_v2_1.0_224 fine-tuned on the Kaggle 'New Plant Diseases' copy of PlantVillage (model card)",
    dtype,
    onnxFile,
    onnxSha256,
    labelCheck: {
      modelLabels: modelLabels.length,
      appLabels: appLabels.length,
      identical: !missingInApp.length && !missingInModel.length,
      missingInApp,
      missingInModel,
    },
    preprocessing: {
      app: "createScan: sharp .rotate() (EXIF orientation), resize to fit inside 1280x1280 without enlargement, JPEG quality 85",
      classifier: "classifyLeaf: transformers.js image-classification pipeline, top_k 38 (softmax scores for every label)",
      processorConfig: {
        size: processorConfig.size,
        crop_size: processorConfig.crop_size,
        resample: processorConfig.resample,
        do_center_crop: processorConfig.do_center_crop,
        rescale_factor: processorConfig.rescale_factor,
        image_mean: processorConfig.image_mean,
        image_std: processorConfig.image_std,
      },
      cropFilter: "createScan: keep labels whose getDiseaseInfo(label).cropKey equals the selected crop, renormalise scores to sum to 1",
      lowConfidence: `createScan: lowConfidence = top score < ${lowConfidenceBelow}`,
    },
  },
  gemini: skipGemini
    ? { run: false }
    : {
        run: true,
        model: geminiModel,
        displayName: geminiInfo.displayName,
        modelVersionsReported: [...new Set(scored.map((item) => item.gemini?.modelVersion).filter(Boolean))],
        imagesQueued: results.length,
        imagesEvaluated: scored.length,
        answered: geminiCount("answered"),
        invalidAnswers: geminiCount("invalid"),
        noAnswer: geminiCount("no-answer"),
        notAttempted: geminiCount("not-attempted"),
        cachedAnswersReused: results.filter((item) => item.gemini?.cached).length,
        answersCollected: { first: answeredTimes[0] ?? null, last: answeredTimes[answeredTimes.length - 1] ?? null },
        responsesWithThinkingTokens: scored.filter((item) => (item.gemini?.thoughtsTokens ?? 0) > 0).length,
        subsetRule,
        stoppedEarly: stopReason || null,
        promptSummary:
          "System prompt: the first two sentences of runSecondOpinion's system prompt. User turn: the photo (the app's normalised image resized to fit 768x768, JPEG quality 80, as runSecondOpinion does), the true crop's name, that crop's PlantVillage labels as a list, and a request for JSON {label, confidence}. The on-device prediction is not shown to Gemini.",
        systemPrompt: geminiSystem,
        userPromptExample: geminiPrompt("Tomato", candidatesFor("tomato")),
        generationConfig: { temperature: 0.2, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json" },
        request: "POST v1beta/models/gemini-3.8-flash:generateContent with the same body shape as geminiGenerate in src/lib/ai/providers.ts; the key goes in the x-goog-api-key header instead of the URL so it cannot reach logs",
        pacing: "at most 4 requests per minute: at least 15.1 s between request starts, retries included",
        retryPolicy:
          "HTTP 429, 5xx, 45 s timeouts and network errors: wait 30, 60, 120 then 240 s (or the server's RetryInfo delay if longer), at most 4 retries, then 'no answer'. A 429 naming a per-day quota stops the run early (later images 'not attempted'). One model only, no fallback.",
      },
  metrics: {
    imagesEvaluated: results.length,
    noCrop: {
      description: "No crop selected: the top label among all 38",
      top1: headline(results, (item) => item.noCrop.correct),
      top3: headline(results, (item) => item.noCrop.top3Correct),
      top1RightCrop: rate(results, (item) => item.noCrop.cropCorrect),
      lowConfidenceSplit: confidenceSplit(results, "noCrop"),
      mostPredictedLabels: [...topCounts.entries()]
        .sort((a, b) => b[1] - a[1] || byText(a[0], b[0]))
        .slice(0, 5)
        .map(([label, count]) => ({ label, count, pct: pct(count, results.length) })),
    },
    cropFiltered: {
      description: "Farmer selects the true crop: only that crop's labels, scores renormalised (createScan)",
      top1: headline(results, (item) => item.cropFiltered.correct),
      top3: headline(results, (item) => item.cropFiltered.top3Correct),
      lowConfidenceSplit: confidenceSplit(results, "cropFiltered"),
      multiLabelCrops: {
        description: `Only crops with 2 or more labels (drops ${singleCrops.join(", ")})`,
        images: multi.length,
        top1: headline(multi, (item) => item.cropFiltered.correct),
        top3: headline(multi, (item) => item.cropFiltered.top3Correct),
        lowConfidenceSplit: confidenceSplit(multi, "cropFiltered"),
      },
    },
    gemini: skipGemini
      ? null
      : {
          description: `${geminiModel} picks one label from the true crop's candidates`,
          ...geminiMetrics(results),
          multiLabelCrops: geminiMetrics(multi),
        },
    agreement: skipGemini
      ? null
      : {
          description: "Crop-filtered model top-1 vs Gemini, on images where Gemini returned a valid label",
          all: agreement(results),
          multiLabelCrops: agreement(multi),
        },
    sensitivity: {
      description: `The same headline metrics without the ${results.length - clean.length} test images whose own file names contradict their label (dataset.labelConflictsByFileName). Context only: the headline metrics above use the full official split.`,
      images: clean.length,
      noCropTop1: headline(clean, (item) => item.noCrop.correct),
      cropFilteredTop1: headline(clean, (item) => item.cropFiltered.correct),
      cropFilteredTop1MultiLabelCrops: headline(
        clean.filter((item) => item.candidates > 1),
        (item) => item.cropFiltered.correct
      ),
      geminiTop1: skipGemini ? null : headline(clean.filter(geminiScored), (item) => item.gemini?.correct === true),
    },
  },
  perCrop,
  perClass,
  notes,
  images: results,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

const show = (label: string, value: { correct: number; n: number; pct: number | null }) => console.log(`${label}: ${value.correct}/${value.n} = ${value.pct}%`);
show("No crop, top-1", output.metrics.noCrop.top1);
show("Crop filter, top-1", output.metrics.cropFiltered.top1);
show("Crop filter, top-3", output.metrics.cropFiltered.top3);
show("Crop filter (multi-label crops), top-1", output.metrics.cropFiltered.multiLabelCrops.top1);
if (output.metrics.gemini) show(`Gemini ${geminiModel}`, output.metrics.gemini.top1);
console.log(`Wrote ${outPath}`);
