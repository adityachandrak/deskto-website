import { useState, useMemo, useEffect } from "react";
import {
  Home, ClipboardCheck, Truck, Package,
  Clock, TrendingUp, Bell, User, ShoppingBag,
} from "lucide-react";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { useDashboardData, type StaffMember } from "./lib/dashboardData";
import type { AuthUser } from "./lib/currentUser";
import type { NavGroup } from "./components/dashboard/DashboardSidebar";
import { packRegistry } from "@/app/core/industryPackRegistry";

import {
  StaffOverview, StaffTasks, StaffDeliveries, StaffInventoryRequests, StaffAttendance,
  StaffPerformance, StaffNotifications, StaffProfile, StaffUpgrades, StaffSoftwareServices,
  StaffRentalWorkflow, StaffSellRequests, StaffSupportWorkflow, StaffRepairs,
  StaffOrders, StaffAssembly, StaffPCBuilds,
} from "./StaffDashboard.tabs";
import { DashboardDataProvider } from "@/app/core/DashboardDataContext";

interface Props { user: AuthUser; initialTab?: string | null }

const CORE_TABS = [
  { key: "overview", label: "Overview", icon: Home, title: "Dashboard Overview" },
  { key: "tasks", label: "My Tasks", icon: ClipboardCheck, title: "My Tasks" },
  { key: "deliveries", label: "Deliveries", icon: Truck, title: "Delivery Tasks" },
  { key: "orders", label: "Orders", icon: ShoppingBag, title: "My Orders" },
  { key: "inventory", label: "Inventory Requests", icon: Package, title: "Inventory Requests" },
  { key: "attendance", label: "Attendance", icon: Clock, title: "Attendance" },
  { key: "performance", label: "Performance", icon: TrendingUp, title: "Performance" },
  { key: "notifications", label: "Notifications", icon: Bell, title: "Notifications" },
  { key: "profile", label: "Profile", icon: User, title: "Profile" },
];

function getActiveStaffTabs() {
  const activePack = packRegistry.getActivePack();
  const packStaffTabs = activePack?.dashboardTabs?.staff ?? [];

  if (packStaffTabs.length === 0) return CORE_TABS;

  const packEntries = packStaffTabs.map((t) => ({
    key: t.id,
    label: t.label,
    icon: t.icon,
    title: t.label,
  }));

  // Insert pack tabs after My Tasks (index 1) and before Deliveries (index 2),
  // except "gaming" which goes after Orders (index 3).
  const gamingEntry = packEntries.find((t) => t.key === "gaming");
  const workEntries = packEntries.filter((t) => t.key !== "gaming");

  return [
    ...CORE_TABS.slice(0, 2),  // Overview, My Tasks
    ...workEntries,
    ...CORE_TABS.slice(2, 4),  // Deliveries, Orders
    ...(gamingEntry ? [gamingEntry] : []),
    ...CORE_TABS.slice(4),     // Inventory through Profile
  ];
}

