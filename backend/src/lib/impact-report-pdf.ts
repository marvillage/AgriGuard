import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { fromRoot } from "../config/paths.js";

export interface ImpactReportData {
  farmName: string;
  ownerName: string;
  location: string | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  totals: {
    litresSaved: number;
    litresUsed: number;
    kwhSaved: number;
    co2Kg: number;
    rupeesSaved: number;
    ureaKgSaved: number;
    measuredShare: number;
  };
  monthly: Array<{ month: string; litresUsed: number; litresSaved: number; kwhSaved: number; co2Kg: number; rupeesSaved: number }>;
  fields: Array<{ name: string; areaAcres: number; crop: string | null; litresUsed: number; litresSaved: number; method: string }>;
  trials: Array<{ name: string; treatment: string; control: string; litresPerAcreTreatment: number; litresPerAcreControl: number; savingPct: number }>;
  ledger: { entries: number; firstHash: string | null; lastHash: string | null; verified: boolean };
  assumptions: string[];
  summary?: string | null;
}

type Doc = PDFKit.PDFDocument;
type Align = "left" | "right" | "center";
type Totals = ImpactReportData["totals"];
type MonthRow = ImpactReportData["monthly"][number];
type FieldRow = ImpactReportData["fields"][number];
type TrialRow = ImpactReportData["trials"][number];
type Ledger = ImpactReportData["ledger"];

interface TextStyle {
  font: string;
  size: number;
  color: string;
}

interface Layout {
  doc: Doc;
  y: number;
  left: number;
  width: number;
  top: number;
  bottom: number;
}

interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Column<T> {
  header: string;
  weight: number;
  align?: Align;
  wrap?: boolean;
  bold?: boolean;
  value?: (row: T) => string;
  draw?: (doc: Doc, row: T, cell: Cell) => void;
}

interface TableSpec<T> {
  title: string;
  columns: Column<T>[];
  rows: T[];
  totals?: string[];
}

interface KpiTile {
  label: string;
  value: string;
  caption: string;
}

const COLORS = {
  navy: "#0F1F4D",
  navyDark: "#0A1433",
  gold: "#FFC72C",
  goldSoft: "#FFF6DA",
  ink: "#0B0C0F",
  slate: "#64748B",
  bandMuted: "#C3CCE0",
  line: "#E2E8F0",
  zebra: "#F5F7FB",
  panel: "#F7F9FC",
  track: "#E4E9F2",
  white: "#FFFFFF",
  green: "#15803D",
  red: "#B91C1C",
} as const;

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
  mono: "Courier",
} as const;

const STYLES = {
  label: { font: FONTS.bold, size: 7, color: COLORS.slate },
  bandLabel: { font: FONTS.bold, size: 7, color: COLORS.gold },
  sectionTitle: { font: FONTS.bold, size: 12.5, color: COLORS.navy },
  caption: { font: FONTS.regular, size: 7.5, color: COLORS.slate },
  note: { font: FONTS.regular, size: 8, color: COLORS.slate },
  noteStrong: { font: FONTS.bold, size: 8, color: COLORS.navy },
  body: { font: FONTS.regular, size: 9, color: COLORS.ink },
  intro: { font: FONTS.regular, size: 8.5, color: COLORS.slate },
  kpiValue: { font: FONTS.bold, size: 17, color: COLORS.navy },
  tableHeader: { font: FONTS.bold, size: 7.5, color: COLORS.white },
  cell: { font: FONTS.regular, size: 8.5, color: COLORS.ink },
  cellBold: { font: FONTS.bold, size: 8.5, color: COLORS.navy },
  continued: { font: FONTS.bold, size: 9, color: COLORS.slate },
  empty: { font: FONTS.italic, size: 9, color: COLORS.slate },
  mono: { font: FONTS.mono, size: 9.5, color: COLORS.ink },
  pill: { font: FONTS.bold, size: 9, color: COLORS.white },
  footer: { font: FONTS.regular, size: 8, color: COLORS.slate },
  footerBrand: { font: FONTS.bold, size: 8, color: COLORS.navy },
} satisfies Record<string, TextStyle>;

