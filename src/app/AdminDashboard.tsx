import { Component, type ReactNode, useState, useMemo } from "react";
import {
  Home, Package, Tag, Award, Database, ShoppingBag, Wrench, Truck, Cpu, Hammer,
  Headphones, Store, Users, UserCog, Truck as TruckIcon, Receipt, Ticket,
  TrendingUp, Bell, Settings, History, RefreshCcw, BarChart3, Zap, Gamepad2, Star, HelpCircle,
} from "lucide-react";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { useDashboardData } from "./lib/dashboardData";
import type { AuthUser } from "./lib/currentUser";
import type { NavGroup } from "./components/dashboard/DashboardSidebar";
import {
  AdminOverview, AdminProducts, AdminCategories, AdminBrands, AdminInventory,
  AdminOrders, AdminRepairs, AdminRentals, AdminCustomPC,
  AdminRemoteSupport, AdminMarketplace, AdminCRM, AdminCustomers, AdminStaff,
  AdminSuppliers, AdminPurchaseOrders, AdminCoupons, AdminOffers, AdminReports,
  AdminNotifications, AdminSettings, AdminAuditLogs, AdminBackup,
  AdminUpgrades, AdminSoftwareServices, AdminRentalWorkflow, AdminSellRequests, AdminSupportWorkflow,
  AdminAssemblyService, AdminGamingHub, AdminCustomBuilder,
  AdminFeaturedBuilds, AdminExclusiveOffers, AdminGamingNews, AdminTestimonials, AdminFAQ,
  AdminDeliveries,
} from "./AdminDashboard.tabs";

interface Props { user: AuthUser; initialTab?: string | null }

