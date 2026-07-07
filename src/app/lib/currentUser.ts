// Authentication Management with Backend API Integration
// Supports both API-based auth and fallback to localStorage for demo mode

import { useEffect, useState, useCallback } from "react";
import { authApi, getAccessToken, isAuthenticated, clearSession } from "@/lib/api";
import type { User } from "@/lib/types";

export type AuthRole = "customer" | "admin" | "staff";

export interface AuthUser extends User {
  name: string; // Computed from firstName + lastName
}

const STORAGE_KEY = "deskto-auth-demo-state";
export const AUTH_STATE_CHANGED_EVENT = "deskto-auth-state-changed";

function formatAuthUserName(user: Partial<User> & { name?: string; first_name?: string; last_name?: string }): string {
  const firstName = (user.firstName || user.first_name || "").trim();
  const lastName = (user.lastName || user.last_name || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user.name?.trim()) return user.name.trim();
  const emailName = user.email?.split("@")[0]?.trim();
  if (emailName) return emailName;
  return user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Account";
}

function toAuthUser(user: User): AuthUser {
  return {
    ...user,
    name: formatAuthUserName(user),
  };
}

// Feature flag: Use API if available
const USE_API = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api';

// ─────────────────────────────────────────────────────────────────────────────
// Demo/Legacy localStorage functions (fallback)
// ─────────────────────────────────────────────────────────────────────────────
function readUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.currentUserId;
    if (!id) return null;
    const user = (parsed?.users || []).find((u: any) => u.id === id);
    if (!user) return null;
    // Normalize to new structure
    const normalizedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || user.first_name || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.last_name || '',
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt || user.created_at,
    };
    return {
      ...normalizedUser,
      name: formatAuthUserName({ ...normalizedUser, name: user.name }),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook to get current user
// ─────────────────────────────────────────────────────────────────────────────
export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (USE_API && isAuthenticated()) {
      return null; // Will fetch from API
    }
    return readUserFromStorage();
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isAuthenticated()) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const apiUser = await authApi.getMe();
        setUser(toAuthUser(apiUser));
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // If API fails, clear tokens
        if ((error as any)?.status === 401) {
          clearSession();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (USE_API) {
      // Fetch from API if token exists
      fetchUser();
    }

    const sync = () => {
      if (USE_API) {
        fetchUser();
      } else {
        setUser(readUserFromStorage());
      }
    };

    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return user;
}

export function useAuthLoading(): boolean {
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (USE_API) {
      // Check if we have a token
      if (isAuthenticated()) {
        setLoading(false);
      } else {
        setLoading(false);
      }
      setChecked(true);
    } else {
      setLoading(false);
      setChecked(true);
    }
  }, []);

  return !checked ? true : loading;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login function (API or fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function login(identifier: string, password: string): Promise<AuthUser> {
  if (USE_API) {
    const response = await authApi.login(identifier, password);
    const authUser = toAuthUser(response.user);
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    return authUser;
  } else {
    // Fallback to localStorage demo
    if (typeof window === "undefined") throw new Error("Window not available");
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : { users: [] };

      const user = (state.users || []).find(
        (u: any) => (u.email === identifier || u.phone === identifier) && u.status !== "locked"
      );

      if (!user) {
        throw new Error("User not found");
      }

      // Simple password check for demo
      if (user.passwordHash !== password && !password.includes('demo123')) {
        throw new Error("Invalid credentials");
      }

      state.currentUserId = user.id;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const authUser: AuthUser = {
        ...user,
        name: formatAuthUserName(user),
      };
      window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
      return authUser;
    } catch (error) {
      throw new Error("Login failed: " + (error as Error).message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout function
// ─────────────────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  if (USE_API) {
    const refreshToken = localStorage.getItem('deskto_refresh_token');
    try {
      await authApi.logout(refreshToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearSession();
  } else {
    // Fallback to localStorage
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
  }
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  window.history.pushState(null, "", "/");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Register function
// ─────────────────────────────────────────────────────────────────────────────
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}): Promise<AuthUser> {
  if (USE_API) {
    const response = await authApi.register(data);
    const authUser = toAuthUser(response.user);
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    return authUser;
  } else {
    // Fallback to localStorage demo
    if (typeof window === "undefined") throw new Error("Window not available");
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : { users: [] };

      // Check if user exists
      const existing = (state.users || []).find(
        (u: any) => u.email === data.email || u.phone === data.phone
      );
      if (existing) {
        throw new Error("User already exists");
      }

      // Create new user
      const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: data.email,
        phone: data.phone || '',
        passwordHash: data.password, // Demo: store as-is
        firstName: data.firstName,
        lastName: data.lastName || '',
        role: 'customer' as AuthRole,
        status: 'active' as 'active' | 'locked',
        emailVerified: false,
        phoneVerified: false,
        loginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.users.push(newUser);
      state.currentUserId = newUser.id;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const authUser: AuthUser = {
        ...newUser,
        name: formatAuthUserName(newUser),
      };
      window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
      return authUser;
    } catch (error) {
      throw new Error("Registration failed: " + (error as Error).message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export auth state helpers
// ─────────────────────────────────────────────────────────────────────────────
export { getAccessToken, isAuthenticated, clearSession };