const MARGIN = 48;
const FOOTER_OFFSET = 31;
const SECTION_GAP = 18;
const TABLE = { headerHeight: 22, rowHeight: 19, padX: 6, padY: 5, maxLines: 2 } as const;
const EMPTY_TEXT = "No data for this period";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const REPLACEMENTS: Record<string, string> = { "≈": "~", "≥": ">=", "≤": "<=", "→": "->", "−": "-", "\t": " ", "\r": "" };
const LOGO_PATH = fromRoot("assets", "logo-mark.png");

const integerFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimalFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const areaFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export async function renderImpactPdf(data: ImpactReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `AgriGuard Resource Impact Report - ${data.farmName}`,
      Author: "AgriGuard",
      Subject: "Resource Impact Report",
      CreationDate: parseDate(data.generatedAt) ?? new Date(),
    },
  });
  const output = collect(doc);
  const layout = createLayout(doc);

  drawHeader(layout, data);
  drawKpis(layout, data.totals);
  if (data.summary) drawSummary(layout, data.summary);
  drawMonthly(layout, data.monthly);
  drawFields(layout, data.fields);
  if (data.trials.length > 0) drawTrials(layout, data.trials);
  drawLedger(layout, data.ledger);
  drawAssumptions(layout, data.assumptions);
  drawFooters(doc);

  doc.end();
  return output;
}

function collect(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function createLayout(doc: Doc): Layout {
  const { margins, width, height } = doc.page;
  return {
    doc,
    y: margins.top,
    left: margins.left,
    width: width - margins.left - margins.right,
    top: margins.top,
    bottom: height - margins.bottom,
  };
}

function ensureSpace(layout: Layout, needed: number): boolean {
  if (layout.y + needed <= layout.bottom) return false;
  layout.doc.addPage();
  layout.y = layout.top;
  return true;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, finite(value)));
}

function formatInt(value: number): string {
  return integerFormat.format(Math.round(finite(value)) || 0);
}

function formatQuantity(value: number): string {
  const amount = finite(value);
  if (amount === 0) return "0";
  return Math.abs(amount) >= 100 ? formatInt(amount) : oneDecimalFormat.format(amount);
}

function formatLitresCompact(value: number): string {
  const amount = finite(value);
  return Math.abs(amount) >= 100000 ? `${oneDecimalFormat.format(amount / 100000)} lakh L` : `${formatInt(amount)} L`;
}

function formatCo2(value: number): string {
  const amount = finite(value);
  return Math.abs(amount) >= 1000 ? `${twoDecimalFormat.format(amount / 1000)} t` : `${formatQuantity(amount)} kg`;
}

function formatRupees(value: number): string {
  return `Rs ${formatInt(value)}`;
}

function formatShare(ratio: number): string {
  return `${Math.round(finite(ratio) * 100)}%`;
}

function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  const name = match ? MONTH_NAMES[Number(match[2]) - 1] : undefined;
  return match && name ? `${name} ${match[1]}` : value;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toCalendarDate(value: string): Date | null {
  const date = parseDate(value);
  if (!date) return null;
  return DATE_ONLY.test(value) ? date : new Date(date.getTime() + IST_OFFSET_MS);
}

function calendarLabel(date: Date): string {
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDate(value: string): string {
  const date = toCalendarDate(value);
  return date ? calendarLabel(date) : value;
}

function formatDateTime(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  const local = new Date(date.getTime() + IST_OFFSET_MS);
  const hours = String(local.getUTCHours()).padStart(2, "0");
  const minutes = String(local.getUTCMinutes()).padStart(2, "0");
  return `${calendarLabel(local)}, ${hours}:${minutes} IST`;
}

function periodDays(start: string, end: string): number | null {
  const from = toCalendarDate(start);
  const to = toCalendarDate(end);
  if (!from || !to) return null;
  const days = Math.round((Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) / DAY_MS) + 1;
  return days > 0 ? days : null;
}

function humanize(value: string): string {
  if (!/^[a-z0-9_-]+$/.test(value)) return value;
  const spaced = value.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return hash.length > 16 ? `${hash.slice(0, 16)}…` : hash;
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + finite(pick(row)), 0);
}

