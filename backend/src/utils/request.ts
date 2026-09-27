import type { Request } from "express";
import { asLanguage, languages, type Language } from "../i18n/index.js";
import { AppError } from "./AppError.js";

export function currentUser(req: Request) {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user;
}

export function idParam(req: Request, name: string) {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`Invalid ${name}`, 400);
  return id;
}

export function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function languageOf(req: Request): Language | undefined {
  const value = req.query.lang ?? req.headers["x-language"];
  return typeof value === "string" && languages.includes(value as Language) ? asLanguage(value) : undefined;
}
