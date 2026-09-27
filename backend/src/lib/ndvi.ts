import { fromUrl } from "geotiff";
import type { GeoTIFFImage, TypedArray } from "geotiff";
import proj4 from "proj4";
import { PNG } from "pngjs";

export interface NdviResult {
  sceneId: string;
  sceneDate: string;
  cloudCover: number;
  meanNdvi: number;
  minNdvi: number;
  maxNdvi: number;
  validPixelRatio: number;
  pixelCount: number;
  pixelSizeM: number;
  bounds: [[number, number], [number, number]];
  png: Buffer;
  zones: { low: number; medium: number; high: number };
}

type LatLng = [number, number];
type Point = [number, number];
type Rgb = [number, number, number];
type Bounds = NdviResult["bounds"];

interface Extent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PixelWindow {
  col0: number;
  row0: number;
  col1: number;
  row1: number;
}

interface Grid {
  originX: number;
  originY: number;
  resX: number;
  resY: number;
  width: number;
  height: number;
}

interface BandScaling {
  scale: number;
  offset: number;
}

interface FieldMask {
  window: PixelWindow;
  inside: Uint8Array;
  insideCount: number;
}

interface FieldRasters {
  grid: Grid;
  window: PixelWindow;
  red: TypedArray;
  nir: TypedArray;
  redScaling: BandScaling;
  nirScaling: BandScaling;
  sclGrid: Grid;
  sclWindow: PixelWindow;
  scl: TypedArray;
}

interface NdviStats {
  pixelCount: number;
  validPixelRatio: number;
  mean: number;
  min: number;
  max: number;
  zones: NdviResult["zones"];
}

interface StacAsset {
  href: string;
  "raster:bands"?: Array<{ scale?: number; offset?: number }>;
  "proj:epsg"?: number | null;
  "proj:code"?: string | null;
}

interface StacItem {
  id: string;
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
    "proj:epsg"?: number | null;
    "proj:code"?: string | null;
    "s2:processing_baseline"?: string;
    "earthsearch:boa_offset_applied"?: boolean;
  };
  assets: Partial<Record<"red" | "nir" | "scl", StacAsset>>;
}

interface Converter {
  forward(coordinates: Point): Point;
  inverse(coordinates: Point): Point;
}

class FieldPolygonError extends Error {}

const STAC_SEARCH_URL = "https://earth-search.aws.element84.com/v1/search";
const COLLECTION = "sentinel-2-l2a";
const REQUEST_TIMEOUT_MS = 20_000;
const MIN_VALID_RATIO = 0.5;
const WINDOW_PADDING = 2;
const OVERLAY_ALPHA = 220;
const OVERLAY_UPSCALE = 8;
const OVERLAY_MIN_SIDE = 256;
const OVERLAY_MAX_SIDE = 1024;
// 0 nodata, 1 saturated, 3 cloud shadow, 7 unclassified (Sen2Cor's former "cloud low probability",
// which is where thin haze lands), 8/9 cloud medium/high, 10 thin cirrus.
const INVALID_SCL_CLASSES = new Set([0, 1, 3, 7, 8, 9, 10]);
const NDVI_RAMP: Array<[number, Rgb]> = [
  [0, [0xa5, 0x00, 0x26]],
  [0.2, [0xf4, 0x6d, 0x43]],
  [0.4, [0xfe, 0xe0, 0x8b]],
  [0.6, [0xa6, 0xd9, 0x6a]],
  [0.8, [0x1a, 0x98, 0x50]],
];

export async function computeFieldNdvi(
  polygon: Array<[number, number]>,
  options: { lookbackDays?: number; maxCloud?: number; maxScenes?: number; until?: Date } = {},
): Promise<NdviResult | null> {
  const vertices = normalisePolygon(polygon);
  const lookbackDays = numberOption(options.lookbackDays, 45, 1, 365);
  const maxCloud = numberOption(options.maxCloud, 40, 0, 100);
  const maxScenes = Math.round(numberOption(options.maxScenes, 4, 1, 20));

  const items = await searchScenes(vertices, lookbackDays, maxCloud, maxScenes, options.until);
  let lastError: unknown;
  let evaluated = 0;
  for (const item of items) {
    try {
      const result = await evaluateScene(item, vertices);
      evaluated += 1;
      if (result) return result;
    } catch (error) {
      if (error instanceof FieldPolygonError) throw error;
      lastError = error;
    }
  }
  if (evaluated === 0 && lastError !== undefined) {
    throw new Error(`No Sentinel-2 scene could be processed for this field: ${errorMessage(lastError)}`);
  }
  return null;
}