function clean(value: string): string {
  return value
    .replace(/₹\s*/gu, "Rs ")
    .replace(/[₀-₉]/gu, (digit) => String(digit.charCodeAt(0) - 0x2080))
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/gu, (char) => REPLACEMENTS[char] ?? (WIN_ANSI_EXTRAS.includes(char) ? char : "?"));
}

function applyStyle(doc: Doc, style: TextStyle): Doc {
  return doc.font(style.font).fontSize(style.size).fillColor(style.color);
}

function fitToWidth(doc: Doc, text: string, width: number, spacing: number): string {
  const measure = (candidate: string) => doc.widthOfString(candidate, { characterSpacing: spacing });
  if (measure(text) <= width) return text;
  let end = text.length;
  while (end > 0 && measure(`${text.slice(0, end).trimEnd()}…`) > width) end -= 1;
  return end > 0 ? `${text.slice(0, end).trimEnd()}…` : "";
}

function writeLine(doc: Doc, value: string, x: number, y: number, width: number, style: TextStyle, align: Align = "left", spacing = 0): void {
  applyStyle(doc, style);
  const text = fitToWidth(doc, clean(value), width, spacing);
  const textWidth = doc.widthOfString(text, { characterSpacing: spacing });
  const offset = align === "right" ? width - textWidth : align === "center" ? (width - textWidth) / 2 : 0;
  doc.text(text, x + Math.max(0, offset), y, { lineBreak: false, characterSpacing: spacing });
}

function drawHeader(layout: Layout, data: ImpactReportData): void {
  const { doc, left, width } = layout;
  const top = layout.y;
  const logoSize = 46;
  const brandX = left + logoSize + 12;

  if (existsSync(LOGO_PATH)) doc.image(LOGO_PATH, left, top, { width: logoSize, height: logoSize });
  writeLine(doc, "AgriGuard", brandX, top + 5, 220, { font: FONTS.bold, size: 21, color: COLORS.navy });
  writeLine(doc, "Resource Impact Report", brandX, top + 30, 220, { font: FONTS.regular, size: 11, color: COLORS.slate });
  writeLine(doc, "GENERATED", left, top + 10, width, STYLES.label, "right", 0.8);
  writeLine(doc, formatDateTime(data.generatedAt), left, top + 21, width, { font: FONTS.regular, size: 9, color: COLORS.ink }, "right");
  doc.rect(left, top + 58, width, 2.5).fill(COLORS.gold);

  drawFarmBand(layout, data, top + 70);
}

function drawFarmBand(layout: Layout, data: ImpactReportData, y: number): void {
  const { doc, left, width } = layout;
  const height = 66;
  const inset = 18;
  const periodWidth = 170;
  const infoWidth = width - periodWidth - inset * 3;
  const periodX = left + width - inset - periodWidth;
  const owner = data.location ? `Owner: ${data.ownerName}  ·  ${data.location}` : `Owner: ${data.ownerName}`;
  const days = periodDays(data.periodStart, data.periodEnd);

  doc.roundedRect(left, y, width, height, 6).fill(COLORS.navyDark);
  writeLine(doc, "FARM", left + inset, y + 13, infoWidth, STYLES.bandLabel, "left", 0.8);
  writeLine(doc, data.farmName, left + inset, y + 24, infoWidth, { font: FONTS.bold, size: 15, color: COLORS.white });
  writeLine(doc, owner, left + inset, y + 45, infoWidth, { font: FONTS.regular, size: 9, color: COLORS.bandMuted });
  writeLine(doc, "REPORTING PERIOD", periodX, y + 13, periodWidth, STYLES.bandLabel, "right", 0.8);
  writeLine(doc, `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`, periodX, y + 25, periodWidth, { font: FONTS.bold, size: 11, color: COLORS.white }, "right");
  if (days) writeLine(doc, `${formatInt(days)} days`, periodX, y + 45, periodWidth, { font: FONTS.regular, size: 9, color: COLORS.bandMuted }, "right");

  layout.y = y + height + 22;
}

