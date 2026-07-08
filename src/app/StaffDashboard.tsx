import { useState, useMemo } from "react";
import {
  Home, ClipboardCheck, Wrench, Cpu, Hammer, Headphones, Truck, Package,
  Clock, TrendingUp, Bell, User, Zap, Database, Gamepad2, ShoppingBag,
} from "lucide-react";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { useDashboardData, type StaffMember } from "./lib/dashboardData";
import type { AuthUser } from "./lib/currentUser";
import type { NavGroup } from "./components/dashboard/DashboardSidebar";
import {
  StaffOverview, StaffTasks, StaffRepairs, StaffPCBuilds, StaffAssembly,
  StaffRemoteSupport, StaffDeliveries, StaffInventoryRequests, StaffAttendance,
  StaffPerformance, StaffNotifications, StaffProfile, StaffUpgrades, StaffSoftwareServices,
  StaffRentalWorkflow, StaffSellRequests, StaffSupportWorkflow, StaffGamingHub,
  StaffOrders,
} from "./StaffDashboard.tabs";

interface Props { user: AuthUser; initialTab?: string | null }

const TABS = [
  { key: "overview", label: "Overview", icon: Home, title: "Dashboard Overview" },
  { key: "tasks", label: "My Tasks", icon: ClipboardCheck, title: "My Tasks" },
  { key: "repairs", label: "Repairs", icon: Wrench, title: "Repair Queue" },
  { key: "upgrades", label: "Upgrades", icon: Zap, title: "Upgrade Queue" },
  { key: "software", label: "Software", icon: Database, title: "Software Queue" },
  { key: "rentals", label: "Rentals", icon: Truck, title: "Rental Queue" },
  { key: "sell", label: "Sell Used", icon: Package, title: "Sell Used Queue" },
  { key: "builds", label: "PC Builds", icon: Cpu, title: "Custom PC Builds" },
  { key: "assembly", label: "Assembly", icon: Hammer, title: "Assembly Jobs" },
  { key: "support", label: "Remote Support", icon: Headphones, title: "Remote Support" },
  { key: "deliveries", label: "Deliveries", icon: Truck, title: "Delivery Tasks" },
  { key: "orders", label: "Orders", icon: ShoppingBag, title: "My Orders" },
  { key: "gaming", label: "Gaming Hub", icon: Gamepad2, title: "Gaming Hub" },
  { key: "inventory", label: "Inventory Requests", icon: Package, title: "Inventory Requests" },
  { key: "attendance", label: "Attendance", icon: Clock, title: "Attendance" },
  { key: "performance", label: "Performance", icon: TrendingUp, title: "Performance" },
  { key: "notifications", label: "Notifications", icon: Bell, title: "Notifications" },
  { key: "profile", label: "Profile", icon: User, title: "Profile" },
];

export default function StaffDashboard({ user, initialTab }: Props) {
  const [tab, setTab] = useState<string>(() => initialTab || window.location.hash.replace("#", "") || "overview");
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
  ], [store.notifications, myStaffId]);

  const normalizedTab = TABS.some(t => t.key === tab) ? tab : "overview";
  const tabMeta = TABS.find(t => t.key === normalizedTab) || TABS[0];

  const renderTab = () => {
    switch (normalizedTab) {
      case "overview":      return <StaffOverview user={user} data={data} staff={myStaff} onTab={setTab} />;
      case "tasks":          return <StaffTasks staff={myStaff} store={store} advanceTask={advanceTask} />;
      case "repairs":        return <StaffRepairs staff={myStaff} store={store} updateRepairStatus={updateRepairStatus} patchRepair={patchRepair} />;
      case "upgrades":       return <StaffUpgrades staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "software":       return <StaffSoftwareServices staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "rentals":        return <StaffRentalWorkflow staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "sell":           return <StaffSellRequests staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "builds":         return <StaffPCBuilds staff={myStaff} store={store} patchPCBuild={patchPCBuild} />;
      case "assembly":       return <StaffAssembly staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "support":        return <StaffSupportWorkflow staff={myStaff} store={store} patchServiceRequest={patchServiceRequest} />;
      case "deliveries":     return <StaffDeliveries staff={myStaff} store={store} updateDeliveryStatus={updateDeliveryStatus} assignDeliveryStaff={assignDeliveryStaff} updateDelivery={updateDelivery} />;
      case "orders":         return <StaffOrders staff={myStaff} store={store} />;
      case "gaming":         return <StaffGamingHub staff={myStaff} store={store} patchGamingHubItem={data.patchGamingHubItem} approveGamingHubComment={approveGamingHubComment} rejectGamingHubComment={rejectGamingHubComment} />;
      case "inventory":      return <StaffInventoryRequests staff={myStaff} store={store} submitInventoryRequest={submitInventoryRequest} approveInventoryRequest={approveInventoryRequest} rejectInventoryRequest={rejectInventoryRequest} markInventoryReceived={markInventoryReceived} />;
      case "attendance":     return <StaffAttendance staff={myStaff} store={store} clockIn={clockIn} clockOut={clockOut} />;
      case "performance":    return <StaffPerformance staff={myStaff} />;
      case "notifications":  return <StaffNotifications user={user} store={store} markRead={markNotificationRead} archive={archiveNotification} />;
      case "profile":        return <StaffProfile user={user} staff={myStaff} />;
      default:               return <StaffOverview user={user} data={data} staff={myStaff} onTab={setTab} />;
    }
  };

  const unread = store.notifications.filter(n => !n.read && !n.archived && (n.staffId === myStaffId || n.audience === "staff" || n.audience === "all")).length;

  return (
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
  );
}
