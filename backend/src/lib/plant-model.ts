import { env as hfEnv, pipeline, RawImage } from "@huggingface/transformers";
import { fromRoot } from "../config/paths.js";

export const plantModelId = "onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX";

hfEnv.cacheDir = fromRoot(".cache", "models");

type Classifier = (image: RawImage, options: { top_k: number }) => Promise<Array<{ label: string; score: number }>>;
let loading: Promise<Classifier> | null = null;

// Full precision: the 8-bit quantized export misclassifies field photos badly.
const dtype = (process.env.PLANT_MODEL_DTYPE as "fp32" | "q8" | undefined) ?? "fp32";

export function loadPlantModel() {
  loading ??= pipeline("image-classification", plantModelId, { dtype }).then(
    (classifier) => classifier as unknown as Classifier
  );
  return loading;
}

// MobileNetV2 fine-tuned on PlantVillage (38 crop/disease classes), run locally with ONNX Runtime.
export async function classifyLeaf(buffer: Buffer) {
  const classifier = await loadPlantModel();
  const image = await RawImage.fromBlob(new Blob([new Uint8Array(buffer)]));
  const results = await classifier(image, { top_k: 38 });
  return results.map((item) => ({ label: item.label, score: item.score }));
}