function drawSectionTitle(layout: Layout, title: string, subtitle: string | null, keepWith: number): void {
  ensureSpace(layout, 24 + keepWith);
  const { doc, left, width, y } = layout;

  doc.rect(left, y + 1, 3, 13).fill(COLORS.gold);
  writeLine(doc, title, left + 10, y + 1, width - 10, STYLES.sectionTitle);
  if (subtitle) {
    applyStyle(doc, STYLES.sectionTitle);
    const available = width - doc.widthOfString(title) - 30;
    if (available > 40) writeLine(doc, subtitle, left + width - available, y + 5, available, STYLES.caption, "right");
  }

  layout.y += 24;
}

function drawEmptyState(layout: Layout): void {
  const height = 30;
  ensureSpace(layout, height);
  const { doc, left, width, y } = layout;

  doc.rect(left, y, width, height).lineWidth(0.5).fillAndStroke(COLORS.panel, COLORS.line);
  writeLine(doc, EMPTY_TEXT, left, y + (height - 10) / 2, width, STYLES.empty, "center");

  layout.y += height;
}

function drawKpis(layout: Layout, totals: Totals): void {
  const gap = 10;
  const tileHeight = 64;
  const columns = 3;
  const tiles = kpiTiles(totals);
  const rows = Math.ceil(tiles.length / columns);
  const gridHeight = rows * tileHeight + (rows - 1) * gap;

  drawSectionTitle(layout, "Impact summary", "Totals for the reporting period", gridHeight + 30);
  const tileWidth = (layout.width - gap * (columns - 1)) / columns;
  tiles.forEach((tile, index) => {
    const x = layout.left + (index % columns) * (tileWidth + gap);
    const y = layout.y + Math.floor(index / columns) * (tileHeight + gap);
    drawKpiTile(layout.doc, { x, y, width: tileWidth, height: tileHeight }, tile);
  });

  layout.y += gridHeight + 12;
  drawMeasuredNote(layout, totals.measuredShare);
}

function kpiTiles(totals: Totals): KpiTile[] {
  const baseline = finite(totals.litresUsed) + finite(totals.litresSaved);
  const reduction = baseline > 0 ? `  ·  ${formatShare(finite(totals.litresSaved) / baseline)} below baseline` : "";
  const inTonnes = Math.abs(finite(totals.co2Kg)) >= 1000;

  return [
    { label: "Water saved", value: formatLitresCompact(totals.litresSaved), caption: `${formatInt(totals.litresSaved)} L${reduction}` },
    { label: "Water used", value: formatLitresCompact(totals.litresUsed), caption: `${formatInt(totals.litresUsed)} litres applied` },
    { label: "Pump energy saved", value: `${formatQuantity(totals.kwhSaved)} kWh`, caption: "Electricity not drawn by pumps" },
    { label: "CO2 avoided", value: formatCo2(totals.co2Kg), caption: inTonnes ? `${formatInt(totals.co2Kg)} kg CO2` : "Emissions avoided" },
    { label: "Money saved", value: formatRupees(totals.rupeesSaved), caption: "Cost avoided this period" },
    { label: "Fertiliser saved", value: `${formatQuantity(totals.ureaKgSaved)} kg`, caption: "Urea, DAP and MOP avoided" },
  ];
}

function drawKpiTile(doc: Doc, cell: Cell, tile: KpiTile): void {
  const inset = 12;
  const innerWidth = cell.width - inset * 2;

  doc.roundedRect(cell.x, cell.y, cell.width, cell.height, 6).lineWidth(0.75).fillAndStroke(COLORS.panel, COLORS.line);
  doc.rect(cell.x + inset, cell.y + 10, 16, 2.5).fill(COLORS.gold);
  writeLine(doc, tile.label.toUpperCase(), cell.x + inset, cell.y + 17, innerWidth, STYLES.label, "left", 0.6);
  writeLine(doc, tile.value, cell.x + inset, cell.y + 28, innerWidth, STYLES.kpiValue);
  writeLine(doc, tile.caption, cell.x + inset, cell.y + 49, innerWidth, STYLES.caption);
}

