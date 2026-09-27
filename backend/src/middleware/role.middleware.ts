import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import type { UserRole } from "../utils/auth.types.js";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          "You do not have permission to access this resource",
          403
        )
      );
      return;
    }

    next();
  };
};