"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { clearAuth, getStoredUser, getToken, setAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    extra?: { role?: "FARMER" | "AGRONOMIST"; phone?: string; language?: string }
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const homeFor = (user: User) => (user.role === "AGRONOMIST" ? "/advisor" : "/dashboard");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    const token = getToken();
    if (token) setAuth(token, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();
      const stored = getStoredUser();

      if (!token || !stored) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await api.me();
        setUserState(currentUser);
      } catch (error) {
        // Only a rejected token ends the session; rate limits and outages keep the cached user.
        if (error instanceof ApiRequestError && error.status === 401) {
          clearAuth();
          setUserState(null);
        } else {
          setUserState(stored as User);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const finishSignIn = useCallback(
    async (token: string, basic: User) => {
      setAuth(token, JSON.stringify(basic));
      const profile = await api.me().then((result) => result.user).catch(() => basic);
      setAuth(token, JSON.stringify(profile));
      setUserState(profile);
      router.push(homeFor(profile));
    },
    [router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: loggedInUser, token } = await api.login({
        email,
        password,
      });
      await finishSignIn(token, loggedInUser);
    },
    [finishSignIn]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, extra: { role?: "FARMER" | "AGRONOMIST"; phone?: string; language?: string } = {}) => {
      const { user: newUser, token } = await api.register({
        name,
        email,
        password,
        ...extra,
      });
      await finishSignIn(token, newUser);
    },
    [finishSignIn]
  );

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, setUser }),
    [user, isLoading, login, register, logout, setUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