function drawMeasuredNote(layout: Layout, measuredShare: number): void {
  const { doc, left, width, y } = layout;
  const share = clamp01(measuredShare);
  const barWidth = 48;
  const percent = formatShare(share);
  const textX = left + barWidth + 10;

  doc.roundedRect(left, y + 1.5, barWidth, 6, 3).fill(COLORS.track);
  if (share > 0) doc.roundedRect(left, y + 1.5, Math.max(6, barWidth * share), 6, 3).fill(COLORS.navy);
  applyStyle(doc, STYLES.noteStrong);
  const percentWidth = doc.widthOfString(percent);
  writeLine(doc, percent, textX, y, percentWidth + 1, STYLES.noteStrong);
  writeLine(doc, " of savings measured by on-farm flow and energy meters; the rest estimated from pump run-time.", textX + percentWidth, y, left + width - textX - percentWidth, STYLES.note);

  layout.y += 10 + SECTION_GAP + 6;
}

function columnWidths<T>(columns: Column<T>[], total: number): number[] {
  const weights = columns.reduce((acc, column) => acc + column.weight, 0);
  return columns.map((column) => (column.weight / weights) * total);
}

function lineLimit(doc: Doc): number {
  return doc.currentLineHeight(true) * TABLE.maxLines + 0.5;
}

function textHeight(doc: Doc, value: string, width: number, wrap: boolean): number {
  if (!wrap || !value) return doc.currentLineHeight(true);
  return Math.min(doc.heightOfString(clean(value), { width }), lineLimit(doc));
}

function drawCellText(doc: Doc, value: string, cell: Cell, style: TextStyle, align: Align, wrap: boolean): void {
  const innerX = cell.x + TABLE.padX;
  const innerWidth = cell.width - TABLE.padX * 2;
  applyStyle(doc, style);
  const top = cell.y + (cell.height - textHeight(doc, value, innerWidth, wrap)) / 2 + 0.5;

  if (wrap) {
    doc.text(clean(value), innerX, top, { width: innerWidth, height: lineLimit(doc), ellipsis: true, align });
  } else {
    writeLine(doc, value, innerX, top, innerWidth, style, align);
  }
}

function measureRow<T>(doc: Doc, columns: Column<T>[], widths: number[], values: string[], style: TextStyle): number {
  applyStyle(doc, style);
  return columns.reduce<number>((height, column, index) => {
    if (!column.wrap) return height;
    return Math.max(height, textHeight(doc, values[index], widths[index] - TABLE.padX * 2, true) + TABLE.padY * 2);
  }, TABLE.rowHeight);
}

function drawTableHeader<T>(layout: Layout, columns: Column<T>[], widths: number[]): void {
  const { doc, left, width } = layout;
  applyStyle(doc, STYLES.tableHeader);
  const height = columns.reduce<number>(
    (max, column, index) => Math.max(max, textHeight(doc, column.header, widths[index] - TABLE.padX * 2, true) + TABLE.padY * 2),
    TABLE.headerHeight,
  );

  doc.rect(left, layout.y, width, height).fill(COLORS.navy);
  let x = left;
  columns.forEach((column, index) => {
    drawCellText(doc, column.header, { x, y: layout.y, width: widths[index], height }, STYLES.tableHeader, column.align ?? "left", true);
    x += widths[index];
  });

  layout.y += height;
}

function breakTableIfNeeded<T>(layout: Layout, spec: TableSpec<T>, widths: number[], height: number): void {
  if (!ensureSpace(layout, height)) return;
  writeLine(layout.doc, `${spec.title} (continued)`, layout.left, layout.y, layout.width, STYLES.continued);
  layout.y += 16;
  drawTableHeader(layout, spec.columns, widths);
}

