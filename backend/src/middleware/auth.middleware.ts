import type {
  Request,
  Response,
  NextFunction,
} from "express";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new AppError(
        "Authentication token is required",
        401
      );
    }

    if (!authorization.startsWith("Bearer ")) {
      throw new AppError(
        "Invalid authentication format",
        401
      );
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      throw new AppError(
        "Authentication token is required",
        401
      );
    }

    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(
        "Invalid or expired authentication token",
        401
      )
    );
  }
};