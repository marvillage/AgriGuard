import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import type { NextFunction, Request, Response } from "express";
import db from "../config/database.js";
import { fromRoot } from "../config/paths.js";

export const uploadsRoot = fromRoot("uploads");

// Files are written to disk and copied into the database, because hosts such as Render's free plan wipe the
// disk on every restart; a missing file is restored from the database the first time it is requested.
function pathFor(key: string) {
  const file = resolve(uploadsRoot, key);
  return file.startsWith(uploadsRoot + sep) ? file : null;
}

function writeCopy(file: string, bytes: Buffer) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
}

export async function saveUpload(key: string, bytes: Buffer, contentType: string) {
  const file = pathFor(key);
  if (!file) throw new Error(`Invalid upload key: ${key}`);
  writeCopy(file, bytes);
  const base64 = bytes.toString("base64");
  const existing = await db.orm.public.StoredFile.where({ key }).first();
  if (existing) await db.orm.public.StoredFile.where({ key }).updateAndCount({ contentType, base64 });
  else await db.orm.public.StoredFile.create({ key, contentType, base64 });
}

export async function deleteUploads(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;
  await db.orm.public.StoredFile.where((f) => f.key.in(unique)).deleteAndCount();
  for (const key of unique) {
    const file = pathFor(key);
    if (file && existsSync(file)) rmSync(file, { force: true });
  }
}

export async function serveStoredUpload(req: Request, res: Response, next: NextFunction) {
  const key = decodeURIComponent(req.path).replace(/^\/+/, "");
  const file = key ? pathFor(key) : null;
  if (!file) return next();
  const stored = await db.orm.public.StoredFile.where({ key }).first();
  if (!stored) return res.status(404).end();
  const bytes = Buffer.from(stored.base64, "base64");
  writeCopy(file, bytes);
  res.set({ "Content-Type": stored.contentType, "Cache-Control": "public, max-age=604800" }).send(bytes);
}
