import { useState, useMemo } from "react";
import {
  Home, User, MapPin, ShoppingBag, Wrench, CalendarDays, Cpu, Hammer,
  Headphones, Heart, ShoppingCart, Bell, Star, FileText, ShieldCheck,
  Gift, LogOut, Package, Truck, Clock, Zap, Database,
} from "lucide-react";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { useDashboardData } from "./lib/dashboardData";
import type { AuthUser } from "./lib/currentUser";
import { logout } from "./lib/currentUser";
import {
  CustomerOverview, CustomerProfile, CustomerAddresses, CustomerOrders, CustomerRepairs,
  CustomerRentals, CustomerPCBuilds, CustomerAssembly, CustomerRemoteSupport, CustomerWishlist,
  CustomerCart, CustomerNotifications, CustomerReviews, CustomerInvoices, CustomerWarranty,
  CustomerRewards, CustomerLogout, CustomerUpgrades, CustomerSoftwareServices,
  CustomerRentalRequests, CustomerSellRequests, CustomerSupportRequests,
} from "./CustomerDashboard.tabs";
import type { NavGroup } from "./components/dashboard/DashboardSidebar";

interface Props { user: AuthUser; initialTab?: string | null }

const TABS: { key: string; label: string; icon: any; title: string }[] = [
  { key: "overview", label: "Overview", icon: Home, title: "Dashboard Overview" },
  { key: "profile", label: "My Profile", icon: User, title: "Profile Management" },
  { key: "addresses", label: "My Addresses", icon: MapPin, title: "Address Management" },
  { key: "orders", label: "My Orders", icon: ShoppingBag, title: "Orders" },
  { key: "repairs", label: "My Repairs", icon: Wrench, title: "Repair Services" },
  { key: "upgrades", label: "Upgrades", icon: Zap, title: "Upgrade & Optimization" },
  { key: "software", label: "Software", icon: Database, title: "Software & Data Services" },
  { key: "rentals", label: "Rentals", icon: CalendarDays, title: "Rental Dashboard" },
  { key: "sell", label: "Sell Used", icon: Package, title: "Sell Used Products" },
  { key: "builds", label: "PC Builds", icon: Cpu, title: "Custom PC Builds" },
  { key: "assembly", label: "Assembly", icon: Hammer, title: "Assembly Requests" },
  { key: "support", label: "Remote Support", icon: Headphones, title: "Remote Support" },
  { key: "wishlist", label: "Wishlist", icon: Heart, title: "Wishlist" },
  { key: "cart", label: "Cart", icon: ShoppingCart, title: "Shopping Cart" },
  { key: "notifications", label: "Notifications", icon: Bell, title: "Notifications" },
  { key: "reviews", label: "Reviews", icon: Star, title: "Reviews" },
  { key: "invoices", label: "Invoices", icon: FileText, title: "Invoices" },
  { key: "warranty", label: "Warranty", icon: ShieldCheck, title: "Warranty" },
  { key: "rewards", label: "Rewards", icon: Gift, title: "Loyalty & Rewards" },
  { key: "logout", label: "Logout", icon: LogOut, title: "Logout" },
];

export default function CustomerDashboard({ user, initialTab }: Props) {
  const [tab, setTab] = useState<string>(() => {
    const pathTab = window.location.pathname.match(/^\/dashboard\/customer\/([a-z0-9-]+)\/?$/)?.[1];
    return initialTab || pathTab || window.location.hash.replace("#", "") || "overview";
  });
  const data = useDashboardData();
  const { store, markNotificationRead, archiveNotification, addAddress, deleteAddress, updateOrderStatus, updateRepairStatus, patchRepair, patchPCBuild, patchServiceRequest, updateRental, fileReview, redeemCoupon, addReplyToTicket, closeTicket } = data;

  const groups: NavGroup[] = useMemo(() => [
    {
      label: "Overview",
      items: TABS.filter(t => ["overview", "notifications"].includes(t.key)).map(t => ({ key: t.key, label: t.label, icon: t.icon, badge: t.key === "notifications" ? store.notifications.filter(n => !n.read && !n.archived && (n.customerId === user.id || n.audience === "all" || n.audience === "customers")).length : undefined })),
    },
    {
      label: "Activity",
      items: TABS.filter(t => ["orders", "repairs", "upgrades", "software", "rentals", "sell", "builds", "assembly", "support"].includes(t.key)).map(t => ({ key: t.key, label: t.label, icon: t.icon })),
    },
    {
      label: "Account",
      items: TABS.filter(t => ["profile", "addresses", "wishlist", "cart", "reviews", "invoices", "warranty", "rewards", "logout"].includes(t.key)).map(t => ({ key: t.key, label: t.label, icon: t.icon })),
    },
  ], [store.notifications, user.id]);

  const tabMeta = TABS.find(t => t.key === tab) || TABS[0];

  const renderTab = () => {
    switch (tab) {
      case "overview":       return <CustomerOverview user={user} data={data} onTab={setTab} />;
      case "profile":        return <CustomerProfile user={user} />;
      case "addresses":      return <CustomerAddresses user={user} store={store} addAddress={addAddress} deleteAddress={deleteAddress} />;
      case "orders":         return <CustomerOrders user={user} store={store} updateOrderStatus={updateOrderStatus} />;
      case "repairs":        return <CustomerRepairs user={user} store={store} updateRepairStatus={updateRepairStatus} patchRepair={patchRepair} />;
      case "upgrades":       return <CustomerUpgrades user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "software":       return <CustomerSoftwareServices user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "rentals":        return <CustomerRentalRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "sell":           return <CustomerSellRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "builds":         return <CustomerPCBuilds user={user} store={store} patchPCBuild={patchPCBuild} />;
      case "assembly":       return <CustomerAssembly user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "support":        return <CustomerSupportRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
      case "wishlist":       return <CustomerWishlist />;
      case "cart":           return <CustomerCart />;
      case "notifications":  return <CustomerNotifications user={user} store={store} markRead={markNotificationRead} archive={archiveNotification} />;
      case "reviews":        return <CustomerReviews user={user} store={store} fileReview={fileReview} />;
      case "invoices":       return <CustomerInvoices user={user} store={store} />;
      case "warranty":       return <CustomerWarranty user={user} store={store} />;
      case "rewards":        return <CustomerRewards user={user} store={store} redeemCoupon={redeemCoupon} />;
      case "logout":         return <CustomerLogout onConfirm={logout} user={user} />;
      default:               return <CustomerOverview user={user} data={data} onTab={setTab} />;
    }
  };

  const unread = store.notifications.filter(n => !n.read && !n.archived && (n.customerId === user.id || n.audience === "all" || n.audience === "customers")).length;

  return (
    <DashboardLayout
      user={user}
      groups={groups}
      active={tab}
      onTabChange={setTab}
      title="Customer"
      pageTitle={tabMeta.title}
      unreadCount={unread}
    >
      {renderTab()}
    </DashboardLayout>
  );
}
