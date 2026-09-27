import type { UserRole } from "../utils/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: UserRole;
      };
    }
  }
}

export {};