function drawRowCells<T>(layout: Layout, columns: Column<T>[], widths: number[], values: string[], height: number, row: T | null, totals: boolean): void {
  const { doc } = layout;
  let x = layout.left;
  columns.forEach((column, index) => {
    const cell = { x, y: layout.y, width: widths[index], height };
    if (column.draw) {
      if (row) column.draw(doc, row, cell);
    } else {
      const style = totals || column.bold ? STYLES.cellBold : STYLES.cell;
      drawCellText(doc, values[index], cell, style, column.align ?? "left", Boolean(column.wrap));
    }
    x += widths[index];
  });
}

function drawTable<T>(layout: Layout, spec: TableSpec<T>): void {
  const { doc } = layout;
  const widths = columnWidths(spec.columns, layout.width);
  drawTableHeader(layout, spec.columns, widths);

  if (spec.rows.length === 0) {
    drawEmptyState(layout);
    layout.y += SECTION_GAP;
    return;
  }

  spec.rows.forEach((row, index) => {
    const values = spec.columns.map((column) => (column.value ? column.value(row) : ""));
    const height = measureRow(doc, spec.columns, widths, values, STYLES.cell);
    breakTableIfNeeded(layout, spec, widths, height);
    if (index % 2 === 1) doc.rect(layout.left, layout.y, layout.width, height).fill(COLORS.zebra);
    drawRowCells(layout, spec.columns, widths, values, height, row, false);
    layout.y += height;
    doc.moveTo(layout.left, layout.y).lineTo(layout.left + layout.width, layout.y).lineWidth(0.5).strokeColor(COLORS.line).stroke();
  });

  if (spec.totals) {
    const height = TABLE.rowHeight + 2;
    breakTableIfNeeded(layout, spec, widths, height);
    doc.rect(layout.left, layout.y, layout.width, height).fill(COLORS.goldSoft);
    doc.moveTo(layout.left, layout.y).lineTo(layout.left + layout.width, layout.y).lineWidth(1).strokeColor(COLORS.navy).stroke();
    drawRowCells(layout, spec.columns, widths, spec.totals, height, null, true);
    layout.y += height;
  }

  layout.y += SECTION_GAP;
}

function tableKeepWith(rows: number): number {
  return TABLE.headerHeight + (rows > 0 ? TABLE.rowHeight * Math.min(rows, 2) : 30);
}

function drawBar(doc: Doc, cell: Cell, ratio: number): void {
  const barHeight = 7;
  const x = cell.x + TABLE.padX;
  const width = cell.width - TABLE.padX * 2;
  const y = cell.y + (cell.height - barHeight) / 2;
  const filled = width * clamp01(ratio);

  doc.roundedRect(x, y, width, barHeight, 2).fill(COLORS.track);
  if (filled > 0.5) doc.roundedRect(x, y, Math.max(filled, 3), barHeight, 2).fill(COLORS.navy);
}

function drawMonthly(layout: Layout, monthly: MonthRow[]): void {
  const peak = Math.max(1, ...monthly.map((row) => finite(row.litresSaved)));
  const columns: Column<MonthRow>[] = [
    { header: "Month", weight: 70, bold: true, value: (row) => formatMonth(row.month) },
    { header: "Water used (L)", weight: 80, align: "right", value: (row) => formatInt(row.litresUsed) },
    { header: "Water saved (L)", weight: 80, align: "right", value: (row) => formatInt(row.litresSaved) },
    { header: "", weight: 100, draw: (doc, row, cell) => drawBar(doc, cell, finite(row.litresSaved) / peak) },
    { header: "kWh saved", weight: 55, align: "right", value: (row) => formatQuantity(row.kwhSaved) },
    { header: "CO2 (kg)", weight: 52, align: "right", value: (row) => formatQuantity(row.co2Kg) },
    { header: "Rs saved", weight: 62, align: "right", value: (row) => formatInt(row.rupeesSaved) },
  ];
  const totals = [
    "Total",
    formatInt(sum(monthly, (row) => row.litresUsed)),
    formatInt(sum(monthly, (row) => row.litresSaved)),
    "",
    formatQuantity(sum(monthly, (row) => row.kwhSaved)),
    formatQuantity(sum(monthly, (row) => row.co2Kg)),
    formatInt(sum(monthly, (row) => row.rupeesSaved)),
  ];

  drawSectionTitle(layout, "Monthly breakdown", "Water, pump energy, CO2 and money saved by month", tableKeepWith(monthly.length));
  drawTable(layout, { title: "Monthly breakdown", columns, rows: monthly, totals: monthly.length > 0 ? totals : undefined });
}

