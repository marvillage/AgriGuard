import type {
  Request,
  Response,
  NextFunction,
} from "express";

import * as farmService from "../services/farm.service.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";

const getUser = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  return req.user;
};

const getFarmId = (req: Request) => {
  const farmId = Number(req.params.farmId);

  if (!Number.isInteger(farmId) || farmId <= 0) {
    throw new AppError("Invalid farm ID", 400);
  }

  return farmId;
};

export const createFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farm = await farmService.create(
      user.id,
      req.body
    );

    return sendSuccess(
      res,
      { farm },
      "Farm created successfully",
      201
    );
  } catch (error) {
    next(error);
  }
};

export const listFarms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);

    const farms = await farmService.list(user);

    return sendSuccess(
      res,
      { farms },
      "Farms retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const getFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    const farmId = getFarmId(req);

    const farm = await farmService.getWithFields(
      farmId,
      user
    );

    return sendSuccess(
      res,
      { farm },
      "Farm retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const setFarmPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    const farmId = getFarmId(req);
    if (!req.file) {
      throw new AppError("Choose a photo to upload", 400);
    }

    const farm = await farmService.setPhoto(farmId, user, {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    return sendSuccess(res, { farm }, "Farm photo saved");
  } catch (error) {
    next(error);
  }
};

export const removeFarmPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const farm = await farmService.setPhoto(getFarmId(req), getUser(req), null);

    return sendSuccess(res, { farm }, "Farm photo removed");
  } catch (error) {
    next(error);
  }
};

export const updateFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    const farmId = getFarmId(req);

    const farm = await farmService.update(
      farmId,
      user,
      req.body
    );

    return sendSuccess(
      res,
      { farm },
      "Farm updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const deleteFarm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    const farmId = getFarmId(req);

    await farmService.remove(
      farmId,
      user
    );

    return sendSuccess(
      res,
      null,
      "Farm deleted successfully"
    );
  } catch (error) {
    next(error);
  }
};