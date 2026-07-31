import { createContext, useContext } from "react";
import type { useDashboardData } from "../lib/dashboardData";
import type { AuthUser } from "../lib/currentUser";

export type DashboardData = ReturnType<typeof useDashboardData>;

interface DashboardContextValue {
  data: DashboardData;
  user: AuthUser;
}

export const DashboardDataContext = createContext<DashboardContextValue | null>(null);

export const DashboardDataProvider = DashboardDataContext.Provider;

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used within a DashboardDataProvider");
  }
  return ctx;
}
