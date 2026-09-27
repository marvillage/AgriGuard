import type { Request, Response, NextFunction } from "express";
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name, role, phone, language } = req.body;

    const result = await register(
      email,
      password,
      name,
      { role, phone, language }
    );

    return sendSuccess(
      res,
      result,
      "Registration successful",
      201
    );
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password);

    return sendSuccess(
      res,
      result,
      "Login successful"
    );
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const user = await getCurrentUser(req.user.id);

    return sendSuccess(
      res,
      { user },
      "Current user retrieved"
    );
  } catch (error) {
    next(error);
  }
};
export const updateMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const user = await updateProfile(req.user.id, req.body);

    return sendSuccess(
      res,
      { user },
      "Profile updated"
    );
  } catch (error) {
    next(error);
  }
};