class AdminTabErrorBoundary extends Component<{ active: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: { active: string }) {
    if (prevProps.active !== this.props.active && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="glass-card" style={{ padding: 24, borderColor: "rgba(255,31,69,.35)", display: "grid", gap: 12 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", color: "#FF1F45", fontSize: 18 }}>Dashboard section could not load</div>
        <div style={{ color: "#aaa", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
          This section hit a saved-data rendering issue. Switch to another sidebar item or reset the demo data from Backup & Restore.
        </div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#ccc", background: "#050505", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: 12, fontSize: 11, maxHeight: 180, overflow: "auto" }}>
          {this.state.error.message}
        </pre>
      </div>
    );
  }
}

const TABS = [
  { key: "overview", label: "Overview", icon: Home, group: "Overview" },
  { key: "products", label: "Catalog Management", icon: Package, group: "Catalog" },
  { key: "categories", label: "Categories", icon: Tag, group: "Catalog" },
  { key: "brands", label: "Brands", icon: Award, group: "Catalog" },
  { key: "inventory", label: "Inventory", icon: Database, group: "Catalog" },
  { key: "orders", label: "Orders", icon: ShoppingBag, group: "Operations" },
  { key: "repairs", label: "Repairs", icon: Wrench, group: "Operations" },
  { key: "builder", label: "Custom Builder", icon: Cpu, group: "Operations" },
  { key: "builds", label: "PC Builds", icon: Cpu, group: "Operations" },
  { key: "assembly", label: "Assembly", icon: Hammer, group: "Operations" },
  { key: "upgrades", label: "Upgrades", icon: Zap, group: "Operations" },
  { key: "software", label: "Software", icon: Database, group: "Operations" },
  { key: "rentals", label: "Rentals", icon: Truck, group: "Operations" },
  { key: "deliveries", label: "Deliveries", icon: TruckIcon, group: "Operations" },
  { key: "support", label: "Remote Support", icon: Headphones, group: "Operations" },
  { key: "marketplace", label: "Sell Used", icon: Store, group: "Operations" },
  { key: "crm", label: "CRM", icon: UserCog, group: "People" },
  { key: "customers", label: "Customers", icon: Users, group: "People" },
  { key: "staff", label: "Staff", icon: UserCog, group: "People" },
  { key: "suppliers", label: "Suppliers", icon: TruckIcon, group: "Procurement" },
  { key: "purchase-orders", label: "Purchase Orders", icon: Receipt, group: "Procurement" },
  { key: "coupons", label: "Coupons", icon: Ticket, group: "Marketing" },
  { key: "offers", label: "Offers", icon: Tag, group: "Marketing" },
  { key: "gaming", label: "Gaming Hub Management", icon: Gamepad2, group: "Marketing" },
  { key: "featured-builds", label: "Featured Builds", icon: Star, group: "Homepage" },
  { key: "exclusive-offers", label: "Exclusive Offers", icon: Tag, group: "Homepage" },
  { key: "gaming-news", label: "Gaming News", icon: Zap, group: "Homepage" },
  { key: "testimonials", label: "Testimonials", icon: Star, group: "Homepage" },
  { key: "faq", label: "FAQ", icon: HelpCircle, group: "Homepage" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Insights" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "System" },
  { key: "settings", label: "Settings", icon: Settings, group: "System" },
  { key: "audit", label: "Audit Logs", icon: History, group: "System" },
  { key: "backup", label: "Backup & Restore", icon: RefreshCcw, group: "System" },
];

const GROUP_ORDER = ["Overview", "Catalog", "Operations", "People", "Procurement", "Marketing", "Homepage", "Insights", "System"];

function normalizeAdminTab(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "gaming-hub" || raw === "gaming-hub-management") return "gaming";
  if (raw === "custom-builder" || raw === "builder-management") return "builder";
  if (raw === "pc-builds" || raw === "custom-pc") return "builds";
  return raw || "overview";
}

export default function AdminDashboard({ user, initialTab }: Props) {
  const [tab, setTab] = useState<string>(() => normalizeAdminTab(initialTab || window.location.hash.replace("#", "")));
  const data = useDashboardData();
  const {
    store,
    addLog,
    updateOrderStatus,
    updateRepairStatus,
    patchRepair,
    patchPCBuild,
    patchServiceRequest,
    addCatalogProduct,
    patchCatalogProduct,
    deleteCatalogProduct,
    addGamingHubItem,
    patchGamingHubItem,
    deleteGamingHubItem,
    addCRMNote,
    addStaffMember,
    addSupplier,
    addPurchaseOrder,
    patchPurchaseOrder,
    addCoupon,
    patchCoupon,
    addOffer,
    patchOffer,
    updateDeliveryStatus,
    assignDeliveryStaff,
    updateDelivery,
    updateSettings,
    addNotification,
    markNotificationRead,
    archiveNotification,
    patchCustomBuilderConfig,
    publishBuilderConfig,
    addBuilderComponent,
    updateBuilderComponent,
    removeBuilderComponent,
    reorderBuilderComponents,
    updateBuildPurpose,
    addBuildPurpose,
    removeBuildPurpose,
    updatePricingRules,
    updateContentConfig,
    updateDefaultPreset,
    getBuilderMetrics,
  } = data;

  const groups: NavGroup[] = useMemo(() => GROUP_ORDER.map(label => ({
    label,
    items: TABS.filter(t => t.group === label).map(t => ({ key: t.key, label: t.label, icon: t.icon })),
  })), []);

  const normalizedTab = normalizeAdminTab(tab);
  const tabMeta = TABS.find(t => t.key === normalizedTab) || TABS[0];

  const handleTabChange = (key: string) => {
    const next = normalizeAdminTab(key);
    if (next === "overview" && initialTab && normalizeAdminTab(initialTab) !== "overview" && !window.location.hash) {
      setTab(normalizeAdminTab(initialTab));
      return;
    }
    setTab(next);
  };

  const renderTab = () => {
    switch (normalizedTab) {
      case "overview":          return <AdminOverview data={data} onTab={handleTabChange} />;
      case "products":          return <AdminProducts store={store} addCatalogProduct={addCatalogProduct} patchCatalogProduct={patchCatalogProduct} deleteCatalogProduct={deleteCatalogProduct} />;
      case "categories":        return <AdminCategories />;
      case "brands":            return <AdminBrands />;
      case "inventory":         return <AdminInventory store={store} />;
      case "builder":           return <AdminCustomBuilder store={store} patchCustomBuilderConfig={patchCustomBuilderConfig} publishBuilderConfig={publishBuilderConfig} addBuilderComponent={addBuilderComponent} updateBuilderComponent={updateBuilderComponent} removeBuilderComponent={removeBuilderComponent} reorderBuilderComponents={reorderBuilderComponents} updateBuildPurpose={updateBuildPurpose} addBuildPurpose={addBuildPurpose} removeBuildPurpose={removeBuildPurpose} updatePricingRules={updatePricingRules} updateContentConfig={updateContentConfig} updateDefaultPreset={updateDefaultPreset} getBuilderMetrics={getBuilderMetrics} />;
      case "orders":            return <AdminOrders store={store} updateOrderStatus={updateOrderStatus} />;
      case "repairs":           return <AdminRepairs store={store} updateRepairStatus={updateRepairStatus} patchRepair={patchRepair} />;
      case "upgrades":          return <AdminUpgrades store={store} patchServiceRequest={patchServiceRequest} />;
      case "software":          return <AdminSoftwareServices store={store} patchServiceRequest={patchServiceRequest} />;
      case "rentals":           return <AdminRentalWorkflow store={store} patchServiceRequest={patchServiceRequest} />;
      case "deliveries":        return <AdminDeliveries store={store} updateDeliveryStatus={updateDeliveryStatus} assignDeliveryStaff={assignDeliveryStaff} updateDelivery={updateDelivery} />;
      case "builds":            return <AdminCustomPC store={store} patchPCBuild={patchPCBuild} />;
      case "assembly":          return <AdminAssemblyService store={store} patchServiceRequest={patchServiceRequest} />;
      case "support":           return <AdminSupportWorkflow store={store} patchServiceRequest={patchServiceRequest} />;
      case "marketplace":       return <AdminSellRequests store={store} patchServiceRequest={patchServiceRequest} />;
      case "crm":               return <AdminCRM store={store} addCRMNote={addCRMNote} />;
      case "customers":         return <AdminCustomers store={store} addLog={addLog} />;
      case "staff":             return <AdminStaff store={store} addStaffMember={addStaffMember} />;
      case "suppliers":         return <AdminSuppliers store={store} addSupplier={addSupplier} />;
      case "purchase-orders":   return <AdminPurchaseOrders store={store} addPurchaseOrder={addPurchaseOrder} patchPurchaseOrder={patchPurchaseOrder} />;
      case "coupons":           return <AdminCoupons store={store} addCoupon={addCoupon} patchCoupon={patchCoupon} />;
      case "offers":            return <AdminOffers store={store} addOffer={addOffer} patchOffer={patchOffer} />;
      case "gaming":            return <AdminGamingHub store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "featured-builds":   return <AdminFeaturedBuilds store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "exclusive-offers": return <AdminExclusiveOffers store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "gaming-news":      return <AdminGamingNews store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "testimonials":     return <AdminTestimonials store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "faq":              return <AdminFAQ store={store} addGamingHubItem={addGamingHubItem} patchGamingHubItem={patchGamingHubItem} deleteGamingHubItem={deleteGamingHubItem} />;
      case "reports":          return <AdminReports store={store} />;
      case "notifications":     return <AdminNotifications store={store} addNotification={addNotification} markNotificationRead={markNotificationRead} archiveNotification={archiveNotification} />;
      case "settings":          return <AdminSettings store={store} updateSettings={updateSettings} />;
      case "audit":             return <AdminAuditLogs store={store} />;
      case "backup":            return <AdminBackup store={store} resetStore={data.resetStore} />;
      default:                  return <AdminOverview data={data} />;
    }
  };

  const unread = store.notifications.filter(n => !n.read && !n.archived && (n.audience === "all" || n.audience === "admins")).length;

  return (
    <DashboardLayout
      user={user}
      groups={groups}
      active={normalizedTab}
      onTabChange={handleTabChange}
      title="Admin"
      pageTitle={tabMeta.label}
      unreadCount={unread}
    >
      <AdminTabErrorBoundary active={normalizedTab}>
        {renderTab()}
      </AdminTabErrorBoundary>
    </DashboardLayout>
  );
}
