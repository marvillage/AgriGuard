import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as fieldService from "../services/field.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";

const getUser = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  return req.user;
};

const getId = (
  value: string | string[] | undefined,
  label: string
) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`Invalid ${label} ID`, 400);
  }

  return id;
};

export const createField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farmId = getId(
      req.params.farmId,
      "farm"
    );

    const field = await fieldService.create(
      farmId,
      user,
      req.body
    );

    return sendSuccess(
      res,
      { field },
      "Field created successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

export const listFields = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farmId = getId(
      req.params.farmId,
      "farm"
    );

    const fields = await fieldService.list(
      farmId,
      user
    );

    return sendSuccess(
      res,
      { fields },
      "Fields retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const getField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farmId = getId(
      req.params.farmId,
      "farm"
    );

    const fieldId = getId(
      req.params.fieldId,
      "field"
    );

    const field = await fieldService.getById(
      farmId,
      fieldId,
      user
    );

    return sendSuccess(
      res,
      { field },
      "Field retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const updateField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farmId = getId(
      req.params.farmId,
      "farm"
    );

    const fieldId = getId(
      req.params.fieldId,
      "field"
    );

    const field = await fieldService.update(
      farmId,
      fieldId,
      user,
      req.body
    );

    return sendSuccess(
      res,
      { field },
      "Field updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const deleteField = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farmId = getId(
      req.params.farmId,
      "farm"
    );

    const fieldId = getId(
      req.params.fieldId,
      "field"
    );

    await fieldService.remove(
      farmId,
      fieldId,
      user
    );

    return sendSuccess(
      res,
      null,
      "Field deleted successfully"
    );
  } catch (error) {
    next(error);
  }
};