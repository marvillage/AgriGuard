import db from "../config/database.js";
import type { UserRole } from "../utils/auth.types.js";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  role?: UserRole;
  phone?: string;
  language?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string | null;
  language?: string;
  smsAlerts?: boolean;
  whatsappAlerts?: boolean;
  pushAlerts?: boolean;
  dailyBriefing?: boolean;
}

export const findUserByEmail = async (email: string) => {
  return db.orm.public.User.first({
    email,
  });
};

export const findUserById = async (id: number) => {
  return db.orm.public.User.first({
    id,
  });
};

export const createUser = async (data: CreateUserData) => {
  return db.orm.public.User.create({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role ?? "FARMER",
    phone: data.phone ?? null,
    language: data.language ?? "en",
  });
};

export const updateUser = async (id: number, data: UpdateUserData) => {
  return db.orm.public.User.where({ id }).update(data);
};