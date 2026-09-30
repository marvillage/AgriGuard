import { Router } from "express";
import multer from "multer";

import {
  createFarm,
  listFarms,
  getFarm,
  updateFarm,
  deleteFarm,
  setFarmPhoto,
  removeFarmPhoto,
} from "../controllers/farm.controller.js";

import {
  createField,
  listFields,
  getField,
  updateField,
  deleteField,
} from "../controllers/field.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";

import {
  createFarmSchema,
  updateFarmSchema,
  createFieldSchema,
  updateFieldSchema,
} from "../utils/validation.schemas.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware);

router.post(
  "/",
  requireRole("FARMER", "ADMIN"),
  validateBody(createFarmSchema),
  createFarm
);

router.get(
  "/",
  requireRole("FARMER", "AGRONOMIST", "ADMIN"),
  listFarms
);

router.get(
  "/:farmId",
  requireRole("FARMER", "AGRONOMIST", "ADMIN"),
  getFarm
);

router.patch(
  "/:farmId",
  requireRole("FARMER", "ADMIN"),
  validateBody(updateFarmSchema),
  updateFarm
);

router.delete(
  "/:farmId",
  requireRole("FARMER", "ADMIN"),
  deleteFarm
);

router.post(
  "/:farmId/photo",
  requireRole("FARMER", "ADMIN"),
  upload.single("photo"),
  setFarmPhoto
);

router.delete(
  "/:farmId/photo",
  requireRole("FARMER", "ADMIN"),
  removeFarmPhoto
);

/*
 * Field routes
 */

router.post(
  "/:farmId/fields",
  requireRole("FARMER", "ADMIN"),
  validateBody(createFieldSchema),
  createField
);

router.get(
  "/:farmId/fields",
  requireRole("FARMER", "AGRONOMIST", "ADMIN"),
  listFields
);

router.get(
  "/:farmId/fields/:fieldId",
  requireRole("FARMER", "AGRONOMIST", "ADMIN"),
  getField
);

router.patch(
  "/:farmId/fields/:fieldId",
  requireRole("FARMER", "ADMIN"),
  validateBody(updateFieldSchema),
  updateField
);

router.delete(
  "/:farmId/fields/:fieldId",
  requireRole("FARMER", "ADMIN"),
  deleteField
);

export default router;