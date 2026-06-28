// Lightweight hook to read the current authenticated user from the
// auth-state blob that AuthSection writes to localStorage. The auth state
// lives inside that component, so we read it back from storage here.

import { useEffect, useState } from "react";

export type AuthRole = "customer" | "admin" | "staff";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AuthRole;
  staffId?: string;
  department?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: "active" | "locked";
  loginAttempts: number;
  lockedUntil?: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "deskto-auth-demo-state";
export const AUTH_STATE_CHANGED_EVENT = "deskto-auth-state-changed";

function readUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.currentUserId;
    if (!id) return null;
    const user = (parsed?.users || []).find((u: AuthUser) => u.id === id);
    if (!user) return null;
    if (user.status !== "active" && user.status !== "locked") {
      user.status = "active";
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return user;
  } catch {
    return null;
  }
}

export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(() => readUser());

  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.currentUserId = null;
      parsed.accessToken = "";
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {}
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  window.history.pushState(null, "", "/");
  window.dispatchEvent(new PopStateEvent("popstate"));
}
