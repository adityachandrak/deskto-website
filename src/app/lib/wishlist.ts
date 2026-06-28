import { useState, useEffect, useCallback } from "react";

const WISHLIST_KEY = "deskto_wishlist_v1";

export function loadWishlist(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "number");
    return [];
  } catch {
    return [];
  }
}

export function saveWishlist(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<number[]>(loadWishlist);

  // Sync between tabs / other components in the same tab
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === WISHLIST_KEY) setIds(loadWishlist());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveWishlist(next);
      return next;
    });
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, toggle, has, count: ids.length };
}