export default function StaffDashboard({ user, initialTab }: Props) {

  const [tab, setTab] = useState<string>(() => initialTab || window.location.hash.replace("#", "") || "overview");
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const data = useDashboardData();
  const { store, updateRepairStatus, patchRepair, patchPCBuild, patchServiceRequest, advanceTask, clockIn, clockOut, submitInventoryRequest, approveInventoryRequest, rejectInventoryRequest, markInventoryReceived, approveGamingHubComment, rejectGamingHubComment, updateDeliveryStatus, assignDeliveryStaff, updateDelivery, addReplyToTicket, closeTicket, markNotificationRead, archiveNotification, patchGamingHubItem } = data;

  // Map current user to staff record by email match; staff signups can work before an admin creates a staff master record.
  const myStaff: StaffMember = store.staff.find(s => s.email === user.email) || {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "technician",
    department: user.department || "Repairs",
    joinedAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
    performance: { jobs: 0, rating: 5, attendancePct: 100 },
  };
  const myStaffId = myStaff?.id || "stf_unknown";

  const activePackId = packRegistry.getActivePackId();
  const TABS = useMemo(() => getActiveStaffTabs(), [activePackId]);

  const groups: NavGroup[] = useMemo(() => [
    {
      label: "Overview",
      items: TABS.filter(t => ["overview", "tasks", "notifications"].includes(t.key)).map(t => ({
        key: t.key, label: t.label, icon: t.icon,
        badge: t.key === "notifications" ? store.notifications.filter(n => !n.read && !n.archived && (n.staffId === myStaffId || n.audience === "staff" || n.audience === "all")).length : undefined,
      })),
    },
    {
      label: "Work",
      items: TABS.filter(t => ["repairs", "upgrades", "software", "rentals", "sell", "builds", "assembly", "support", "deliveries", "orders", "gaming", "inventory"].includes(t.key)).map(t => ({ key: t.key, label: t.label, icon: t.icon })),
    },
    {
      label: "Account",
      items: TABS.filter(t => ["attendance", "performance", "profile"].includes(t.key)).map(t => ({ key: t.key, label: t.label, icon: t.icon })),
    },
  ], [store.notifications, myStaffId, TABS]);

  const normalizedTab = TABS.some(t => t.key === tab) ? tab : "overview";
  const tabMeta = TABS.find(t => t.key === normalizedTab) || TABS[0] || { key: "overview", title: "Overview" };


  const renderTab = () => {
    // ── Pack-owned tabs: rendered via registry ──
    const activePack = packRegistry.getActivePack();
    const packTab = activePack?.dashboardTabs?.staff?.find((t) => t.id === normalizedTab);
    if (packTab) {
      const PackComponent = packTab.component;
      return <PackComponent />;
    }

    // ── Core tabs ──
    switch (normalizedTab) {
      case "overview":      return <StaffOverview user={user} data={data} staff={myStaff} onTab={setTab} />;
      case "tasks":         return <StaffTasks staff={myStaff} store={store} advanceTask={advanceTask} />;
      case "upgrades":      return <StaffUpgrades staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "software":      return <StaffSoftwareServices staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "rentals":       return <StaffRentalWorkflow staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "sell":          return <StaffSellRequests staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "assembly":      return <StaffAssembly staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "support":       return <StaffSupportWorkflow staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "deliveries":    return <StaffDeliveries staff={myStaff} store={store} updateDeliveryStatus={updateDeliveryStatus} assignDeliveryStaff={assignDeliveryStaff} updateDelivery={updateDelivery} />;
      case "orders":        return <StaffOrders staff={myStaff} store={store} updateOrderStatus={data.updateOrderStatus} />;
      case "inventory":     return <StaffInventoryRequests staff={myStaff} store={store} submitInventoryRequest={submitInventoryRequest} approveInventoryRequest={approveInventoryRequest} rejectInventoryRequest={rejectInventoryRequest} markInventoryReceived={markInventoryReceived} />;
      case "attendance":    return <StaffAttendance staff={myStaff} store={store} clockIn={clockIn} clockOut={clockOut} />;
      case "performance":   return <StaffPerformance staff={myStaff} />;
      case "notifications": return <StaffNotifications user={user} store={store} markRead={markNotificationRead} archive={archiveNotification} />;
      case "profile":       return <StaffProfile user={user} staff={myStaff} />;
      default:              return <StaffOverview user={user} data={data} staff={myStaff} onTab={setTab} />;
    }
  };

  const unread = store.notifications.filter(n => !n.read && !n.archived && (n.staffId === myStaffId || n.audience === "staff" || n.audience === "all")).length;

  return (
    <DashboardDataProvider value={{ data, user }}>
      <DashboardLayout
        user={user}
        groups={groups}
        active={normalizedTab}
        onTabChange={setTab}
        title="Staff"
        pageTitle={tabMeta.title}
        unreadCount={unread}
      >
        {renderTab()}
      </DashboardLayout>
    </DashboardDataProvider>
  );
}
