import { useState, useMemo, useEffect } from "react";
import {
  Home, User, MapPin, ShoppingBag,
  Heart, ShoppingCart, Bell, Star, FileText, ShieldCheck,
  Gift, LogOut,
} from "lucide-react";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { useDashboardData } from "./lib/dashboardData";
import type { AuthUser } from "./lib/currentUser";
import { logout } from "./lib/currentUser";
import { packRegistry } from "@/app/core/industryPackRegistry";

import {
  CustomerOverview, CustomerProfile, CustomerAddresses, CustomerOrders,
  CustomerWishlist, CustomerCart, CustomerNotifications, CustomerReviews,
  CustomerInvoices, CustomerWarranty, CustomerRewards, CustomerLogout,
} from "./CustomerDashboard.tabs";
import type { NavGroup } from "./components/dashboard/DashboardSidebar";
import { DashboardDataProvider } from "@/app/core/DashboardDataContext";

interface Props { user: AuthUser; initialTab?: string | null }

const CORE_TABS: { key: string; label: string; icon: any; title: string }[] = [
  { key: "overview", label: "Overview", icon: Home, title: "Dashboard Overview" },
  { key: "profile", label: "My Profile", icon: User, title: "Profile Management" },
  { key: "addresses", label: "My Addresses", icon: MapPin, title: "Address Management" },
  { key: "orders", label: "My Orders", icon: ShoppingBag, title: "Orders" },
  { key: "wishlist", label: "Wishlist", icon: Heart, title: "Wishlist" },
  { key: "cart", label: "Cart", icon: ShoppingCart, title: "Shopping Cart" },
  { key: "notifications", label: "Notifications", icon: Bell, title: "Notifications" },
  { key: "reviews", label: "Reviews", icon: Star, title: "Reviews" },
  { key: "invoices", label: "Invoices", icon: FileText, title: "Invoices" },
  { key: "warranty", label: "Warranty", icon: ShieldCheck, title: "Warranty" },
  { key: "rewards", label: "Rewards", icon: Gift, title: "Loyalty & Rewards" },
  { key: "logout", label: "Logout", icon: LogOut, title: "Logout" },
];

function getActiveCustomerTabs() {
  const activePack = packRegistry.getActivePack();
  const packCustomerTabs = activePack?.dashboardTabs?.customer ?? [];

  if (packCustomerTabs.length === 0) return CORE_TABS;

  const packEntries = packCustomerTabs.map((t) => ({
    key: t.id,
    label: t.label,
    icon: t.icon,
    title: t.label,
  }));

  return [
    ...CORE_TABS.slice(0, 4), // Overview, Profile, Addresses, Orders
    ...packEntries,
    ...CORE_TABS.slice(4),    // Wishlist through Logout
  ];
}

export default function CustomerDashboard({ user, initialTab }: Props) {

  const [tab, setTab] = useState<string>(() => initialTab || window.location.hash.replace("#", "") || "overview");
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const data = useDashboardData();
  const { store, markNotificationRead, archiveNotification, addAddress, deleteAddress, updateOrderStatus, updateRepairStatus, patchRepair, patchPCBuild, patchServiceRequest, updateRental, fileReview, redeemCoupon, addReplyToTicket, closeTicket } = data;

  const activePackId = packRegistry.getActivePackId();
  const TABS = useMemo(() => getActiveCustomerTabs(), [activePackId]);

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
  ], [store.notifications, user.id, TABS]);

  const normalizedTab = TABS.some(t => t.key === tab) ? tab : "overview";
  const tabMeta = TABS.find(t => t.key === normalizedTab) || TABS[0] || { key: "overview", title: "Overview" };


  const renderTab = () => {
    // ── Pack-owned tabs: rendered via registry ──
    const activePack = packRegistry.getActivePack();
    const packTab = activePack?.dashboardTabs?.customer?.find((t) => t.id === normalizedTab);
    if (packTab) {
      const PackComponent = packTab.component;
      return <PackComponent />;
    }

    // ── Core tabs ──
    switch (normalizedTab) {
      case "overview":      return <CustomerOverview user={user} data={data} onTab={setTab} />;
      case "profile":       return <CustomerProfile user={user} />;
      case "addresses":     return <CustomerAddresses user={user} store={store} addAddress={addAddress} deleteAddress={deleteAddress} />;
      case "orders":        return <CustomerOrders user={user} store={store} updateOrderStatus={updateOrderStatus} />;
      case "wishlist":      return <CustomerWishlist />;
      case "cart":          return <CustomerCart />;
      case "notifications": return <CustomerNotifications user={user} store={store} markRead={markNotificationRead} archive={archiveNotification} />;
      case "reviews":       return <CustomerReviews user={user} store={store} fileReview={fileReview} />;
      case "invoices":      return <CustomerInvoices user={user} store={store} />;
      case "warranty":      return <CustomerWarranty user={user} store={store} />;
      case "rewards":       return <CustomerRewards user={user} store={store} redeemCoupon={redeemCoupon} />;
      case "logout":        return <CustomerLogout onConfirm={logout} user={user} />;
      default:              return <CustomerOverview user={user} data={data} onTab={setTab} />;
    }
  };

  const unread = store.notifications.filter(n => !n.read && !n.archived && (n.customerId === user.id || n.audience === "all" || n.audience === "customers")).length;

  return (
    <DashboardDataProvider value={{ data, user }}>
      <DashboardLayout
        user={user}
        groups={groups}
        active={normalizedTab}
        onTabChange={setTab}
        title="Customer"
        pageTitle={tabMeta.title}
        unreadCount={unread}
      >
        {renderTab()}
      </DashboardLayout>
    </DashboardDataProvider>
  );
}