function drawFields(layout: Layout, fields: FieldRow[]): void {
  const columns: Column<FieldRow>[] = [
    { header: "Field", weight: 120, bold: true, wrap: true, value: (row) => row.name },
    { header: "Area (acres)", weight: 62, align: "right", value: (row) => areaFormat.format(finite(row.areaAcres)) },
    { header: "Crop", weight: 80, wrap: true, value: (row) => row.crop ?? "—" },
    { header: "Water used (L)", weight: 80, align: "right", value: (row) => formatInt(row.litresUsed) },
    { header: "Water saved (L)", weight: 80, align: "right", value: (row) => formatInt(row.litresSaved) },
    { header: "Method", weight: 90, wrap: true, value: (row) => humanize(row.method) },
  ];
  const totals = [
    "Total",
    areaFormat.format(sum(fields, (row) => row.areaAcres)),
    "",
    formatInt(sum(fields, (row) => row.litresUsed)),
    formatInt(sum(fields, (row) => row.litresSaved)),
    "",
  ];

  drawSectionTitle(layout, "Field performance", "Water use and savings by field", tableKeepWith(fields.length));
  drawTable(layout, { title: "Field performance", columns, rows: fields, totals: fields.length > 0 ? totals : undefined });
}

function drawTrials(layout: Layout, trials: TrialRow[]): void {
  const columns: Column<TrialRow>[] = [
    { header: "Trial", weight: 100, bold: true, wrap: true, value: (row) => row.name },
    { header: "Treatment", weight: 120, wrap: true, value: (row) => row.treatment },
    { header: "Control", weight: 105, wrap: true, value: (row) => row.control },
    { header: "Treatment\nL/acre", weight: 62, align: "right", value: (row) => formatInt(row.litresPerAcreTreatment) },
    { header: "Control\nL/acre", weight: 62, align: "right", value: (row) => formatInt(row.litresPerAcreControl) },
    { header: "Saving", weight: 50, align: "right", bold: true, value: (row) => `${oneDecimalFormat.format(finite(row.savingPct))}%` },
  ];

  drawSectionTitle(layout, "Field trials", "Treatment vs control, litres per acre", tableKeepWith(trials.length) + 8);
  drawTable(layout, { title: "Field trials", columns, rows: trials });
}

function drawLedger(layout: Layout, ledger: Ledger): void {
  const boxHeight = 84;
  const intro = "Each savings entry is hashed together with the entry before it, so any later change to a past record breaks the chain.";

  drawSectionTitle(layout, "Savings ledger", "Tamper-evident hash chain", boxHeight + 34);
  const { doc, left, width } = layout;
  applyStyle(doc, STYLES.intro);
  doc.text(clean(intro), left, layout.y, { width });
  layout.y += doc.heightOfString(clean(intro), { width }) + 8;

  const y = layout.y;
  const inset = 16;
  const entriesWidth = 110;
  const statusWidth = 170;
  const hashX = left + inset + entriesWidth + 16;
  const hashWidth = left + width - inset - statusWidth - 12 - hashX;

  doc.roundedRect(left, y, width, boxHeight, 6).lineWidth(0.75).fillAndStroke(COLORS.panel, COLORS.line);
  writeLine(doc, "ENTRIES", left + inset, y + 16, entriesWidth, STYLES.label, "left", 0.8);
  writeLine(doc, formatInt(ledger.entries), left + inset, y + 28, entriesWidth, { ...STYLES.kpiValue, size: 20 });
  writeLine(doc, "hash-linked records", left + inset, y + 55, entriesWidth, STYLES.caption);
  doc.moveTo(hashX - 12, y + 14).lineTo(hashX - 12, y + boxHeight - 14).lineWidth(0.5).strokeColor(COLORS.line).stroke();

  if (ledger.entries > 0) {
    writeLine(doc, "FIRST HASH", hashX, y + 16, hashWidth, STYLES.label, "left", 0.8);
    writeLine(doc, shortHash(ledger.firstHash), hashX, y + 27, hashWidth, STYLES.mono);
    writeLine(doc, "LAST HASH", hashX, y + 45, hashWidth, STYLES.label, "left", 0.8);
    writeLine(doc, shortHash(ledger.lastHash), hashX, y + 56, hashWidth, STYLES.mono);
  } else {
    writeLine(doc, EMPTY_TEXT, hashX, y + boxHeight / 2 - 5, hashWidth, STYLES.empty);
  }
  drawChainStatus(doc, ledger.verified, { x: left + width - inset - statusWidth, y: y + 18, width: statusWidth, height: 22 });

  layout.y = y + boxHeight + SECTION_GAP + 4;
}

