import { Router } from "express";
import { validateBody } from "../middleware/validation.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as devices from "../services/device.service.js";
import { ingestTelemetry } from "../services/telemetry.service.js";
import { sendSuccess } from "../utils/response.js";
import { currentUser, idParam } from "../utils/request.js";
import { deviceUpdateSchema, telemetrySchema } from "../utils/validation.schemas.js";

// Called by the ESP32 field node; authenticated by its device key, not a user token.
export const telemetryRouter = Router();

telemetryRouter.post("/telemetry", validateBody(telemetrySchema), async (req, res) => {
  const result = await ingestTelemetry(req.header("x-device-key"), req.body);
  sendSuccess(res, result, "Telemetry received");
});

export const devicesRouter = Router();
devicesRouter.use(authMiddleware);

devicesRouter.get("/", async (req, res) => {
  sendSuccess(res, { devices: await devices.listDevices(currentUser(req)) });
});

devicesRouter.patch("/:deviceId", validateBody(deviceUpdateSchema), async (req, res) => {
  sendSuccess(res, { device: await devices.updateDevice(currentUser(req), idParam(req, "deviceId"), req.body) }, "Device updated");
});

devicesRouter.get("/:deviceId/key", async (req, res) => {
  sendSuccess(res, { device: await devices.revealDeviceKey(currentUser(req), idParam(req, "deviceId")) });
});

devicesRouter.post("/:deviceId/rotate-key", async (req, res) => {
  sendSuccess(res, { device: await devices.rotateDeviceKey(currentUser(req), idParam(req, "deviceId")) }, "Device key rotated");
});

devicesRouter.delete("/:deviceId", async (req, res) => {
  await devices.deleteDevice(currentUser(req), idParam(req, "deviceId"));
  sendSuccess(res, null, "Device removed");
});
