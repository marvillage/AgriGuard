import { Router } from "express";
import {
  registerController,
  loginController,
  meController,
  updateMeController,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from "../utils/validation.schemas.js";

const router = Router();

router.post(
  "/register",
  validateBody(registerSchema),
  registerController
);

router.post(
  "/login",
  validateBody(loginSchema),
  loginController
);

router.get(
  "/me",
  authMiddleware,
  meController
);

router.patch(
  "/me",
  authMiddleware,
  validateBody(profileSchema),
  updateMeController
);

export default router;