import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const errorMiddleware: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next
) => {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });

    return;
  }

  const statusCode =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : 500;

  const message =
    typeof err?.message === "string"
      ? err.message
      : "Internal server error";

  res.status(statusCode).json({
    success: false,
    message:
      env.nodeEnv === "production" && statusCode === 500
        ? "Internal server error"
        : message,
  });
};