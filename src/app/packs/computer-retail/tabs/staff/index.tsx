/**
 * computer-retail / staff tab wrappers
 *
 * Each component is self-contained (zero props). The `useMyStaff` helper
 * maps the current user's email to a StaffMember record, mirroring the
 * same logic in StaffDashboard.tsx.
 */
import React from "react";
import { useDashboardContext } from "../../../../core/DashboardDataContext";
import type { StaffMember } from "../../../../lib/dashboardData";
import {
  StaffRepairs,
  StaffPCBuilds,
  StaffGamingHub,
} from "../../../../StaffDashboard.tabs";

function useMyStaff(): StaffMember {
  const { data: { store }, user } = useDashboardContext();
  return (
    store.staff.find((s) => s.email === user.email) ?? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "technician" as const,
      department: (user as any).department ?? "Repairs",
      joinedAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      performance: { jobs: 0, rating: 5, attendancePct: 100 },
    }
  );
}

export function PackStaffRepairs() {
  const { data: { store, updateRepairStatus, patchRepair } } = useDashboardContext();
  const myStaff = useMyStaff();
  return (
    <StaffRepairs
      staff={myStaff}
      store={store}
      updateRepairStatus={updateRepairStatus}
      patchRepair={patchRepair}
    />
  );
}

export function PackStaffPCBuilds() {
  const { data: { store, patchPCBuild } } = useDashboardContext();
  const myStaff = useMyStaff();
  return <StaffPCBuilds staff={myStaff} store={store} patchPCBuild={patchPCBuild} />;
}

export function PackStaffGamingHub() {
  const {
    data: { store, patchGamingHubItem, approveGamingHubComment, rejectGamingHubComment },
  } = useDashboardContext();
  const myStaff = useMyStaff();
  return (
    <StaffGamingHub
      staff={myStaff}
      store={store}
      patchGamingHubItem={patchGamingHubItem}
      approveGamingHubComment={approveGamingHubComment}
      rejectGamingHubComment={rejectGamingHubComment}
    />
  );
}
