export type UserRole = "FARMER" | "AGRONOMIST" | "ADMIN";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}