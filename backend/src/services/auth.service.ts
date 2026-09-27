import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";
import { generateToken } from "../utils/jwt.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  type UpdateUserData,
} from "../repositories/user.repository.js";
import type { AuthUser, UserRole } from "../utils/auth.types.js";

const SALT_ROUNDS = 12;

const sanitizeUser = (user: {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}): AuthUser => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

export const register = async (
  email: string,
  password: string,
  name: string,
  extra: { role?: "FARMER" | "AGRONOMIST"; phone?: string; language?: string } = {}
) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  if (!normalizedEmail || !password || !normalizedName) {
    throw new AppError(
      "Email, password, and name are required",
      400
    );
  }

  if (password.length < 6) {
    throw new AppError(
      "Password must be at least 6 characters long",
      400
    );
  }

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    name: normalizedName,
    role: extra.role ?? "FARMER",
    phone: extra.phone,
    language: extra.language,
  });

  const safeUser = sanitizeUser(user);
  const token = generateToken(safeUser);

  return {
    user: safeUser,
    token,
  };
};

export const login = async (
  email: string,
  password: string
) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new AppError(
      "Email and password are required",
      400
    );
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const safeUser = sanitizeUser(user);
  const token = generateToken(safeUser);

  return {
    user: safeUser,
    token,
  };
};

export const getCurrentUser = async (userId: number) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return profile(user);
};

const profile = (user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) => ({
  ...sanitizeUser(user),
  phone: user.phone,
  language: user.language,
  smsAlerts: user.smsAlerts,
  whatsappAlerts: user.whatsappAlerts,
  pushAlerts: user.pushAlerts,
  dailyBriefing: user.dailyBriefing,
});

export const updateProfile = async (userId: number, data: UpdateUserData) => {
  const user = await updateUser(userId, data);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return profile(user);
};