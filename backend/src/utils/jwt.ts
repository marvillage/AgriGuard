import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "./auth.types.js";

export interface AuthJwtPayload {
  sub: number;
  email: string;
  name: string;
  role: AuthUser["role"];
}

export const generateToken = (user: AuthUser): string => {
  const payload: AuthJwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string): AuthJwtPayload => {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload");
  }

  if (
    typeof decoded.sub !== "number" ||
    typeof decoded.email !== "string" ||
    typeof decoded.name !== "string" ||
    !["FARMER", "AGRONOMIST", "ADMIN"].includes(
      decoded.role as string
    )
  ) {
    throw new Error("Invalid JWT payload");
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role as AuthUser["role"],
  };
};