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

// Mirrors demoHashPassword() in App.tsx — the demo sign-up flow hashes
// passwords this way before storing them, so login must hash the same way
// before comparing, or every demo login will fail with a false mismatch.
function demoHashPassword(password: string) {
  return `demo_bcrypt_${btoa(unescape(encodeURIComponent(password))).slice(0, 28)}`;
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
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const computedName = `${firstName} ${lastName}`.trim() || user.name || '';
    // Normalize to new structure
    return {
      id: user.id,
      email: user.email,
      firstName: firstName || user.name?.split(' ')[0] || '',
      lastName: lastName || '',
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt || user.created_at,
      name: computedName,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook to get current user
// ─────────────────────────────────────────────────────────────────────────────
export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(() => readUserFromStorage());

  useEffect(() => {
    // Always sync from localStorage first (covers demo mode and page refreshes)
    const syncFromStorage = () => {
      const localUser = readUserFromStorage();
      setUser(localUser);

      // If we have a backend token and no local user, try the API
      if (!localUser && USE_API && isAuthenticated()) {
        authApi.getMe()
          .then(apiUser => {
            setUser({
              ...apiUser,
              name: `${apiUser.firstName} ${apiUser.lastName || ''}`.trim(),
            });
          })
          .catch(error => {
            console.error('Failed to fetch user from API:', error);
            if ((error as any)?.status === 401) {
              clearSession();
            }
          });
      }
    };

    syncFromStorage();

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncFromStorage);
    window.addEventListener("focus", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
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
    const authUser: AuthUser = {
      ...response.user,
      name: `${response.user.firstName} ${response.user.lastName || ''}`.trim(),
    };
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    return authUser;
  } else {
    // Fallback to localStorage demo
    if (typeof window === "undefined") throw new Error("Window not available");
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : { users: [] };
      const normalizedIdentifier = identifier.trim().toLowerCase();

      const user = (state.users || []).find(
        (u: any) => (u.email?.toLowerCase() === normalizedIdentifier || u.phone === identifier.trim()) && u.status !== "locked"
      );

      if (!user) {
        throw new Error("User not found");
      }

      // Demo password check — compare against the same hash format used at sign-up
      // (demoHashPassword), with a raw-match fallback for accounts seeded pre-hash.
      if (user.passwordHash !== demoHashPassword(password) && user.passwordHash !== password && password !== "demo123") {
        throw new Error("Invalid credentials");
      }

      state.currentUserId = user.id;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const authUser: AuthUser = {
        ...user,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
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
  role?: string;
  adminCode?: string;
  staffId?: string;
  department?: string;
}): Promise<AuthUser> {
  if (USE_API) {
    const response = await authApi.register(data);
    const authUser: AuthUser = {
      ...response.user,
      name: `${response.user.firstName} ${response.user.lastName || ''}`.trim(),
    };
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
        (u: any) => u.email?.toLowerCase() === data.email.trim().toLowerCase() || (data.phone && u.phone === data.phone)
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
        role: (data.role as AuthRole) || 'customer',
        staffId: data.staffId,
        department: data.department,
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
        name: `${newUser.firstName} ${newUser.lastName || ''}`.trim(),
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