function drawChainStatus(doc: Doc, verified: boolean, cell: Cell): void {
  const label = verified ? "Chain verified" : "Chain broken";
  const caption = verified ? "Checked when this report was generated" : "One or more entries failed verification";
  applyStyle(doc, STYLES.pill);
  const pillWidth = doc.widthOfString(label) + 32;
  const pillX = cell.x + cell.width - pillWidth;

  doc.roundedRect(pillX, cell.y, pillWidth, cell.height, cell.height / 2).fill(verified ? COLORS.green : COLORS.red);
  doc.circle(pillX + 12, cell.y + cell.height / 2, 3).fill(COLORS.white);
  writeLine(doc, label, pillX + 20, cell.y + (cell.height - 9) / 2 + 0.5, pillWidth - 22, STYLES.pill);
  writeLine(doc, caption, cell.x, cell.y + cell.height + 9, cell.width, STYLES.caption, "right");
}

function drawSummary(layout: Layout, summary: string): void {
  drawSectionTitle(layout, "Summary", null, 30);
  const { doc, left, width } = layout;
  const text = clean(summary);
  const options = { width, lineGap: 2 };
  applyStyle(doc, STYLES.body);
  const height = doc.heightOfString(text, options);
  ensureSpace(layout, height + 8);
  applyStyle(doc, STYLES.body);
  doc.text(text, left, layout.y, options);
  layout.y += height + 10;
}

function drawAssumptions(layout: Layout, assumptions: string[]): void {
  drawSectionTitle(layout, "Methodology & assumptions", null, 30);
  if (assumptions.length === 0) {
    drawEmptyState(layout);
    return;
  }

  const { doc, left, width } = layout;
  const indent = 14;
  const options = { width: width - indent, lineGap: 1.5 };
  assumptions.forEach((item) => {
    const text = clean(item);
    applyStyle(doc, STYLES.body);
    const height = doc.heightOfString(text, options);
    ensureSpace(layout, height + 6);
    doc.circle(left + 4, layout.y + 4.8, 2.2).fill(COLORS.gold);
    applyStyle(doc, STYLES.body);
    doc.text(text, left + indent, layout.y, options);
    layout.y += height + 6;
  });
}

function drawFooters(doc: Doc): void {
  const range = doc.bufferedPageRange();
  const brand = "AgriGuard";

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const { width, height, margins } = doc.page;
    const bottomMargin = margins.bottom;
    const left = margins.left;
    const contentWidth = width - margins.left - margins.right;
    const y = height - FOOTER_OFFSET;
    margins.bottom = 0;

    doc.moveTo(left, y - 7).lineTo(left + contentWidth, y - 7).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    applyStyle(doc, STYLES.footerBrand);
    const brandWidth = doc.widthOfString(brand);
    writeLine(doc, brand, left, y, brandWidth + 1, STYLES.footerBrand);
    writeLine(doc, " · Every drop measured.", left + brandWidth, y, 200, STYLES.footer);
    writeLine(doc, `Page ${index - range.start + 1} of ${range.count}`, left, y, contentWidth, STYLES.footer, "right");

    margins.bottom = bottomMargin;
  }
}
