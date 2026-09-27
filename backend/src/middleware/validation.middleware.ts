import type {
  Request,
  Response,
  NextFunction,
} from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

export const validateBody = <T>(
  schema: ZodType<T>
) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");

      next(new AppError(message, 400));
      return;
    }

    req.body = result.data;

    next();
  };
};