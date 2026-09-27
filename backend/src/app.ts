import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import farmRoutes from "./routes/farm.routes.js";
import fieldOpsRoutes from "./routes/field-ops.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import { devicesRouter, telemetryRouter } from "./routes/device.routes.js";
import { uploadsRoot } from "./services/scan.service.js";

const app = express();

app.disable("x-powered-by");
if (env.trustProxy > 0) app.set("trust proxy", env.trustProxy);

// Images in /uploads are loaded by the frontend from another origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
  });

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriGuard API is healthy",
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to AgriGuard API",
  });
});

app.use("/uploads", express.static(uploadsRoot, { maxAge: "7d", fallthrough: false }));

// Only credential attempts get the strict limit; /me runs on every page load.
app.use(["/api/auth/login", "/api/auth/register"], limiter(100));
app.use("/api/auth", limiter(3000), authRoutes);
app.use("/api/device", limiter(2000), telemetryRouter);
app.use("/api/farms", limiter(3000), farmRoutes);
app.use("/api/fields", limiter(3000), fieldOpsRoutes);
app.use("/api/devices", limiter(3000), devicesRouter);
app.use("/api", limiter(5000), platformRoutes);

app.use((_req, _res, next) => {
  next({
    statusCode: 404,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;
