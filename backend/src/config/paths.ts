import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Backend root = nearest folder with package.json, so paths work from src/ (tsx) and dist/ (tsc build).
function findRoot(start: string) {
  let current = start;
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(resolve(current, "package.json"))) return current;
    current = dirname(current);
  }
  return process.cwd();
}

export const backendRoot = findRoot(import.meta.dirname);

export const fromRoot = (...parts: string[]) => resolve(backendRoot, ...parts);