function normalisePolygon(polygon: Array<[number, number]>): LatLng[] {
  if (!Array.isArray(polygon)) {
    throw new FieldPolygonError("Field polygon must be an array of [lat, lng] pairs");
  }
  const vertices = polygon.map((vertex, index): LatLng => {
    const [lat, lng] = Array.isArray(vertex) ? vertex : [Number.NaN, Number.NaN];
    const valid =
      Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!valid) throw new FieldPolygonError(`Invalid field polygon vertex at index ${index}; expected [lat, lng]`);
    return [lat, lng];
  });
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  if (vertices.length > 1 && first[0] === last[0] && first[1] === last[1]) vertices.pop();
  if (vertices.length < 3) throw new FieldPolygonError("Field polygon needs at least 3 vertices");
  return vertices;
}

function numberOption(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new Error(`Invalid NDVI option value: ${value}`);
  return clamp(value, min, max);
}

function toGeoJsonPolygon(vertices: LatLng[]): { type: "Polygon"; coordinates: number[][][] } {
  const ring: Point[] = vertices.map(([lat, lng]) => [lng, lat]);
  if (signedArea(ring) < 0) ring.reverse();
  ring.push([ring[0][0], ring[0][1]]);
  return { type: "Polygon", coordinates: [ring] };
}

function signedArea(ring: Point[]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return area / 2;
}

