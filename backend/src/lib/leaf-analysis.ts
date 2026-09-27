import sharp from "sharp";

// Estimates how much of the visible leaf tissue is discoloured (brown/yellow lesions) from pixel colours.
export async function analyzeLeafPixels(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let healthy = 0;
  let lesion = 0;
  let yellow = 0;
  const total = info.width * info.height;

  for (let index = 0; index < data.length; index += 3) {
    const [h, s, v] = hsv(data[index], data[index + 1], data[index + 2]);
    if (v < 0.12 || (s < 0.18 && v > 0.75)) continue;
    if (h >= 65 && h <= 170 && s >= 0.18) healthy += 1;
    else if (h >= 40 && h < 65 && s >= 0.3) yellow += 1;
    else if (h >= 5 && h < 40 && s >= 0.25 && v <= 0.85) lesion += 1;
  }

  const leaf = healthy + lesion + yellow;
  return {
    leafCoveragePct: Math.round((leaf / total) * 100),
    affectedPct: leaf > 0 ? Math.round(((lesion + yellow * 0.5) / leaf) * 1000) / 10 : null,
    yellowingPct: leaf > 0 ? Math.round((yellow / leaf) * 1000) / 10 : null,
  };
}

function hsv(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return [hue, max === 0 ? 0 : delta / max, max];
}
