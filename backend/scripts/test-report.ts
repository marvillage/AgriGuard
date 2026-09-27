import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Runs the unit tests and records the counts for the app's Testing & validation page.
const root = resolve(import.meta.dirname, "..");
const run = spawnSync(
  process.execPath,
  ["--import", "tsx", "--import", "./test/setup-env.ts", "--test", "--test-reporter=spec", "test/**/*.test.ts"],
  { cwd: root, encoding: "utf8" }
);
const output = `${run.stdout}\n${run.stderr}`;
const count = (label: string) => Number(output.match(new RegExp(`ℹ ${label} (\\d+)`))?.[1] ?? NaN);
const report = {
  ranAt: new Date().toISOString(),
  node: process.version,
  total: count("tests"),
  passed: count("pass"),
  failed: count("fail"),
  durationMs: Math.round(count("duration_ms")),
  suites: ["agronomy", "ai", "engine", "fertilizer", "knowledge", "weather"],
};
if (!Number.isFinite(report.total)) {
  console.error(output);
  throw new Error("Could not read the test summary");
}
mkdirSync(resolve(root, "data", "validation"), { recursive: true });
writeFileSync(resolve(root, "data", "validation", "tests.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.passed}/${report.total} passed, ${report.failed} failed`);
process.exit(run.status ?? 1);