async function searchScenes(
  vertices: LatLng[],
  lookbackDays: number,
  maxCloud: number,
  limit: number,
  until?: Date,
): Promise<StacItem[]> {
  const end = until ?? new Date();
  const start = new Date(end.getTime() - lookbackDays * 86_400_000);
  const query = {
    collections: [COLLECTION],
    intersects: toGeoJsonPolygon(vertices),
    datetime: `${start.toISOString()}/${end.toISOString()}`,
    query: { "eo:cloud_cover": { lt: maxCloud } },
    sortby: [{ field: "properties.datetime", direction: "desc" }],
    limit,
  };
  const payload = await withTimeout("Sentinel-2 scene search", async (signal) => {
    const response = await fetch(STAC_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/geo+json" },
      body: JSON.stringify(query),
      signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200).trim();
      throw new Error(`STAC API responded with HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    return (await response.json()) as { features?: unknown };
  });
  if (!Array.isArray(payload.features)) {
    throw new Error("Sentinel-2 scene search returned an unexpected response");
  }
  return (payload.features as StacItem[])
    .filter((item) => item && typeof item.id === "string" && item.properties && item.assets)
    .sort((a, b) => Date.parse(b.properties.datetime) - Date.parse(a.properties.datetime))
    .slice(0, limit);
}

async function evaluateScene(item: StacItem, vertices: LatLng[]): Promise<NdviResult | null> {
  const red = requireAsset(item, "red");
  const nir = requireAsset(item, "nir");
  const scl = requireAsset(item, "scl");
  const toUtm: Converter = proj4("EPSG:4326", utmProjection(sceneEpsg(item, red)));

  const [redImage, nirImage, sclImage] = await Promise.all([
    openImage(red.href, "red band"),
    openImage(nir.href, "NIR band"),
    openImage(scl.href, "scene classification"),
  ]);
  const grid = imageGrid(redImage);
  if (!sameGrid(grid, imageGrid(nirImage))) {
    throw new Error(`Red and NIR rasters of scene ${item.id} are not aligned`);
  }
  const sclGrid = imageGrid(sclImage);

  const ring = vertices.map(([lat, lng]) => toUtm.forward([lng, lat]));
  const searchWindow = windowForExtent(grid, extentOf(ring), WINDOW_PADDING);
  const mask = fieldMask(ring, grid, searchWindow);
  if (mask.insideCount === 0) {
    throw new FieldPolygonError("Field polygon is too small: it does not contain the centre of any 10 m pixel");
  }
  const window = clampWindow(searchWindow, grid);
  const sclWindow = window && clampWindow(windowForExtent(sclGrid, windowExtent(grid, window), 0), sclGrid);
  if (!window || !sclWindow) throw new Error(`Field lies outside the footprint of scene ${item.id}`);

  const [redData, nirData, sclData] = await Promise.all([
    readBand(redImage, window, "red band"),
    readBand(nirImage, window, "NIR band"),
    readBand(sclImage, sclWindow, "scene classification"),
  ]);
  const rasters: FieldRasters = {
    grid,
    window,
    red: redData,
    nir: nirData,
    redScaling: bandScaling(red, item),
    nirScaling: bandScaling(nir, item),
    sclGrid,
    sclWindow,
    scl: sclData,
  };

  const ndvi = fieldNdvi(mask, rasters);
  const stats = summarise(ndvi, mask.insideCount);
  if (stats.validPixelRatio < MIN_VALID_RATIO) return null;

  const bounds = windowBounds(grid, window, toUtm);
  return {
    sceneId: item.id,
    sceneDate: new Date(item.properties.datetime).toISOString(),
    cloudCover: round(item.properties["eo:cloud_cover"] ?? 0, 2),
    meanNdvi: round(stats.mean),
    minNdvi: round(stats.min),
    maxNdvi: round(stats.max),
    validPixelRatio: round(stats.validPixelRatio),
    pixelCount: stats.pixelCount,
    pixelSizeM: Math.abs(grid.resX),
    bounds,
    png: renderHeatmap(ndvi, grid, window, bounds, toUtm),
    zones: stats.zones,
  };
}

function requireAsset(item: StacItem, key: "red" | "nir" | "scl"): StacAsset {
  const asset = item.assets[key];
  if (!asset?.href) throw new Error(`Scene ${item.id} has no "${key}" asset`);
  return asset;
}

function sceneEpsg(item: StacItem, asset: StacAsset): number {
  const epsg = asset["proj:epsg"] ?? item.properties["proj:epsg"];
  if (typeof epsg === "number") return epsg;
  const code = asset["proj:code"] ?? item.properties["proj:code"];
  const match = typeof code === "string" ? /^EPSG:(\d+)$/i.exec(code) : null;
  if (match) return Number(match[1]);
  throw new Error(`Scene ${item.id} does not declare its projection (proj:epsg / proj:code)`);
}

function utmProjection(epsg: number): string {
  const north = epsg >= 32601 && epsg <= 32660;
  const south = epsg >= 32701 && epsg <= 32760;
  if (!north && !south) {
    throw new Error(`Unsupported scene projection EPSG:${epsg}; expected a WGS 84 UTM zone`);
  }
  return `+proj=utm +zone=${epsg % 100}${south ? " +south" : ""} +datum=WGS84 +units=m +no_defs`;
}

function bandScaling(asset: StacAsset, item: StacItem): BandScaling {
  const band = asset["raster:bands"]?.[0];
  const scale = band?.scale ?? 0.0001;
  // Earth Search already subtracts the baseline 04.00+ BOA offset (DN + 1000) from the pixels when
  // this flag is set, while raster:bands still advertises -0.1; applying it again drives red negative.
  if (item.properties["earthsearch:boa_offset_applied"] === true) return { scale, offset: 0 };
  if (band?.offset !== undefined) return { scale, offset: band.offset };
  const baseline = Number.parseFloat(item.properties["s2:processing_baseline"] ?? "0");
  return { scale, offset: baseline >= 4 ? -0.1 : 0 };
}

async function openImage(url: string, label: string): Promise<GeoTIFFImage> {
  return withTimeout(`Opening ${label} image`, async (signal) => {
    const tiff = await fromUrl(url, { allowFullFile: false }, signal);
    return tiff.getImage(0);
  });
}

async function readBand(image: GeoTIFFImage, window: PixelWindow, label: string): Promise<TypedArray> {
  return withTimeout(`Reading ${label} pixels`, async (signal) => {
    const rasters = await image.readRasters({
      window: [window.col0, window.row0, window.col1, window.row1],
      samples: [0],
      interleave: false,
      signal,
    });
    const band = rasters[0];
    if (!band) throw new Error("no pixel data returned");
    return band;
  });
}

function imageGrid(image: GeoTIFFImage): Grid {
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  return { originX, originY, resX, resY, width: image.getWidth(), height: image.getHeight() };
}

function sameGrid(a: Grid, b: Grid): boolean {
  return (
    a.originX === b.originX &&
    a.originY === b.originY &&
    a.resX === b.resX &&
    a.resY === b.resY &&
    a.width === b.width &&
    a.height === b.height
  );
}

function extentOf(points: Point[]): Extent {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function windowForExtent(grid: Grid, extent: Extent, padding: number): PixelWindow {
  const colA = (extent.minX - grid.originX) / grid.resX;
  const colB = (extent.maxX - grid.originX) / grid.resX;
  const rowA = (extent.minY - grid.originY) / grid.resY;
  const rowB = (extent.maxY - grid.originY) / grid.resY;
  return {
    col0: Math.floor(Math.min(colA, colB)) - padding,
    row0: Math.floor(Math.min(rowA, rowB)) - padding,
    col1: Math.ceil(Math.max(colA, colB)) + padding,
    row1: Math.ceil(Math.max(rowA, rowB)) + padding,
  };
}

function windowExtent(grid: Grid, window: PixelWindow): Extent {
  const xA = grid.originX + window.col0 * grid.resX;
  const xB = grid.originX + window.col1 * grid.resX;
  const yA = grid.originY + window.row0 * grid.resY;
  const yB = grid.originY + window.row1 * grid.resY;
  return { minX: Math.min(xA, xB), minY: Math.min(yA, yB), maxX: Math.max(xA, xB), maxY: Math.max(yA, yB) };
}

function clampWindow(window: PixelWindow, grid: Grid): PixelWindow | null {
  const clamped = {
    col0: Math.max(0, window.col0),
    row0: Math.max(0, window.row0),
    col1: Math.min(grid.width, window.col1),
    row1: Math.min(grid.height, window.row1),
  };
  return clamped.col1 > clamped.col0 && clamped.row1 > clamped.row0 ? clamped : null;
}

function pointInPolygon(x: number, y: number, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Built on the unclamped window so field pixels beyond the image edge still count towards the total.
function fieldMask(ring: Point[], grid: Grid, window: PixelWindow): FieldMask {
  const width = window.col1 - window.col0;
  const height = window.row1 - window.row0;
  const inside = new Uint8Array(width * height);
  let insideCount = 0;
  for (let row = 0; row < height; row++) {
    const y = grid.originY + (window.row0 + row + 0.5) * grid.resY;
    for (let col = 0; col < width; col++) {
      const x = grid.originX + (window.col0 + col + 0.5) * grid.resX;
      if (!pointInPolygon(x, y, ring)) continue;
      inside[row * width + col] = 1;
      insideCount += 1;
    }
  }
  return { window, inside, insideCount };
}

function fieldNdvi(mask: FieldMask, rasters: FieldRasters): Float32Array {
  const { grid, window } = rasters;
  const width = window.col1 - window.col0;
  const height = window.row1 - window.row0;
  const maskWidth = mask.window.col1 - mask.window.col0;
  const ndvi = new Float32Array(width * height).fill(Number.NaN);
  for (let row = 0; row < height; row++) {
    const imageRow = window.row0 + row;
    const y = grid.originY + (imageRow + 0.5) * grid.resY;
    for (let col = 0; col < width; col++) {
      const imageCol = window.col0 + col;
      const maskIndex = (imageRow - mask.window.row0) * maskWidth + (imageCol - mask.window.col0);
      if (!mask.inside[maskIndex]) continue;
      const x = grid.originX + (imageCol + 0.5) * grid.resX;
      const index = row * width + col;
      const value = pixelNdvi(rasters, index, x, y);
      if (value !== null) ndvi[index] = value;
    }
  }
  return ndvi;
}

function pixelNdvi(rasters: FieldRasters, index: number, x: number, y: number): number | null {
  const redDn = rasters.red[index];
  const nirDn = rasters.nir[index];
  if (redDn === 0 || nirDn === 0 || !isClearSky(rasters, x, y)) return null;
  const red = redDn * rasters.redScaling.scale + rasters.redScaling.offset;
  const nir = nirDn * rasters.nirScaling.scale + rasters.nirScaling.offset;
  if (nir + red <= 0) return null;
  // A slightly negative reflectance after the offset can push the ratio beyond ±1.
  return clamp((nir - red) / (nir + red), -1, 1);
}

function isClearSky(rasters: FieldRasters, x: number, y: number): boolean {
  const { sclGrid, sclWindow, scl } = rasters;
  const col = Math.floor((x - sclGrid.originX) / sclGrid.resX) - sclWindow.col0;
  const row = Math.floor((y - sclGrid.originY) / sclGrid.resY) - sclWindow.row0;
  const width = sclWindow.col1 - sclWindow.col0;
  const height = sclWindow.row1 - sclWindow.row0;
  if (col < 0 || row < 0 || col >= width || row >= height) return false;
  return !INVALID_SCL_CLASSES.has(scl[row * width + col]);
}

function summarise(ndvi: Float32Array, insideCount: number): NdviStats {
  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let low = 0;
  let high = 0;
  for (const value of ndvi) {
    if (Number.isNaN(value)) continue;
    count += 1;
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (value < 0.3) low += 1;
    else if (value > 0.6) high += 1;
  }
  const share = (part: number) => (count > 0 ? round(part / count) : 0);
  return {
    pixelCount: count,
    validPixelRatio: insideCount > 0 ? count / insideCount : 0,
    mean: count > 0 ? sum / count : 0,
    min: count > 0 ? min : 0,
    max: count > 0 ? max : 0,
    zones: { low: share(low), medium: share(count - low - high), high: share(high) },
  };
}

function windowBounds(grid: Grid, window: PixelWindow, toUtm: Converter): Bounds {
  const { minX, minY, maxX, maxY } = windowExtent(grid, window);
  const corners: Point[] = [
    toUtm.inverse([minX, minY]),
    toUtm.inverse([minX, maxY]),
    toUtm.inverse([maxX, minY]),
    toUtm.inverse([maxX, maxY]),
  ];
  const lngs = corners.map(([lng]) => lng);
  const lats = corners.map(([, lat]) => lat);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function overlaySize(window: PixelWindow, bounds: Bounds): { width: number; height: number } {
  const [[south, west], [north, east]] = bounds;
  const groundWidth = (east - west) * Math.cos((((south + north) / 2) * Math.PI) / 180);
  const groundHeight = north - south;
  const windowLongSide = Math.max(window.col1 - window.col0, window.row1 - window.row0);
  const longSide = clamp(windowLongSide * OVERLAY_UPSCALE, OVERLAY_MIN_SIDE, OVERLAY_MAX_SIDE);
  const aspect = groundWidth / groundHeight;
  return aspect >= 1
    ? { width: longSide, height: Math.max(1, Math.round(longSide / aspect)) }
    : { width: Math.max(1, Math.round(longSide * aspect)), height: longSide };
}

// Nearest-neighbour resampling of the UTM window onto the lat/lng grid Leaflet stretches across `bounds`.
function renderHeatmap(
  ndvi: Float32Array,
  grid: Grid,
  window: PixelWindow,
  bounds: Bounds,
  toUtm: Converter,
): Buffer {
  const [[south, west], [north, east]] = bounds;
  const { width, height } = overlaySize(window, bounds);
  const windowWidth = window.col1 - window.col0;
  const windowHeight = window.row1 - window.row0;
  const png = new PNG({ width, height });
  png.data.fill(0);
  for (let y = 0; y < height; y++) {
    const lat = north - ((y + 0.5) / height) * (north - south);
    for (let x = 0; x < width; x++) {
      const lng = west + ((x + 0.5) / width) * (east - west);
      const [px, py] = toUtm.forward([lng, lat]);
      const col = Math.floor((px - grid.originX) / grid.resX) - window.col0;
      const row = Math.floor((py - grid.originY) / grid.resY) - window.row0;
      if (col < 0 || row < 0 || col >= windowWidth || row >= windowHeight) continue;
      const value = ndvi[row * windowWidth + col];
      if (Number.isNaN(value)) continue;
      const [r, g, b] = rampColour(value);
      const offset = (y * width + x) * 4;
      png.data[offset] = r;
      png.data[offset + 1] = g;
      png.data[offset + 2] = b;
      png.data[offset + 3] = OVERLAY_ALPHA;
    }
  }
  return PNG.sync.write(png);
}

function rampColour(value: number): Rgb {
  const [firstStop, firstColour] = NDVI_RAMP[0];
  if (value <= firstStop) return firstColour;
  for (let i = 1; i < NDVI_RAMP.length; i++) {
    const [stop, colour] = NDVI_RAMP[i];
    if (value <= stop) {
      const [previousStop, previousColour] = NDVI_RAMP[i - 1];
      const t = (value - previousStop) / (stop - previousStop);
      const mix = (k: number) => Math.round(previousColour[k] + (colour[k] - previousColour[k]) * t);
      return [mix(0), mix(1), mix(2)];
    }
  }
  return NDVI_RAMP[NDVI_RAMP.length - 1][1];
}

async function withTimeout<T>(label: string, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS / 1000} s`));
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
  });
  const work = task(controller.signal).catch((error: unknown) => {
    throw new Error(`${label} failed: ${errorMessage(error)}`);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
