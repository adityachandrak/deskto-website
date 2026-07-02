import { useEffect, useState } from "react";
import {
  ShoppingBag, Wrench, Truck, TrendingUp, Bell, Package, Database, Tag, Award,
  Users, UserCog, Truck as TruckIcon, Receipt, Ticket, Settings, History,
  RefreshCcw, BarChart3, Plus, Search, Filter, AlertCircle, Save, Send,
  Download, Eye, Lock, Unlock, Zap, X, Gamepad2, MessageSquare, Archive,
  Cpu, Eye as EyeIcon, ClipboardList, GripVertical, ArrowUpDown, Trash2,
  Edit3, Copy, ToggleLeft, ChevronRight, Monitor, Smartphone, Tv,
  CheckCircle, Clock, Star,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { KPICard } from "./components/dashboard/KPICard";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { SectionCard } from "./components/dashboard/SectionCard";
import { DataTable, type Column } from "./components/dashboard/DataTable";
import { EmptyState } from "./components/dashboard/EmptyState";
import { mediaBlobUrl, mediaKind, mediaMime, mediaName, mediaRef, openMediaFile, hasValidRef, isMediaFile, revokeMediaBlobUrl } from "./lib/mediaStore";
import type {
  DashboardStore, Order, Repair, Rental, PCBuild, Assembly, SupportTicket,
  StaffMember, Supplier, PurchaseOrder, Coupon, NotificationItem, AuditLog,
  DashboardSettings, ServiceRequest, ServiceRequestKind, CatalogProduct,
  GamingHubItem, GamingHubContentType, GamingHubStatus,
  CustomBuilderConfig, ComponentCategory, MarketTag, BuildPurpose,
  PerformanceTier, BuilderComponent, BuilderContentConfig,
  Delivery,
} from "./lib/dashboardData";

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const formatDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const formatTime = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const PIE_COLORS = ["#FF1F45", "#00cc66", "#00b4ff", "#ff6b00", "#a855f7", "#ffd700"];
const AUTH_STORAGE_KEY = "deskto-auth-demo-state";
const REPAIR_STATUS_OPTIONS = [
  ["submitted", "Request Submitted"],
  ["received", "Request Received"],
  ["admin-approved", "Admin Approved"],
  ["assigned", "Technician Assigned"],
  ["device-received", "Device Received"],
  ["diagnosing", "Diagnosis Started"],
  ["quotation", "Quotation Sent"],
  ["quote-approved", "Quotation Approved"],
  ["paid", "Payment Successful"],
  ["in-repair", "Repair Started"],
  ["repair-progress", "Repair In Progress"],
  ["qc", "Quality Testing"],
  ["completed", "Repair Completed"],
  ["invoice-generated", "Invoice Generated"],
  ["warranty-generated", "Warranty Generated"],
  ["ready", "Ready for Pickup"],
  ["delivered", "Delivered"],
  ["review-requested", "Review Requested"],
  ["closed", "Closed"],
] as const;
const PC_BUILD_STATUS_OPTIONS = [
  ["submitted", "Build Request Submitted"],
  ["received", "Request Received"],
  ["admin-review", "Admin Review"],
  ["components-verified", "Components Verified"],
  ["quotation", "Quotation Sent"],
  ["approved", "Customer Approved"],
  ["paid", "Payment Successful"],
  ["reserved", "Components Reserved"],
  ["technician-assigned", "Technician Assigned"],
  ["assembling", "Assembly Started"],
  ["software-install", "Software Installed"],
  ["stress-test", "Stress Testing"],
  ["qc", "Quality Approved"],
  ["invoice-generated", "Invoice Generated"],
  ["warranty-generated", "Warranty Generated"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["review-requested", "Review Requested"],
] as const;

const SERVICE_STATUS_OPTIONS = [
  ["submitted", "Submitted"],
  ["received", "Received"],
  ["admin-approved", "Admin Approved"],
  ["technician-assigned", "Technician Assigned"],
  ["inspection", "Inspection"],
  ["diagnosis", "Diagnosis"],
  ["compatibility-verified", "Compatibility Verified"],
  ["documents-verified", "Documents Verified"],
  ["agreement-generated", "Agreement Generated"],
  ["quotation", "Quotation Sent"],
  ["offer-sent", "Offer Sent"],
  ["approved", "Customer Approved"],
  ["accepted", "Offer Accepted"],
  ["paid", "Payment Successful"],
  ["reserved", "Components Reserved"],
  ["prepared", "Product Prepared"],
  ["shipped", "Product Shipped"],
  ["active", "Rental Active"],
  ["return-requested", "Return Requested"],
  ["product-received", "Product Received"],
  ["refunded", "Deposit Refunded"],
  ["inventory-added", "Added to Inventory"],
  ["published", "Published for Resale"],
  ["session-scheduled", "Session Scheduled"],
  ["connected", "Technician Connected"],
  ["in-progress", "In Progress"],
  ["optimization", "Optimization"],
  ["data-recovery", "Data Recovery"],
  ["quality-testing", "Quality Testing"],
  ["invoice-generated", "Invoice Generated"],
  ["warranty-generated", "Warranty Generated"],
  ["ready", "Ready"],
  ["delivered", "Delivered"],
  ["completed", "Completed"],
  ["review-requested", "Review Requested"],
] as const;

type StaffOption = { id: string; name: string; email: string; department?: string };

function getAuthStaffOptions(): StaffOption[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    return users
      .filter((u: any) => String(u?.role || "").toLowerCase() === "staff")
      .map((u: any) => ({
        id: String(u.id || u.email),
        name: String(u.name || u.email || "Staff"),
        email: String(u.email || ""),
        department: u.department ? String(u.department) : "Staff Account",
      }));
  } catch {
    return [];
  }
}

function getAllStaffOptions(store: DashboardStore): StaffOption[] {
  const byEmail = new Map<string, StaffOption>();
  store.staff.forEach(s => byEmail.set(s.email.toLowerCase(), { id: s.id, name: s.name, email: s.email, department: s.department }));
  getAuthStaffOptions().forEach(s => {
    const key = s.email.toLowerCase() || s.id;
    if (!byEmail.has(key)) byEmail.set(key, s);
  });
  return Array.from(byEmail.values());
}

function useAuthStaffRefresh() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick(t => t + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return tick;
}

async function openRepairMedia(file: string) {
  const name = mediaName(file);
  const ref = mediaRef(file);

  // Check if file has valid reference
  if (!ref || (!ref.startsWith("idb:") && !ref.startsWith("data:"))) {
    toast.error(`${name} - File reference missing. Customer needs to re-upload.`);
    return;
  }

  try {
    const mediaWindow = window.open("", "_blank");
    const opened = await openMediaFile(file, mediaWindow);
    if (!opened) {
      if (mediaWindow && !mediaWindow.closed) mediaWindow.close();
      toast.error(`${name} could not be opened. Please re-upload the file.`);
    }
  } catch {
    toast.error(`Could not open ${name}.`);
  }
}

function MediaPreviewButton({ file, index, onPreview }: { file: string; index: number; onPreview: (name: string, url: string) => void }) {
  const [preview, setPreview] = useState("");
  const ref = mediaRef(file);
  const hasRef = ref && (ref.startsWith("idb:") || ref.startsWith("data:"));
  const isImage = mediaMime(file).startsWith("image/");
  const name = mediaName(file);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!hasRef || !isImage) {
      setPreview("");
      return;
    }
    if (ref.startsWith("data:")) {
      setPreview(ref);
      return;
    }
    mediaBlobUrl(file).then(url => {
      if (!active) {
        if (url) revokeMediaBlobUrl(url);
        return;
      }
      objectUrl = url;
      setPreview(url);
    });
    return () => {
      active = false;
      if (objectUrl) revokeMediaBlobUrl(objectUrl);
    };
  }, [file, hasRef, isImage, ref]);

  return (
    <button
      className={`glass-pill glass-pill-sm ${hasRef ? "glass-pill-outline" : "glass-pill-red"}`}
      title={hasRef ? `Open ${name}` : `${name} is missing its saved file reference`}
      style={{ justifyContent: "flex-start", maxWidth: 220, minHeight: 38, overflow: "hidden", textOverflow: "ellipsis", opacity: hasRef ? 1 : 0.6, padding: "6px 8px" }}
      onClick={() => {
        if (isImage && preview) {
          onPreview(name, preview);
          return;
        }
        openRepairMedia(file);
      }}
    >
      {preview ? (
        <img src={preview} alt="" style={{ width: 24, height: 24, borderRadius: 5, objectFit: "cover", border: "1px solid rgba(255,255,255,.18)", flex: "0 0 auto" }} />
      ) : (
        <Eye size={12} style={{ flex: "0 0 auto" }} />
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {mediaKind(file)} {index + 1} · {name}
        {!hasRef && " !"}
      </span>
    </button>
  );
}

function MediaCell({ files }: { files?: string[] }) {
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
        {!files?.length ? <span style={{ color: "#777", fontSize: 11 }}>No uploads</span> : files.map((file, idx) => (
          <MediaPreviewButton key={`${file}-${idx}`} file={file} index={idx} onPreview={(name, url) => setPreview({ name, url })} />
        ))}
      </div>
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} className="glass-card" style={{ width: "min(92vw, 980px)", maxHeight: "90vh", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview.name}</div>
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => setPreview(null)}><X size={12} /> Close</button>
            </div>
            <div style={{ minHeight: 280, maxHeight: "76vh", borderRadius: 10, background: "#050505", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={preview.url} alt={preview.name} style={{ maxWidth: "100%", maxHeight: "76vh", objectFit: "contain" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────

export function AdminOverview({ data, onTab }: { data: ReturnType<typeof import("./lib/dashboardData").useDashboardData>; onTab?: (tab: string) => void }) {
  const { store } = data;
  const go = (tab: string) => onTab && onTab(tab);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaysOrders = store.orders.filter(o => o.createdAt >= todayStart.getTime());
  const totalRevenue = store.orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const lowStock = store.products.filter(p => p.stock < 5).length;
  
  const activeBuilds = store.pcBuilds.filter(b => !["delivered", "cancelled"].includes(b.status)).length;
  const openServices = store.serviceRequests.filter(s => !["completed", "cancelled"].includes(s.status)).length;
  const pendingDeliveries = store.orders.filter(o => ["packing", "shipped"].includes(o.status)).length;
  const staffOnline = store.staff.length; // Mock, real impl would check last active

  // 7-day revenue chart (mock — derived from orders)
  const dayBuckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  store.orders.forEach(o => {
    const k = new Date(o.createdAt).toISOString().slice(0, 10);
    if (k in dayBuckets) dayBuckets[k] += o.total;
  });
  const chartData = Object.entries(dayBuckets).map(([date, revenue]) => ({
    date: date.slice(5),
    revenue,
  }));

  // Sales by category
  const byCat: Record<string, number> = {};
  store.orders.forEach(o => o.items.forEach(i => {
    const p = store.products.find(x => x.id === i.productId);
    byCat[p?.category || "other"] = (byCat[p?.category || "other"] || 0) + i.qty * i.price;
  }));
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value }));
  
  // Pipeline counts
  const orderCounts = {
    placed: store.orders.filter(o => o.status === "placed").length,
    verified: store.orders.filter(o => o.status === "verified").length,
    packing: store.orders.filter(o => o.status === "packing").length,
    shipped: store.orders.filter(o => o.status === "shipped").length,
    delivered: store.orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="dash-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <KPICard label="Today's Sales" value={inr(todaysOrders.reduce((s, o) => s + o.total, 0))} icon={<TrendingUp size={14} />} color="#00cc66" delta={{ value: 8, positive: true }} onClick={() => go("orders")} />
        <KPICard label="Orders Today" value={todaysOrders.length} icon={<ShoppingBag size={14} />} color="#FF1F45" hint={`${store.orders.length} total`} onClick={() => go("orders")} />
        <KPICard label="Revenue (Delivered)" value={inr(totalRevenue)} icon={<TrendingUp size={14} />} color="#00b4ff" delta={{ value: 14, positive: true }} onClick={() => go("orders")} />
        <KPICard label="Open Repairs" value={store.repairs.filter(r => !["ready", "delivered"].includes(r.status)).length} icon={<Wrench size={14} />} color="#ff6b00" onClick={() => go("repairs")} />
        <KPICard label="Active PC Builds" value={activeBuilds} icon={<Cpu size={14} />} color="#a855f7" onClick={() => go("builds")} />
        <KPICard label="Open Services" value={openServices} icon={<Zap size={14} />} color="#ffd700" onClick={() => go("upgrades")} />
        <KPICard label="Pending Deliveries" value={pendingDeliveries} icon={<TruckIcon size={14} />} color="#00cc66" onClick={() => go("deliveries")} />
        <KPICard label="Staff Online" value={staffOnline} icon={<Users size={14} />} color="#00b4ff" onClick={() => go("staff")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <SectionCard title="Weekly Revenue" subtitle="Last 7 days">
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#FF1F45" strokeWidth={2} dot={{ fill: "#FF1F45" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Sales by Category">
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <SectionCard title="Order Status Pipeline" subtitle="Current snapshot of all active orders">
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", overflowX: "auto", paddingBottom: 10 }}>
            {[
              { label: "Placed", count: orderCounts.placed, color: "#aaa" },
              { label: "Verified", count: orderCounts.verified, color: "#00b4ff" },
              { label: "Packing", count: orderCounts.packing, color: "#ff6b00" },
              { label: "Shipped", count: orderCounts.shipped, color: "#a855f7" },
              { label: "Delivered", count: orderCounts.delivered, color: "#00cc66" }
            ].map((stage, i, arr) => (
              <div key={stage.label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                <div className="glass" style={{ flex: 1, padding: "12px 16px", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, borderTop: `2px solid ${stage.color}` }}>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>{stage.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{stage.count}</div>
                </div>
                {i < arr.length - 1 && <ChevronRight size={16} color="#444" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <SectionCard title="Pending Actions" subtitle="Items that require admin attention">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {store.repairs.filter(r => r.status === "submitted").map(r => (
              <div key={r.id} className="glass" style={{ padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "white", fontWeight: 600 }}>Unassigned Repair: {r.device}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Customer: {r.customerName}</div>
                </div>
                <button className="glass-pill glass-pill-primary" style={{ fontSize: 10 }}>Assign</button>
              </div>
            ))}
            {store.pcBuilds.filter(b => b.status === "submitted").map(b => (
              <div key={b.id} className="glass" style={{ padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "white", fontWeight: 600 }}>New Build Request: {b.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Customer: {b.customerName}</div>
                </div>
                <button className="glass-pill glass-pill-info" style={{ fontSize: 10 }}>Review</button>
              </div>
            ))}
            {store.serviceRequests.filter(s => s.status === "submitted").map(s => (
              <div key={s.id} className="glass" style={{ padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "white", fontWeight: 600 }}>New {s.kind} Request</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.device || s.productName}</div>
                </div>
                <button className="glass-pill glass-pill-outline" style={{ fontSize: 10 }}>Process</button>
              </div>
            ))}
            {store.repairs.filter(r => r.status === "submitted").length === 0 && store.pcBuilds.filter(b => b.status === "submitted").length === 0 && store.serviceRequests.filter(s => s.status === "submitted").length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#666", fontSize: 12 }}>You're all caught up! No pending items.</div>
            )}
          </div>
        </SectionCard>
        
        <SectionCard title="Recent Activity" subtitle="Real-time audit log of system events">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
            {store.auditLogs.slice(0, 15).map(log => (
              <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <History size={14} color="#aaa" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#eee" }}>
                    <span style={{ color: "#a855f7", fontWeight: 600 }}>{log.actor || "System"}</span> {log.event.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{log.detail}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{new Date(log.at).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {store.auditLogs.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#666", fontSize: 12 }}>No recent activity.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────

const emptyCatalogDraft = (): Partial<CatalogProduct> => ({
  name: "",
  brand: "",
  model: "",
  category: "monitor",
  type: "general",
  condition: "first-hand",
  sku: "",
  price: 0,
  orig: 0,
  stock: 1,
  inStock: true,
  rating: 4.8,
  reviews: 0,
  badge: "NEW",
  warrantyMonths: 36,
  rgb: false,
  specs: [],
  gallery: [],
  img: "",
  operatingSystem: "",
  weight: "",
  dimensions: "",
  processor: "",
  gpu: "",
  ram: "",
  storage: "",
  display: "",
  refreshRate: "",
  powerRequirement: "",
  ports: "",
  description: "",
  technicalDetails: "",
  useCase: "",
  performanceNotes: "",
  qualityNotes: "",
  features: [],
  boxContents: [],
  compatibility: [],
  upgradeOptions: [],
  recommendedAccessories: [],
  supportedPlatforms: [],
  limitations: [],
  deliveryInfo: { homeDelivery: true, storePickup: true, estimatedDelivery: "3-5 working days", shippingCharges: 0, freeShippingAbove: 50000, returnPolicy: "7-day returns" },
  warrantyInfo: { type: "Manufacturer Warranty", claimProcess: "Contact DESKTO support via WhatsApp or call with serial number and invoice.", pickupPolicy: "Pickup/check arranged by DESKTO where available.", repairTerms: "Repair or replacement under warranty terms." },
  seo: { slug: "", keywords: [], metaTitle: "", metaDescription: "", tags: [] },
  catalogStatus: "draft",
});

function csvList(value?: string[] | null) {
  return (value || []).filter(Boolean).join(" | ");
}

function splitList(value: string) {
  // Split by pipe character, handling various spacing patterns
  return value.split(/\|/).map(v => v.trim()).filter(v => v.length > 0);
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: any; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, letterSpacing: 0, textTransform: "none" }} />
    </label>
  );
}

function Area({ label, value, onChange, placeholder }: { label: string; value: any; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <textarea value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} rows={3} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, resize: "vertical", letterSpacing: 0, textTransform: "none" }} />
    </label>
  );
}

// Inputs for "pipe | separated" list fields. They keep the raw text the admin is
// typing in local state so spaces and trailing "|" are preserved (the previous
// approach re-split into an array every keystroke, which stripped them and made
// the boxes feel impossible to type into). The parent still receives a clean
// string array. External value changes (switching items) re-sync the text.
function PipeListArea({ label, value, onChange, placeholder }: { label: string; value?: string[] | null; onChange: (list: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState<string>(() => csvList(value));
  useEffect(() => {
    const external = csvList(value);
    if (external !== csvList(splitList(text))) setText(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label style={{ display: "grid", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <textarea value={text} placeholder={placeholder} onChange={e => { setText(e.target.value); onChange(splitList(e.target.value)); }} rows={3} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, resize: "vertical", letterSpacing: 0, textTransform: "none" }} />
    </label>
  );
}

function PipeListField({ label, value, onChange, placeholder }: { label: string; value?: string[] | null; onChange: (list: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState<string>(() => csvList(value));
  useEffect(() => {
    const external = csvList(value);
    if (external !== csvList(splitList(text))) setText(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label style={{ display: "grid", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <input type="text" value={text} placeholder={placeholder} onChange={e => { setText(e.target.value); onChange(splitList(e.target.value)); }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, letterSpacing: 0, textTransform: "none" }} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: any; onChange: (value: string) => void; options: string[] }) {
  return (
    <label style={{ display: "grid", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function validateCatalogProduct(product: Partial<CatalogProduct>, publish = false) {
  if (!product.name?.trim()) return "Product name is required.";
  if (!product.brand?.trim()) return "Brand is required.";
  if (!Number(product.price || 0)) return "Price is required.";
  if (Number(product.stock || 0) < 0) return "Stock cannot be negative.";
  if (publish) {
    const gallery = product.gallery || [];
    if (gallery.length < 1) return "Upload at least 1 JPG image before publishing.";
    if ((product.specs || []).filter(Boolean).length < 1) return "Add at least 1 key spec before publishing.";
    if (!product.description?.trim()) return "Product overview is required before publishing.";
    if ((product.features || []).filter(Boolean).length < 1) return "Add at least 1 feature before publishing.";
  }
  return null;
}

function AdminCatalogEditor({ draft, setDraft, onSave, onClose }: { draft: Partial<CatalogProduct>; setDraft: (value: Partial<CatalogProduct> | ((prev: Partial<CatalogProduct>) => Partial<CatalogProduct>)) => void; onSave: (status: "draft" | "published") => void; onClose: () => void }) {
  const set = (patch: Partial<CatalogProduct>) => setDraft(prev => ({ ...prev, ...patch }));
  const setDelivery = (patch: Partial<NonNullable<CatalogProduct["deliveryInfo"]>>) => setDraft(prev => ({ ...prev, deliveryInfo: { ...(prev.deliveryInfo || emptyCatalogDraft().deliveryInfo!), ...patch } }));
  const setWarranty = (patch: Partial<NonNullable<CatalogProduct["warrantyInfo"]>>) => setDraft(prev => ({ ...prev, warrantyInfo: { ...(prev.warrantyInfo || emptyCatalogDraft().warrantyInfo!), ...patch } }));
  const setSeo = (patch: Partial<NonNullable<CatalogProduct["seo"]>>) => setDraft(prev => ({ ...prev, seo: { ...(prev.seo || emptyCatalogDraft().seo!), ...patch } }));
  const onImages = async (files: FileList | null, inputRef: HTMLInputElement | null) => {
    const selected = Array.from(files || []);
    if (selected.length === 0) return;
    // Validate JPG/JPEG only
    const invalid = selected.find(file => !/jpe?g$/i.test(file.name) && !["image/jpeg", "image/jpg"].includes(file.type));
    if (invalid) return toast.error(`"${invalid.name}" is not a JPG/JPEG image`);
    const existingCount = draft.gallery?.length || 0;
    const available = 5 - existingCount;
    if (available <= 0) return toast.error("Maximum 5 images already reached");
    const toUpload = selected.slice(0, available);
    if (selected.length > available) toast.warning(`Only ${available} more image${available !== 1 ? "s" : ""} can be added (max 5 total)`);
    const reads = toUpload.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));
    const newImages = await Promise.all(reads);
    const updatedGallery = [...(draft.gallery || []), ...newImages].slice(0, 5);
    setDraft(prev => ({ ...prev, gallery: updatedGallery, img: prev.img || updatedGallery[0] }));
    toast.success(`${newImages.length} JPG image${newImages.length > 1 ? "s" : ""} added`);
    // Clear the file input so the same file can be selected again
    if (inputRef) inputRef.value = "";
  };
  return (
    <div className="glass-card" style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: "white", margin: 0, fontSize: 15 }}>Catalog Product Editor</h3>
        <button className="glass-pill glass-pill-outline glass-pill-sm" onClick={onClose}>Close</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <Field label="Product Name" value={draft.name} onChange={v => set({ name: v })} />
        <Field label="Brand" value={draft.brand} onChange={v => set({ brand: v })} />
        <Field label="Model" value={draft.model} onChange={v => set({ model: v })} />
        <Field label="SKU" value={draft.sku} onChange={v => set({ sku: v })} />
        <SelectField label="Type" value={draft.type} onChange={v => set({ type: v as CatalogProduct["type"] })} options={["gaming", "general"]} />
        <SelectField label="Condition" value={draft.condition} onChange={v => set({ condition: v as CatalogProduct["condition"] })} options={["first-hand", "second-hand"]} />
        <Field label="Category" value={draft.category} onChange={v => set({ category: v })} />
        <Field label="Badge" value={draft.badge || ""} onChange={v => set({ badge: v || null })} />
        <Field label="Price" type="number" value={draft.price} onChange={v => set({ price: Number(v || 0) })} />
        <Field label="Original Price" type="number" value={draft.orig || ""} onChange={v => set({ orig: Number(v || 0) || null })} />
        <Field label="Stock Qty" type="number" value={draft.stock} onChange={v => set({ stock: Number(v || 0), inStock: Number(v || 0) > 0 })} />
        <Field label="Warranty Months" type="number" value={draft.warrantyMonths} onChange={v => set({ warrantyMonths: Number(v || 0) })} />
        <SelectField label="Stock Status" value={draft.inStock ? "in-stock" : "out-of-stock"} onChange={v => set({ inStock: v === "in-stock" })} options={["in-stock", "out-of-stock"]} />
        <SelectField label="RGB Support" value={draft.rgb ? "Yes" : "No"} onChange={v => set({ rgb: v === "Yes" })} options={["Yes", "No"]} />
      </div>
      <label style={{ display: "grid", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>
        Product Images ({draft.gallery?.length || 0}/5 JPG)
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="file" accept=".jpg,.jpeg,image/jpeg" multiple onChange={e => onImages(e.target.files, e.target)} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 10, color: "white", flex: 1 }} />
        </div>
      </label>
      {!!draft.gallery?.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {draft.gallery.slice(0, 5).map((src, index) => (
            <div key={index} style={{ position: "relative" }}>
              <img src={src} alt={`catalog-${index + 1}`} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: index === 0 ? "2px solid #FF1F45" : "1px solid rgba(255,255,255,.12)" }} />
              <button onClick={() => setDraft(prev => { const gal = [...(prev.gallery || [])]; gal.splice(index, 1); return { ...prev, gallery: gal, img: gal[0] || "" }; })} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#FF1F45", border: "none", color: "white", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              {index === 0 && <span style={{ position: "absolute", bottom: 2, left: 2, fontSize: 8, background: "#FF1F45", color: "white", borderRadius: 3, padding: "1px 3px" }}>MAIN</span>}
            </div>
          ))}
          {(draft.gallery?.length || 0) < 5 && (
            <label style={{ width: 70, height: 70, border: "2px dashed rgba(255,255,255,.2)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", fontSize: 10, gap: 2 }}>
              <span style={{ fontSize: 16 }}>+</span>
              <span>Add</span>
              <input type="file" accept=".jpg,.jpeg,image/jpeg" multiple onChange={e => onImages(e.target.files, e.target)} style={{ display: "none" }} />
            </label>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <PipeListArea label="Key Specs (pipe | separated)" value={draft.specs} onChange={list => set({ specs: list })} placeholder="Intel i9 | 64GB DDR5 | 4TB NVMe" />
        <PipeListArea label="Features (pipe | separated)" value={draft.features} onChange={list => set({ features: list })} placeholder="RGB lighting | Liquid cooling | WiFi 6E" />
        <PipeListArea label="Box Contents (pipe | separated)" value={draft.boxContents} onChange={list => set({ boxContents: list })} placeholder="PC | Power cable | Manual" />
        <PipeListArea label="Compatibility (pipe | separated)" value={draft.compatibility} onChange={list => set({ compatibility: list })} placeholder="Windows 11 | Linux" />
        <PipeListArea label="Upgrade Options (pipe | separated)" value={draft.upgradeOptions} onChange={list => set({ upgradeOptions: list })} placeholder="Add RAM | Add storage" />
        <PipeListArea label="Recommended Accessories (pipe | separated)" value={draft.recommendedAccessories} onChange={list => set({ recommendedAccessories: list })} placeholder="Monitor | Keyboard | Mouse" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <Field label="Operating System / Compatibility" value={draft.operatingSystem} onChange={v => set({ operatingSystem: v })} />
        <Field label="Weight" value={draft.weight} onChange={v => set({ weight: v })} />
        <Field label="Dimensions" value={draft.dimensions} onChange={v => set({ dimensions: v })} />
        <Field label="Processor / Chipset" value={draft.processor} onChange={v => set({ processor: v })} />
        <Field label="GPU" value={draft.gpu} onChange={v => set({ gpu: v })} />
        <Field label="RAM" value={draft.ram} onChange={v => set({ ram: v })} />
        <Field label="Storage" value={draft.storage} onChange={v => set({ storage: v })} />
        <Field label="Display" value={draft.display} onChange={v => set({ display: v })} />
        <Field label="Refresh Rate" value={draft.refreshRate} onChange={v => set({ refreshRate: v })} />
        <Field label="Power Requirement" value={draft.powerRequirement} onChange={v => set({ powerRequirement: v })} />
        <Field label="Ports / Connectivity" value={draft.ports} onChange={v => set({ ports: v })} />
      </div>
      <Area label="Product Overview" value={draft.description} onChange={v => set({ description: v })} />
      <Area label="Technical Details" value={draft.technicalDetails} onChange={v => set({ technicalDetails: v })} />
      <Area label="Use Case / Performance / Quality Notes" value={[draft.useCase, draft.performanceNotes, draft.qualityNotes].filter(Boolean).join("\n")} onChange={v => { const lines = v.split("\n"); set({ useCase: lines[0] || "", performanceNotes: lines[1] || "", qualityNotes: lines.slice(2).join(" ") }); }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <Field label="Estimated Delivery" value={draft.deliveryInfo?.estimatedDelivery} onChange={v => setDelivery({ estimatedDelivery: v })} />
        <Field label="Shipping Charges" type="number" value={draft.deliveryInfo?.shippingCharges} onChange={v => setDelivery({ shippingCharges: Number(v || 0) })} />
        <Field label="Free Shipping Above" type="number" value={draft.deliveryInfo?.freeShippingAbove} onChange={v => setDelivery({ freeShippingAbove: Number(v || 0) })} />
        <Field label="Return Policy" value={draft.deliveryInfo?.returnPolicy} onChange={v => setDelivery({ returnPolicy: v })} />
        <Field label="Warranty Type" value={draft.warrantyInfo?.type} onChange={v => setWarranty({ type: v })} />
        <Field label="Claim Process" value={draft.warrantyInfo?.claimProcess} onChange={v => setWarranty({ claimProcess: v })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <Field label="SEO Slug" value={draft.seo?.slug} onChange={v => setSeo({ slug: v })} />
        <Field label="Meta Title" value={draft.seo?.metaTitle} onChange={v => setSeo({ metaTitle: v })} />
        <Field label="Meta Description" value={draft.seo?.metaDescription} onChange={v => setSeo({ metaDescription: v })} />
        <PipeListArea label="Keywords / Tags (pipe | separated)" value={[...(draft.seo?.keywords || []), ...(draft.seo?.tags || [])]} onChange={list => setSeo({ keywords: list, tags: list })} placeholder="gaming pc | rtx 5090 | custom build" />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="glass-pill glass-pill-outline" onClick={() => onSave("draft")}>Save Draft</button>
        <button className="glass-pill glass-pill-primary" onClick={() => onSave("published")}>Publish Product</button>
      </div>
    </div>
  );
}

export function AdminProducts({ store, addCatalogProduct, patchCatalogProduct, deleteCatalogProduct }: { store: DashboardStore; addCatalogProduct: (p: Omit<CatalogProduct, "id" | "createdAt" | "updatedAt"> & { id?: number; createdAt?: number }) => CatalogProduct; patchCatalogProduct: (id: number, patch: Partial<CatalogProduct>) => void; deleteCatalogProduct: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<CatalogProduct> | null>(null);
  const filtered = store.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const save = (status: "draft" | "published") => {
    if (!editing) return;
    const error = validateCatalogProduct(editing, status === "published");
    if (error) return toast.error(error);
    const product = {
      ...emptyCatalogDraft(),
      ...editing,
      catalogStatus: status,
      inStock: Boolean(editing.inStock),
      stock: Number(editing.stock || 0),
      price: Number(editing.price || 0),
      rating: Number(editing.rating || 4.8),
      reviews: Number(editing.reviews || 0),
      popularity: Number(editing.popularity || 0),
      sales: Number(editing.sales || 0),
      img: editing.img || editing.gallery?.[0] || "",
    } as CatalogProduct;
    if (product.id) patchCatalogProduct(product.id, product);
    else addCatalogProduct(product as Omit<CatalogProduct, "id" | "createdAt" | "updatedAt">);
    toast.success(status === "published" ? "Product published to shop catalog" : "Catalog draft saved");
    setEditing(null);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
    <SectionCard title="Catalog Management" subtitle={`${store.products.length} SKUs`}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "8px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none", width: 200 }} />
          <button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setEditing(emptyCatalogDraft())}><Plus size={12} /> Add New Product</button>
        </div>
      }
    >
      <DataTable
        rowKey={p => p.id.toString()}
        data={filtered}
        columns={[
          { key: "id", label: "ID", width: "60px", render: p => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>#{p.id}</span> },
          { key: "name", label: "Name", render: p => <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{p.img && <img src={p.img} alt={p.name} style={{ width: 38, height: 30, objectFit: "cover", borderRadius: 6 }} />}<span>{p.name}</span></div> },
          { key: "brand", label: "Brand" },
          { key: "category", label: "Category" },
          { key: "status", label: "Catalog", render: p => <StatusBadge status={p.catalogStatus || "published"} /> },
          { key: "media", label: "JPGs", render: p => `${p.gallery?.length || (p.img ? 1 : 0)}/5` },
          { key: "price", label: "Price", align: "right", render: p => inr(p.price) },
          { key: "stock", label: "Stock", align: "right", render: p => <span style={{ color: p.stock < 5 ? "#FF1F45" : "#ddd" }}>{p.stock}</span> },
          { key: "actions", label: "", render: p => <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setEditing(p); }}>Edit</button><button className="glass-pill glass-pill-sm glass-pill-info" onClick={(e) => { e.stopPropagation(); patchCatalogProduct(p.id, { catalogStatus: p.catalogStatus === "archived" ? "published" : "archived", inStock: false }); }}>{p.catalogStatus === "archived" ? "Restore" : "Archive"}</button><button className="glass-pill glass-pill-sm glass-pill-red" onClick={(e) => { e.stopPropagation(); deleteCatalogProduct(p.id); }}>Delete</button></div> },
        ]}
      />
    </SectionCard>
    {editing && <AdminCatalogEditor draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ─── Gaming Hub Management ───────────────────────────────────────────────

const GAMING_TYPES: { value: GamingHubContentType; label: string }[] = [
  { value: "gaming-news", label: "Gaming News" },
  { value: "latest-hardware", label: "Latest Hardware" },
  { value: "esports-update", label: "Esports Update" },
  { value: "game-release", label: "Game Release" },
  { value: "gaming-tip", label: "Gaming Tip" },
  { value: "benchmark-result", label: "Benchmark Result" },
  { value: "product-review", label: "Product Review" },
  { value: "community-blog", label: "Community Blog" },
  { value: "featured-build", label: "Featured Build" },
  { value: "offer", label: "Offer" },
  { value: "testimonial", label: "Testimonial" },
  { value: "faq", label: "FAQ" },
];

const gamingSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function emptyGamingDraft(): Partial<GamingHubItem> {
  return {
    type: "gaming-news",
    title: "",
    slug: "",
    category: "Gaming News",
    shortDescription: "",
    author: "DESKTO Editorial",
    tags: [],
    publishDate: Date.now(),
    status: "draft",
    coverImage: "",
    thumbnailImage: "",
    gallery: [],
    intro: "",
    body: "",
    specs: "",
    benchmarkData: "",
    pros: [],
    cons: [],
    tips: [],
    offerDetails: "",
    discount: "",
    ctaText: "",
    ctaHref: "",
    relatedServiceSlugs: [],
    showOnHub: true,
    showInCategory: true,
    featured: false,
    trending: false,
    showInLatestNews: false,
    showInExclusiveOffers: false,
    showInSignatureMachines: false,
    bannerImage: "",
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    order: 0,
  };
}

function validateGamingHubItem(item: Partial<GamingHubItem>, publish: boolean, lenient = false) {
  if (!item.title?.trim()) return "Title is required.";
  // Homepage content forms (Featured Builds, Offers, News, etc.) only need a
  // title — slug/category are auto-generated and all other fields are optional.
  if (lenient) return null;
  if (!item.slug?.trim()) return "Slug is required.";
  if (!item.category?.trim()) return "Category is required.";
  if (publish && !item.coverImage) return "Cover image is required before publishing.";
  if (publish && !item.shortDescription?.trim()) return "Short description is required before publishing.";
  if (publish && !item.body?.trim()) return "Article body is required before publishing.";
  return null;
}

function readGamingImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const invalid = !["image/jpeg", "image/png", "image/webp"].includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name);
    if (invalid) reject(new Error("Only JPG, JPEG, PNG, or WEBP images are allowed"));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminGamingHubEditor({ draft, setDraft, onSave, onClose }: {
  draft: Partial<GamingHubItem>;
  setDraft: (value: Partial<GamingHubItem> | ((prev: Partial<GamingHubItem>) => Partial<GamingHubItem>)) => void;
  onSave: (status: GamingHubStatus) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<GamingHubItem>) => setDraft(prev => ({ ...prev, ...patch }));
  const uploadSingle = async (file: File | undefined, key: "coverImage" | "thumbnailImage" | "bannerImage") => {
    if (!file) return;
    try {
      const img = await readGamingImage(file);
      setDraft(prev => ({ ...prev, [key]: img, ...(key === "coverImage" && !prev.thumbnailImage ? { thumbnailImage: img } : {}) }));
      toast.success(`${key === "coverImage" ? "Cover" : key === "thumbnailImage" ? "Thumbnail" : "Banner"} image added`);
    } catch (error: any) {
      toast.error(error?.message || "Image upload failed");
    }
  };
  const uploadGallery = async (index: number, file: File | undefined) => {
    if (!file) return;
    try {
      const img = await readGamingImage(file);
      setDraft(prev => {
        const gallery = [...(prev.gallery || [])];
        gallery[index] = img;
        return { ...prev, gallery: gallery.slice(0, 5) };
      });
      toast.success(`Gallery image ${index + 1} added`);
    } catch (error: any) {
      toast.error(error?.message || "Image upload failed");
    }
  };
  return (
    <div className="glass-card" style={{ padding: 16, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: "white", margin: 0, fontSize: 15 }}>Gaming Hub Content Editor</h3>
        <button className="glass-pill glass-pill-outline glass-pill-sm" onClick={onClose}>Close</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        <SelectField label="Content Type" value={draft.type} onChange={v => { const label = GAMING_TYPES.find(t => t.value === v)?.label || v; set({ type: v as GamingHubContentType, category: label }); }} options={GAMING_TYPES.map(t => t.value)} />
        <Field label="Title (required)" value={draft.title} onChange={v => set({ title: v, slug: draft.slug || gamingSlug(v), metaTitle: draft.metaTitle || v })} placeholder="e.g. RTX 5090 Beast Build" />
        <Field label="Slug (auto from title)" value={draft.slug} onChange={v => set({ slug: gamingSlug(v) })} placeholder="auto-generated, e.g. rtx-5090-beast-build" />
        <Field label="Category" value={draft.category} onChange={v => set({ category: v })} placeholder="e.g. Signature Machines" />
        <Field label="Author" value={draft.author} onChange={v => set({ author: v })} placeholder="e.g. DESKTO Editorial" />
        <Field label="Publish Date" type="date" value={new Date(draft.publishDate || Date.now()).toISOString().slice(0, 10)} onChange={v => set({ publishDate: new Date(v).getTime() || Date.now() })} />
      </div>
      <Area label="Short Description (shown on the home card)" value={draft.shortDescription} onChange={v => set({ shortDescription: v, metaDescription: draft.metaDescription || v })} placeholder="One line shown under the title on the home page, e.g. A no-compromise 4K build tuned for silent performance." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <label style={{ display: "grid", gap: 8, color: "#888", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Cover Image
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => uploadSingle(e.target.files?.[0], "coverImage")} style={{ color: "white" }} />
          {draft.coverImage && <img src={draft.coverImage} alt="cover" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)" }} />}
        </label>
        <label style={{ display: "grid", gap: 8, color: "#888", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Thumbnail Image
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => uploadSingle(e.target.files?.[0], "thumbnailImage")} style={{ color: "white" }} />
          {draft.thumbnailImage && <img src={draft.thumbnailImage} alt="thumbnail" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)" }} />}
        </label>
        <label style={{ display: "grid", gap: 8, color: "#888", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Banner Image (Homepage)
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => uploadSingle(e.target.files?.[0], "bannerImage")} style={{ color: "white" }} />
          <input className="glass-input" placeholder="Or paste image URL" value={draft.bannerImage || ""} onChange={e => set({ bannerImage: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", color: "white", fontSize: 11 }} />
          {draft.bannerImage && <img src={draft.bannerImage} alt="banner" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,31,69,0.3)" }} />}
        </label>
        <label style={{ display: "grid", gap: 8, color: "#888", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Cover Image URL
          <input className="glass-input" placeholder="Paste cover image URL" value={draft.coverImage || ""} onChange={e => set({ coverImage: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", color: "white", fontSize: 11 }} />
        </label>
      </div>
      <div>
        <div style={{ color: "#888", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Gallery Images (5 max)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <label key={index} style={{ minHeight: 118, border: "1px dashed rgba(255,255,255,.18)", borderRadius: 8, display: "grid", placeItems: "center", padding: 8, cursor: "pointer", overflow: "hidden" }}>
              {draft.gallery?.[index] ? <img src={draft.gallery[index]} alt={`gallery ${index + 1}`} style={{ width: "100%", height: 104, objectFit: "cover", borderRadius: 6 }} /> : <span style={{ color: "#777", fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>Image {index + 1}</span>}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => uploadGallery(index, e.target.files?.[0])} style={{ display: "none" }} />
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <Area label="Intro (opening line on the details page)" value={draft.intro} onChange={v => set({ intro: v })} placeholder="Short intro paragraph for the details page." />
        <Area label="Main Article Body (full details)" value={draft.body} onChange={v => set({ body: v })} placeholder="Full description shown on the details page. For testimonials/FAQ this is the review text / answer." />
        <Area label="Specs (free text)" value={draft.specs} onChange={v => set({ specs: v })} placeholder="e.g. RTX 4090, Intel Core i9, 64GB DDR5, 4TB NVMe" />
        <Area label="Benchmark Data (free text)" value={draft.benchmarkData} onChange={v => set({ benchmarkData: v })} placeholder="e.g. 4K Ultra 120+ FPS, Cinebench 38000" />
        <PipeListArea label="Tips (pipe | separated)" value={draft.tips} onChange={list => set({ tips: list })} placeholder="Tip one | Tip two | Tip three" />
        <PipeListArea label="Pros (pipe | separated)" value={draft.pros} onChange={list => set({ pros: list })} placeholder="Silent cooling | Clean cable management" />
        <PipeListArea label="Cons (pipe | separated)" value={draft.cons} onChange={list => set({ cons: list })} placeholder="Premium price | Limited stock" />
        <PipeListArea label="Tags (pipe | separated)" value={draft.tags} onChange={list => set({ tags: list })} placeholder="custom pc | signature build | 4k" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <Field label="Offer Details" value={draft.offerDetails} onChange={v => set({ offerDetails: v })} placeholder="e.g. Save Rs. 35,000 on the RTX 4090 Beast Build" />
        <Field label="Discount (badge on card)" value={draft.discount} onChange={v => set({ discount: v })} placeholder="e.g. 11% OFF" />
        <Field label="CTA Text" value={draft.ctaText} onChange={v => set({ ctaText: v })} placeholder="e.g. Claim Offer" />
        <Field label="CTA Link" value={draft.ctaHref} onChange={v => set({ ctaHref: v })} placeholder="e.g. /services/custom-pc" />
        <PipeListField label="Related Services (pipe | separated)" value={draft.relatedServiceSlugs} onChange={list => set({ relatedServiceSlugs: list })} placeholder="custom-pc | repair" />
        <Field label="Display Order" type="number" value={String(draft.order ?? 0)} onChange={v => set({ order: Number(v) || 0 })} placeholder="0 = first" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#ccc", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
        {[
          ["showOnHub", "Show on Gaming Hub"],
          ["showInCategory", "Show in Category"],
          ["featured", "Featured"],
          ["trending", "Trending"],
          ["showInLatestNews", "Latest News"],
          ["showInExclusiveOffers", "Exclusive Offers"],
          ["showInSignatureMachines", "Signature Machines"],
        ].map(([key, label]) => (
          <label key={key} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <input type="checkbox" checked={Boolean((draft as any)[key])} onChange={e => set({ [key]: e.target.checked } as any)} /> {label}
          </label>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <Field label="Meta Title" value={draft.metaTitle} onChange={v => set({ metaTitle: v })} placeholder="SEO title (defaults to Title)" />
        <Field label="Meta Description" value={draft.metaDescription} onChange={v => set({ metaDescription: v })} placeholder="SEO description (defaults to Short Description)" />
        <PipeListArea label="Keywords (pipe | separated)" value={draft.keywords} onChange={list => set({ keywords: list })} placeholder="rtx 5090 | gaming pc | 4k" />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="glass-pill glass-pill-outline" onClick={() => onSave("draft")}>Save Draft</button>
        <button className="glass-pill glass-pill-info" onClick={() => onSave("scheduled")}>Schedule</button>
        <button className="glass-pill glass-pill-primary" onClick={() => onSave("published")}>Publish</button>
      </div>
    </div>
  );
}

export function AdminGamingHub({ store, addGamingHubItem, patchGamingHubItem, deleteGamingHubItem }: {
  store: DashboardStore;
  addGamingHubItem: (item: Omit<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments"> & Partial<Pick<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments">>) => GamingHubItem;
  patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void;
  deleteGamingHubItem: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<GamingHubItem> | null>(null);
  const [search, setSearch] = useState("");
  const items = Array.isArray(store.gamingHub) ? store.gamingHub.filter(Boolean) : [];
  const filtered = items.filter(item => `${item.title || ""} ${item.category || ""} ${item.status || ""}`.toLowerCase().includes(search.toLowerCase()));
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const pendingComments = items.reduce((sum, item) => sum + (item.comments || []).filter(comment => comment.status === "pending").length, 0);
  const save = (status: GamingHubStatus) => {
    if (!editing) return;
    const prepared = {
      ...emptyGamingDraft(),
      ...editing,
      status,
      slug: editing.slug || gamingSlug(editing.title || ""),
      category: editing.category || GAMING_TYPES.find(t => t.value === editing.type)?.label || "Gaming News",
      publishDate: Number(editing.publishDate || Date.now()),
      gallery: (editing.gallery || []).filter(Boolean).slice(0, 5),
      coverImage: editing.coverImage || editing.gallery?.find(Boolean) || "",
      thumbnailImage: editing.thumbnailImage || editing.coverImage || editing.gallery?.find(Boolean) || "",
    } as GamingHubItem;
    const error = validateGamingHubItem(prepared, status === "published");
    if (error) return toast.error(error);
    if (prepared.id) patchGamingHubItem(prepared.id, prepared);
    else addGamingHubItem(prepared);
    toast.success(status === "published" ? "Gaming Hub content published" : "Gaming Hub content saved");
    setEditing(null);
  };
  const moderateComment = (item: GamingHubItem, commentId: string, status: "approved" | "rejected") => {
    patchGamingHubItem(item.id, { comments: (item.comments || []).map(comment => comment.id === commentId ? { ...comment, status } : comment) });
    toast.success(`Comment ${status}`);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <KPICard label="Total Posts" value={items.length} icon={<Gamepad2 size={14} />} color="#FF1F45" />
        <KPICard label="Published" value={items.filter(i => i.status === "published").length} icon={<Eye size={14} />} color="#00cc66" />
        <KPICard label="Drafts" value={items.filter(i => i.status === "draft").length} icon={<Archive size={14} />} color="#ffd700" />
        <KPICard label="Total Views" value={totalViews} icon={<BarChart3 size={14} />} color="#00b4ff" />
        <KPICard label="Pending Comments" value={pendingComments} icon={<MessageSquare size={14} />} color="#a855f7" />
      </div>
      <SectionCard
        title="Gaming Hub Management"
        subtitle="Create posts, upload images, publish offers, manage comments, and monitor customer engagement"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content..." style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "8px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none", width: 200 }} />
            <button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setEditing(emptyGamingDraft())}><Plus size={12} /> Create New Content</button>
          </div>
        }
      >
        <DataTable
          rowKey={item => item.id}
          data={filtered}
          columns={[
            { key: "content", label: "Content", render: item => <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{item.thumbnailImage || item.coverImage ? <img src={item.thumbnailImage || item.coverImage} alt={item.title} style={{ width: 54, height: 38, objectFit: "cover", borderRadius: 6 }} /> : null}<div><b>{item.title}</b><br /><span style={{ color: "#888", fontSize: 11 }}>{item.category}</span></div></div> },
            { key: "type", label: "Type", render: item => GAMING_TYPES.find(t => t.value === item.type)?.label || item.type },
            { key: "status", label: "Status", render: item => <StatusBadge status={item.status} /> },
            { key: "visibility", label: "Visibility", render: item => [item.featured ? "Featured" : "", item.trending ? "Trending" : "", item.showInExclusiveOffers ? "Offer" : "", item.showInSignatureMachines ? "Build" : ""].filter(Boolean).join(" • ") || "Standard" },
            { key: "media", label: "Images", render: item => `${item.coverImage ? 1 : 0} cover + ${(item.gallery || []).filter(Boolean).length}/5` },
            { key: "analytics", label: "Analytics", render: item => <span>{item.views} views · {item.reads} reads · {item.shares} shares</span> },
            { key: "comments", label: "Comments", render: item => `${(item.comments || []).filter(c => c.status === "pending").length} pending` },
            { key: "actions", label: "", render: item => <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><a href={`/services/gaming-hub/${item.slug}`} target="_blank" className="glass-pill glass-pill-sm glass-pill-outline" style={{ textDecoration: "none" }}>Preview</a><button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setEditing(item); }}>Edit</button><button className="glass-pill glass-pill-sm glass-pill-info" onClick={(e) => { e.stopPropagation(); patchGamingHubItem(item.id, { status: item.status === "archived" ? "published" : "archived" }); }}>{item.status === "archived" ? "Restore" : "Archive"}</button><button className="glass-pill glass-pill-sm glass-pill-red" onClick={(e) => { e.stopPropagation(); deleteGamingHubItem(item.id); }}>Delete</button></div> },
          ]}
        />
      </SectionCard>
      {editing && <AdminGamingHubEditor draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} />}
      <SectionCard title="Comment Approval Queue" subtitle={`${pendingComments} pending`}>
        <div style={{ display: "grid", gap: 10 }}>
          {items.flatMap(item => (item.comments || []).filter(comment => comment.status === "pending").map(comment => ({ item, comment }))).map(({ item, comment }) => (
            <div key={comment.id} className="glass-card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <b style={{ color: "white" }}>{comment.customerName}</b>
                <p style={{ margin: "4px 0", color: "#ccc", fontFamily: "'Space Grotesk', sans-serif" }}>{comment.text}</p>
                <span style={{ color: "#777", fontSize: 11 }}>On {item.title}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="glass-pill glass-pill-sm glass-pill-success" onClick={() => moderateComment(item, comment.id, "approved")}>Approve</button>
                <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => moderateComment(item, comment.id, "rejected")}>Reject</button>
              </div>
            </div>
          ))}
          {!pendingComments && <EmptyState title="No pending comments" subtitle="Customer comments and reviews awaiting approval will appear here." />}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Homepage Content Management (Filtered Views) ─────────────────────────────

function TypeFilteredAdmin({
  typeFilter, title, helpText, store, addGamingHubItem, patchGamingHubItem, deleteGamingHubItem
}: {
  typeFilter: GamingHubContentType;
  title: string;
  helpText: string;
  store: DashboardStore;
  addGamingHubItem: (item: Omit<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments"> & Partial<Pick<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments">>) => GamingHubItem;
  patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void;
  deleteGamingHubItem: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<GamingHubItem> | null>(null);
  const items = (store.gamingHub || []).filter(item => item.type === typeFilter).sort((a, b) => (a.order || 0) - (b.order || 0));
  const save = (status: GamingHubStatus) => {
    if (!editing) return;
    const prepared = {
      ...emptyGamingDraft(),
      ...editing,
      type: typeFilter,
      status,
      slug: editing.slug || gamingSlug(editing.title || ""),
      category: editing.category || GAMING_TYPES.find(t => t.value === typeFilter)?.label || title,
      publishDate: Number(editing.publishDate || Date.now()),
      gallery: (editing.gallery || []).filter(Boolean).slice(0, 5),
      coverImage: editing.coverImage || editing.gallery?.find(Boolean) || "",
      thumbnailImage: editing.thumbnailImage || editing.coverImage || editing.gallery?.find(Boolean) || "",
    } as GamingHubItem;
    const error = validateGamingHubItem(prepared, status === "published", true);
    if (error) return toast.error(error);
    if (prepared.id) patchGamingHubItem(prepared.id, prepared);
    else addGamingHubItem(prepared);
    toast.success(`${title} ${status === "published" ? "published" : "saved"}`);
    setEditing(null);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionCard
        title={title}
        subtitle={`${items.length} items`}
        action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setEditing({ ...emptyGamingDraft(), type: typeFilter })}><Plus size={12} /> Add New</button>}
      >
        {items.length === 0 ? <EmptyState title={`No ${title.toLowerCase()} yet`} subtitle={helpText} /> : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: 16, display: "grid", gridTemplateColumns: "140px 1fr auto auto", gap: 16, alignItems: "center", border: item.status === "published" ? "1px solid #00cc66" : "1px solid rgba(255,255,255,0.1)" }}>
                {item.coverImage || item.bannerImage ? <img src={item.bannerImage || item.coverImage} alt={item.title} style={{ width: 140, height: 90, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 140, height: 90, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", color: "#666" }}>No image</div>}
                <div>
                  <div style={{ color: "white", fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                  {typeFilter === "featured-build" && <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{item.specs}</div>}
                  {typeFilter === "offer" && <div style={{ color: "#FF1F45", fontSize: 13, fontWeight: 600 }}>{item.discount}</div>}
                  <div style={{ color: "#666", fontSize: 11 }}>{formatDate(item.publishDate || item.createdAt)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusBadge status={item.status} />
                  <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>Order: {item.order || 0}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setEditing(item); }}>Edit</button>
                  <button className="glass-pill glass-pill-sm glass-pill-red" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this item?")) { deleteGamingHubItem(item.id); toast.success("Deleted"); } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      {editing && <AdminGamingHubEditor draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

export const AdminFeaturedBuilds = (props: Omit<Parameters<typeof TypeFilteredAdmin>[0], "typeFilter">) => <TypeFilteredAdmin {...props} typeFilter="featured-build" title="Featured Builds" helpText="Create featured PC builds that appear on the homepage Signature Machines section. Add cover image, specs, and pricing." />;
export const AdminExclusiveOffers = (props: Omit<Parameters<typeof TypeFilteredAdmin>[0], "typeFilter">) => <TypeFilteredAdmin {...props} typeFilter="offer" title="Exclusive Offers" helpText="Create exclusive offers and promotions that appear on the homepage. Add banner image, discount details, and CTA button." />;
export const AdminGamingNews = (props: Omit<Parameters<typeof TypeFilteredAdmin>[0], "typeFilter">) => <TypeFilteredAdmin {...props} typeFilter="gaming-news" title="Gaming News" helpText="Publish gaming news articles that appear in the Latest News section." />;
export const AdminTestimonials = (props: Omit<Parameters<typeof TypeFilteredAdmin>[0], "typeFilter">) => <TypeFilteredAdmin {...props} typeFilter="testimonial" title="Testimonials" helpText="Add customer testimonials that appear on the homepage. Include customer name, review text, and photo." />;
export const AdminFAQ = (props: Omit<Parameters<typeof TypeFilteredAdmin>[0], "typeFilter">) => <TypeFilteredAdmin {...props} typeFilter="faq" title="FAQ" helpText="Create FAQ items for the homepage. Add question and answer pairs to help customers." />;

// ─── Categories ───────────────────────────────────────────────────────────

interface AdminCategory { id: string; name: string; icon: string; count: number; color: string; }
const CATEGORIES_KEY = "deskto-admin-categories-v1";
const DEFAULT_CATEGORIES: AdminCategory[] = [
  { id: "cat_gaming_pc", name: "Gaming PC", icon: "🎮", count: 6, color: "#FF1F45" },
  { id: "cat_desktop_pc", name: "Desktop PC", icon: "🖥️", count: 4, color: "#00b4ff" },
  { id: "cat_gaming_laptop", name: "Gaming Laptop", icon: "💻", count: 3, color: "#a855f7" },
  { id: "cat_laptop", name: "Laptop", icon: "💼", count: 5, color: "#00cc66" },
  { id: "cat_monitor", name: "Monitor", icon: "🖥️", count: 4, color: "#ffd700" },
  { id: "cat_components", name: "Components", icon: "🔧", count: 9, color: "#ff6b00" },
];

function loadCategories(): AdminCategory[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

export function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>(() => loadCategories());
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  const persist = (next: AdminCategory[]) => {
    setCategories(next);
    try { window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next)); } catch {}
  };

  const startNew = () => setEditing({ id: "", name: "", icon: "🏷️", count: 0, color: "#FF1F45" });
  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return toast.error("Category name is required.");
    if (editing.id) {
      persist(categories.map(c => c.id === editing.id ? { ...editing, name } : c));
      toast.success(`Category "${name}" updated`);
    } else {
      const id = `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      persist([...categories, { ...editing, id, name }]);
      toast.success(`Category "${name}" added`);
    }
    setEditing(null);
  };
  const remove = (c: AdminCategory) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete category "${c.name}"?`)) return;
    persist(categories.filter(x => x.id !== c.id));
    if (editing?.id === c.id) setEditing(null);
    toast.success(`Category "${c.name}" deleted`);
  };

  return (
    <SectionCard title="Categories" subtitle={`${categories.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={startNew}><Plus size={12} /> New Category</button>}
    >
      {editing && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 16, border: "1px solid rgba(255,31,69,.35)" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", marginBottom: 12 }}>{editing.id ? "Edit Category" : "New Category"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Field label="Name" value={editing.name} onChange={v => setEditing({ ...editing, name: v })} placeholder="e.g. Keyboards" />
            <Field label="Icon (emoji)" value={editing.icon} onChange={v => setEditing({ ...editing, icon: v })} placeholder="⌨️" />
            <Field label="Product Count" type="number" value={String(editing.count)} onChange={v => setEditing({ ...editing, count: Number(v) || 0 })} placeholder="0" />
            <Field label="Color (hex)" value={editing.color} onChange={v => setEditing({ ...editing, color: v })} placeholder="#FF1F45" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={save}>{editing.id ? "Save Changes" : "Add Category"}</button>
            <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="dash-tab-grid">
        {categories.map(c => (
          <div key={c.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}15`, border: `1px solid ${c.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{c.name}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", marginTop: 4 }}>{c.count} products</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setEditing(c); }}>Edit</button>
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={(e) => { e.stopPropagation(); remove(c); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Brands ───────────────────────────────────────────────────────────────

interface AdminBrand { id: string; name: string; }
const BRANDS_KEY = "deskto-admin-brands-v1";
const DEFAULT_BRANDS: AdminBrand[] = ["DESKTO", "ASUS", "Dell", "MSI", "Lenovo", "Intel", "NVIDIA", "AMD", "Samsung", "Corsair", "Logitech", "Razer", "HyperX", "LG", "TP-Link"]
  .map(name => ({ id: `brand_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, name }));

function loadBrands(): AdminBrand[] {
  if (typeof window === "undefined") return DEFAULT_BRANDS;
  try {
    const raw = window.localStorage.getItem(BRANDS_KEY);
    if (!raw) return DEFAULT_BRANDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_BRANDS;
  } catch { return DEFAULT_BRANDS; }
}

export function AdminBrands() {
  const [brands, setBrands] = useState<AdminBrand[]>(() => loadBrands());
  const [editing, setEditing] = useState<AdminBrand | null>(null);

  const persist = (next: AdminBrand[]) => {
    setBrands(next);
    try { window.localStorage.setItem(BRANDS_KEY, JSON.stringify(next)); } catch {}
  };

  const startNew = () => setEditing({ id: "", name: "" });
  const save = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return toast.error("Brand name is required.");
    if (brands.some(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== editing.id)) return toast.error(`"${name}" already exists.`);
    if (editing.id) {
      persist(brands.map(b => b.id === editing.id ? { ...b, name } : b));
      toast.success(`Brand "${name}" updated`);
    } else {
      const id = `brand_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      persist([...brands, { id, name }]);
      toast.success(`Brand "${name}" added`);
    }
    setEditing(null);
  };
  const remove = (b: AdminBrand) => {
    if (typeof window !== "undefined" && !window.confirm(`Delete brand "${b.name}"?`)) return;
    persist(brands.filter(x => x.id !== b.id));
    if (editing?.id === b.id) setEditing(null);
    toast.success(`Brand "${b.name}" deleted`);
  };

  return (
    <SectionCard title="Brands" subtitle={`${brands.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={startNew}><Plus size={12} /> New Brand</button>}
    >
      {editing && (
        <div className="glass-card" style={{ padding: 16, marginBottom: 16, border: "1px solid rgba(255,31,69,.35)" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", marginBottom: 12 }}>{editing.id ? "Edit Brand" : "New Brand"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr)", gap: 10, maxWidth: 360 }}>
            <Field label="Brand Name" value={editing.name} onChange={v => setEditing({ ...editing, name: v })} placeholder="e.g. Gigabyte" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={save}>{editing.id ? "Save Changes" : "Add Brand"}</button>
            <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="dash-tab-grid">
        {brands.map(b => (
          <div key={b.id} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "linear-gradient(135deg, #FF1F45, #5a0008)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", fontWeight: 800 }}>{b.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setEditing(b); }}>Edit</button>
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={(e) => { e.stopPropagation(); remove(b); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────

export function AdminInventory({ store }: { store: DashboardStore }) {
  const [restockProduct, setRestockProduct] = useState<typeof store.products[0] | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const lowStock = store.products.filter(p => p.stock < 5);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ supplierId: store.suppliers[0]?.id || "", component: "", qty: "10", cost: "", gst: "18" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {lowStock.length > 0 && (
        <div className="glass-card" style={{ padding: 16, borderColor: "rgba(255,31,69,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <AlertCircle size={20} color="#FF1F45" />
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{lowStock.length} Low-Stock Alerts</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", marginTop: 2 }}>Restock soon to avoid lost sales</div>
            </div>
            <button className="glass-pill glass-pill-primary glass-pill-sm" style={{ marginLeft: "auto" }} onClick={() => setShowForm(true)}>Create PO</button>
          </div>
        </div>
      )}

      {showForm && (
        <SectionCard title="Create Purchase Order" subtitle="Fill in component details to create a PO">
          <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <SelectField label="Supplier" value={draft.supplierId} onChange={v => setDraft({ ...draft, supplierId: v })} options={store.suppliers.map(s => s.id)} />
            <Field label="Component / Product" value={draft.component} onChange={v => setDraft({ ...draft, component: v })} />
            <Field label="Quantity" value={draft.qty} onChange={v => setDraft({ ...draft, qty: v })} type="number" />
            <Field label="Unit Cost (₹)" value={draft.cost} onChange={v => setDraft({ ...draft, cost: v })} type="number" />
            <Field label="GST %" value={draft.gst} onChange={v => setDraft({ ...draft, gst: v })} type="number" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="glass-pill glass-pill-primary" onClick={() => { toast.success("PO created - go to Purchase Orders tab to send"); setShowForm(false); }}>Create PO</button>
            <button className="glass-pill glass-pill-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Stock Levels" subtitle={`${lowStock.length} items need restocking`}>
        <DataTable
          rowKey={p => p.id.toString()}
          data={store.products}
          columns={[
            { key: "id", label: "ID", width: "60px", render: p => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>#{p.id}</span> },
            { key: "name", label: "Product", render: p => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>{p.name}</span></div> },
            { key: "category", label: "Category", render: p => <span style={{ color: "#888", fontSize: 11 }}>{p.category}</span> },
            { key: "stock", label: "Stock", align: "right", render: p => <span style={{ color: p.stock < 5 ? "#FF1F45" : p.stock < 10 ? "#ff6b00" : "#00cc66", fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{p.stock}</span> },
            { key: "price", label: "Price", align: "right", render: p => <span style={{ color: "#aaa" }}>{inr(p.price)}</span> },
            { key: "actions", label: "", render: p => (
              <button
                className="glass-pill glass-pill-sm glass-pill-outline"
                onClick={(e) => { e.stopPropagation(); setRestockProduct(p); setRestockQty("10"); setDraft({ ...draft, component: p.name }); }}
                style={{ whiteSpace: "nowrap" }}
              >
                Restock
              </button>
            )},
          ]}
        />
      </SectionCard>

      {restockProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setRestockProduct(null)}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 420, width: "90%", borderColor: "rgba(255,31,69,.3)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", marginTop: 0 }}>Restock: {restockProduct.name}</h3>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>Current stock: <span style={{ color: "#FF1F45", fontWeight: 700 }}>{restockProduct.stock}</span> units</p>
            <Field label="Add Quantity" value={restockQty} onChange={setRestockQty} type="number" />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="glass-pill glass-pill-primary" onClick={() => { toast.success(`Added ${restockQty} units to ${restockProduct.name}`); setRestockProduct(null); }}>Confirm Restock</button>
              <button className="glass-pill glass-pill-outline" onClick={() => setRestockProduct(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────

export function AdminOrders({ store, updateOrderStatus }: { store: DashboardStore; updateOrderStatus: any }) {
  const STATUS_OPTIONS: Order["status"][] = ["placed", "verified", "packing", "shipped", "delivered", "cancelled"];
  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  
  const orders = [...store.orders].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = orders.filter(o => {
    const matchesStatus = filter === "all" || o.status === filter;
    const searchString = `${o.id} ${o.customerName || ""} ${o.customerEmail || ""} ${o.customerPhone || ""}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  
  const active = open ? store.orders.find(o => o.id === open.id) || open : null;
  const customerName = (order: Order) => order.customerName || readDemoUsers().find(u => u.id === order.customerId)?.name || "Customer";
  const customerContact = (order: Order) => order.customerPhone || order.customerEmail || readDemoUsers().find(u => u.id === order.customerId)?.email || order.customerId;
  const setStatus = (order: Order, status: Order["status"]) => {
    updateOrderStatus(order.id, status);
    toast.success(`Order ${order.id.slice(-8).toUpperCase()} synced to ${status}`);
  };

  const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0);
  const deliveredRevenue = filtered.filter(o => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);
  const pendingRevenue = filtered.filter(o => !["delivered", "cancelled"].includes(o.status)).reduce((sum, o) => sum + o.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 8 }}>
        <div className="glass" style={{ padding: "16px", borderRadius: 8, borderLeft: "4px solid #00b4ff" }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>Selected Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "white", marginTop: 4 }}>{inr(totalRevenue)}</div>
        </div>
        <div className="glass" style={{ padding: "16px", borderRadius: 8, borderLeft: "4px solid #00cc66" }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>Delivered Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "white", marginTop: 4 }}>{inr(deliveredRevenue)}</div>
        </div>
        <div className="glass" style={{ padding: "16px", borderRadius: 8, borderLeft: "4px solid #ff6b00" }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>Pending Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "white", marginTop: 4 }}>{inr(pendingRevenue)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", ...STATUS_OPTIONS] as const).map(status => (
            <button key={status} className={`glass-pill ${filter === status ? "glass-pill-primary" : "glass-pill-outline"} glass-pill-sm`} onClick={() => setFilter(status)}>
              {status === "all" ? "All" : status.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="search-bar" style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", minWidth: 250 }}>
          <Search size={14} color="#777" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", color: "white", outline: "none", width: "100%", fontSize: 12 }} 
          />
        </div>
      </div>
      
      <SectionCard title="Orders" subtitle={`${filtered.length} shown · ${orders.length} total`}>
        <DataTable
          rowKey={o => o.id}
          data={filtered}
          onRowClick={o => setOpen(o)}
          columns={[
            { key: "id", label: "Order ID", render: o => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{o.id.slice(-8).toUpperCase()}</span> },
            { key: "customer", label: "Customer", render: o => <div><strong style={{ color: "white" }}>{customerName(o)}</strong><br /><span style={{ color: "#777", fontSize: 11 }}>{customerContact(o)}</span></div> },
            { key: "items", label: "Items", render: o => <div><strong style={{ color: "white" }}>{o.items.length} item{o.items.length > 1 ? "s" : ""}</strong><br /><span style={{ color: "#777", fontSize: 11 }}>{o.items[0]?.name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</span></div> },
            { key: "fulfillment", label: "Delivery", render: o => <div>
                <strong style={{ color: "white" }}>{o.deliveryMethod === "pickup" ? "Store Pickup" : "Home Delivery"}</strong><br />
                <span style={{ color: "#777", fontSize: 11 }}>{o.shippingAddress && o.deliveryMethod !== "pickup" ? `${o.shippingAddress.city}, ${o.shippingAddress.state}` : o.paymentMethod?.toUpperCase() || "Payment"}</span>
              </div> 
            },
            { key: "total", label: "Total", align: "right", render: o => inr(o.total) },
            { key: "status", label: "Status", render: o => <StatusBadge status={o.status} /> },
            { key: "date", label: "Date", render: o => formatDate(o.createdAt) },
            { key: "action", label: "", render: o => (
              <div style={{ display: "grid", gap: 8, minWidth: 190 }} onClick={e => e.stopPropagation()}>
                <select value={o.status} onChange={e => setStatus(o, e.target.value as Order["status"])} style={{ background: "#0d0d0d", color: "white", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 10px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}
                </select>
                <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => { const next = ({ placed: "verified", verified: "packing", packing: "shipped", shipped: "delivered" } as Partial<Record<Order["status"], Order["status"]>>)[o.status]; if (next) setStatus(o, next); }}>Advance</button>
              </div>
            ) },
          ]}
        />
      </SectionCard>

      {active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", zIndex: 120, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpen(null)}>
          <div className="glass-card" style={{ width: "min(620px, 100%)", height: "100vh", overflowY: "auto", padding: 24, borderRadius: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, color: "white", margin: 0 }}>Order #{active.id.slice(-8).toUpperCase()}</h3>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", margin: "6px 0 0" }}>{formatDate(active.createdAt)} · {customerName(active)}</p>
              </div>
              <button className="glass-pill glass-pill-icon" onClick={() => setOpen(null)}><X size={13} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}><div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>STATUS</div><StatusBadge status={active.status} /></div>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}><div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>TOTAL</div><div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, color: "#FF1F45", fontWeight: 700 }}>{inr(active.total)}</div></div>
            </div>
            <SectionCard title="Admin Controls" padded={false}>
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <select value={active.status} onChange={e => setStatus(active, e.target.value as Order["status"])} style={{ background: "#0d0d0d", color: "white", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}
                </select>
                <button className="glass-pill glass-pill-primary" onClick={() => { const next = ({ placed: "verified", verified: "packing", packing: "shipped", shipped: "delivered" } as Partial<Record<Order["status"], Order["status"]>>)[active.status]; if (next) setStatus(active, next); }}>Advance Order</button>
              </div>
            </SectionCard>
            <SectionCard title="Items" padded={false}>
              <div style={{ padding: 14 }}>
                {active.items.map(item => (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                    <span style={{ color: "#ddd" }}>{item.name} × {item.qty}</span>
                    <span style={{ color: "white" }}>{inr(item.price * item.qty)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white" }}><span>Total</span><span>{inr(active.total)}</span></div>
              </div>
            </SectionCard>
            <SectionCard title="Customer & Fulfillment" padded={false}>
              <div style={{ padding: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.8 }}>
                <strong style={{ color: "white" }}>{customerName(active)}</strong><br />
                {customerContact(active)}<br />
                {active.deliveryMethod === "pickup" ? "Store Pickup" : "Home Delivery"} · {active.paymentMethod?.toUpperCase() || "Payment pending"}<br />
                {active.shippingAddress && active.deliveryMethod !== "pickup" && <>{active.shippingAddress.line1}{active.shippingAddress.line2 ? `, ${active.shippingAddress.line2}` : ""}<br />{active.shippingAddress.city}, {active.shippingAddress.state} {active.shippingAddress.pincode}</>}
              </div>
            </SectionCard>
            <SectionCard title="Synced Timeline" padded={false}>
              <div className="dash-timeline" style={{ padding: 14 }}>
                {active.trackingSteps.map(step => (
                  <div key={step.label} className={`dash-timeline-step ${step.done ? "done" : ""}`}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: step.done ? "white" : "#888" }}>{step.label}</div>
                    {step.done && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>{formatDate(step.at)}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deliveries ─────────────────────────────────────────────────────────────

export function AdminDeliveries({
  store, updateDeliveryStatus, assignDeliveryStaff, updateDelivery,
}: {
  store: DashboardStore;
  updateDeliveryStatus: (id: string, status: Delivery["status"], actor?: string) => void;
  assignDeliveryStaff: (deliveryId: string, staffId: string, staffName: string, staffPhone: string, actor?: string) => void;
  updateDelivery: (id: string, patch: Partial<Delivery>, actor?: string) => void;
}) {
  const DELIVERY_STATUS_OPTIONS: Delivery["status"][] = ["pending", "ready", "dispatched", "delivered", "cancelled"];
  const STATUS_COLORS: Record<Delivery["status"], string> = {
    pending: "#ffd700", ready: "#ff6b00", dispatched: "#00b4ff", delivered: "#00cc66", cancelled: "#888",
  };
  const DELIVERY_STEPS: Delivery["status"][] = ["pending", "ready", "dispatched", "delivered"];

  const [filter, setFilter] = useState<Delivery["status"] | "all">("all");
  const [open, setOpen] = useState<Delivery | null>(null);
  const [assignModal, setAssignModal] = useState<Delivery | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const deliveries = [...store.deliveries].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = filter === "all" ? deliveries : deliveries.filter(d => d.status === filter);
  const active = open ? store.deliveries.find(d => d.id === open.id) || open : null;

  const deliveryStaff = store.staff.filter(s =>
    s.role === "delivery" || s.role === "admin" || s.role === "manager"
  );

  const getOrder = (d: Delivery) => store.orders.find(o => o.id === d.orderId);

  const getStepIndex = (status: Delivery["status"]) => DELIVERY_STEPS.indexOf(status);

  const advanceDelivery = (d: Delivery) => {
    const map: Partial<Record<Delivery["status"], Delivery["status"]>> = {
      pending: "ready", ready: "dispatched", dispatched: "delivered",
    };
    const next = map[d.status];
    if (next) {
      updateDeliveryStatus(d.id, next, "admin");
      toast.success(`Delivery ${d.id.slice(-8).toUpperCase()} → ${next}`);
    }
  };

  const handleAssign = () => {
    if (!assignModal || !selectedStaffId) return;
    const staff = store.staff.find(s => s.id === selectedStaffId);
    if (!staff) return;
    assignDeliveryStaff(assignModal.id, staff.id, staff.name, staff.phone || staff.contact || "", "admin");
    toast.success(`Delivery assigned to ${staff.name}`);
    setAssignModal(null);
    setSelectedStaffId("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        <KPICard label="Total" value={deliveries.length} icon={<Truck size={14} />} color="#00b4ff" />
        <KPICard label="Pending" value={deliveries.filter(d => d.status === "pending").length} icon={<Clock size={14} />} color="#ffd700" />
        <KPICard label="Ready" value={deliveries.filter(d => d.status === "ready").length} icon={<Package size={14} />} color="#ff6b00" />
        <KPICard label="Dispatched" value={deliveries.filter(d => d.status === "dispatched").length} icon={<Truck size={14} />} color="#00b4ff" />
        <KPICard label="Delivered" value={deliveries.filter(d => d.status === "delivered").length} icon={<CheckCircle size={14} />} color="#00cc66" />
        <KPICard label="Cancelled" value={deliveries.filter(d => d.status === "cancelled").length} icon={<AlertCircle size={14} />} color="#888" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", ...DELIVERY_STATUS_OPTIONS] as const).map(status => (
          <button key={status} className={`glass-pill ${filter === status ? "glass-pill-primary" : "glass-pill-outline"} glass-pill-sm`} onClick={() => setFilter(status)}>
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && ` (${deliveries.filter(d => d.status === status).length})`}
          </button>
        ))}
      </div>

      <SectionCard title="Delivery Management" subtitle={`${filtered.length} deliveries shown`}>
        <DataTable
          rowKey={d => d.id}
          data={filtered}
          onRowClick={d => setOpen(d)}
          columns={[
            {
              key: "id", label: "Delivery ID", render: d => (
                <div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "#00b4ff" }}>{d.id.slice(-8).toUpperCase()}</span>
                  <div style={{ fontSize: 10, color: "#555" }}>Order: {d.orderId.slice(-8).toUpperCase()}</div>
                </div>
              ),
            },
            {
              key: "customer", label: "Customer", render: d => (
                <div>
                  <strong style={{ color: "white" }}>{d.customerName}</strong>
                  <div style={{ color: "#777", fontSize: 11 }}>{d.customerPhone}</div>
                </div>
              ),
            },
            {
              key: "address", label: "Delivery Address", render: d => (
                <div>
                  <span style={{ color: "#ccc", fontSize: 12 }}>{d.address}</span>
                  <div style={{ color: "#555", fontSize: 11 }}>{d.city}, {d.state} {d.pincode}</div>
                </div>
              ),
            },
            {
              key: "staff", label: "Assigned Staff", render: d => (
                <div>
                  {d.staffName ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF1F45", display: "grid", placeItems: "center", fontSize: 10, color: "white", fontWeight: 700 }}>{d.staffName.charAt(0)}</div>
                      <div>
                        <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>{d.staffName}</div>
                        {d.staffPhone && <div style={{ color: "#777", fontSize: 11 }}>{d.staffPhone}</div>}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "#666", fontSize: 12 }}>Unassigned</span>
                  )}
                </div>
              ),
            },
            {
              key: "orderTotal", label: "Order Value", render: d => {
                const order = getOrder(d);
                return order ? inr(order.total) : "—";
              },
            },
            {
              key: "status", label: "Status", render: d => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${STATUS_COLORS[d.status]}22`, border: `1px solid ${STATUS_COLORS[d.status]}55`, fontSize: 11, color: STATUS_COLORS[d.status], fontWeight: 600, textTransform: "capitalize" }}>
                    {d.status}
                  </div>
                  {d.dispatchedAt && <div style={{ fontSize: 10, color: "#555" }}>Dispatched: {formatDate(d.dispatchedAt)}</div>}
                  {d.deliveredAt && <div style={{ fontSize: 10, color: "#555" }}>Delivered: {formatDate(d.deliveredAt)}</div>}
                </div>
              ),
            },
            {
              key: "actions", label: "", render: d => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                  <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => { setOpen(d); }}>View</button>
                  <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => { setAssignModal(d); setSelectedStaffId(d.staffId || ""); }}>
                    {d.staffId ? "Reassign" : "Assign"}
                  </button>
                  {d.status !== "delivered" && d.status !== "cancelled" && (
                    <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => advanceDelivery(d)}>Advance</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* Assignment Modal */}
      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(12px)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAssignModal(null)}>
          <div className="glass-card" style={{ width: "min(480px, 95vw)", padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", margin: 0 }}>Assign Delivery Staff</h3>
                <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>Delivery #{assignModal.id.slice(-8).toUpperCase()}</p>
              </div>
              <button className="glass-pill glass-pill-icon" onClick={() => setAssignModal(null)}><X size={13} /></button>
            </div>

            {deliveryStaff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#888" }}>
                <Users size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p>No delivery staff available. Add staff with "Delivery" role in the Staff section.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Select Staff Member</label>
                  <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={{ width: "100%", background: "#0d0d0d", color: "white", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "12px 14px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
                    <option value="">— Choose staff —</option>
                    {deliveryStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                {selectedStaffId && (() => {
                  const staff = store.staff.find(s => s.id === selectedStaffId);
                  return staff ? (
                    <div className="glass" style={{ borderRadius: 10, padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FF1F45", display: "grid", placeItems: "center", fontSize: 16, color: "white", fontWeight: 700 }}>{staff.name.charAt(0)}</div>
                        <div>
                          <div style={{ color: "white", fontWeight: 600 }}>{staff.name}</div>
                          <div style={{ color: "#888", fontSize: 12 }}>{staff.role} · {staff.email || staff.contact || ""}</div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
                <button className="glass-pill glass-pill-primary" style={{ width: "100%", padding: "12px", marginTop: 8 }} onClick={handleAssign} disabled={!selectedStaffId}>
                  Assign & Set Ready
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Slide-over */}
      {active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", zIndex: 120, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpen(null)}>
          <div className="glass-card" style={{ width: "min(640px, 100%)", height: "100vh", overflowY: "auto", padding: 24, borderRadius: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, color: "white", margin: 0 }}>Delivery #{active.id.slice(-8).toUpperCase()}</h3>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", margin: "6px 0 0" }}>
                  Created {formatDate(active.createdAt)} · Order #{active.orderId.slice(-8).toUpperCase()}
                </p>
              </div>
              <button className="glass-pill glass-pill-icon" onClick={() => setOpen(null)}><X size={13} /></button>
            </div>

            {/* Delivery Progress */}
            <SectionCard title="Delivery Progress" padded={false}>
              <div style={{ padding: "16px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  {DELIVERY_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(active.status);
                    const isDone = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const color = isDone || isCurrent ? STATUS_COLORS[step] : "#333";
                    return (
                      <div key={step} style={{ display: "flex", alignItems: "center", flex: i < DELIVERY_STEPS.length - 1 ? 1 : "none" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: isDone || isCurrent ? color : "rgba(255,255,255,0.05)", border: `2px solid ${isDone || isCurrent ? color : "#444"}`, display: "grid", placeItems: "center" }}>
                            {isDone ? <CheckCircle size={14} color="white" /> : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: isCurrent ? "white" : "#555" }}>{i + 1}</span>}
                          </div>
                          <span style={{ fontSize: 10, color: isDone || isCurrent ? color : "#444", textTransform: "capitalize", fontWeight: isCurrent ? 700 : 400, whiteSpace: "nowrap" }}>{step}</span>
                        </div>
                        {i < DELIVERY_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: i < currentIdx ? color : "rgba(255,255,255,0.1)", margin: "0 4px", marginBottom: 20 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0" }}>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>STATUS</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${STATUS_COLORS[active.status]}22`, border: `1px solid ${STATUS_COLORS[active.status]}55`, fontSize: 12, color: STATUS_COLORS[active.status], fontWeight: 600, textTransform: "capitalize" }}>{active.status}</div>
              </div>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>ORDER VALUE</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, color: "#FF1F45", fontWeight: 700 }}>{(() => { const o = getOrder(active); return o ? inr(o.total) : "—"; })()}</div>
              </div>
            </div>

            {/* Customer Details */}
            <SectionCard title="Customer Details" padded={false}>
              <div style={{ padding: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.9 }}>
                <strong style={{ color: "white", fontSize: 13 }}>{active.customerName}</strong><br />
                <span style={{ color: "#aaa" }}>📞 {active.customerPhone}</span><br />
                <span style={{ color: "#888", fontSize: 11 }}>Ordered: {formatDate(active.createdAt)}</span>
              </div>
            </SectionCard>

            {/* Delivery Address */}
            <SectionCard title="Delivery Address" padded={false}>
              <div style={{ padding: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.9 }}>
                <span>{active.address}</span><br />
                <span>{active.city}, {active.state} {active.pincode}</span>
                {active.deliveryNotes && <><br /><em style={{ color: "#888" }}>Note: {active.deliveryNotes}</em></>}
              </div>
            </SectionCard>

            {/* Assigned Staff */}
            <SectionCard title="Assigned Staff" padded={false}>
              <div style={{ padding: 14 }}>
                {active.staffName ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FF1F45", display: "grid", placeItems: "center", fontSize: 16, color: "white", fontWeight: 700 }}>{active.staffName.charAt(0)}</div>
                    <div>
                      <div style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{active.staffName}</div>
                      {active.staffPhone && <div style={{ color: "#888", fontSize: 12 }}>{active.staffPhone}</div>}
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => { setAssignModal(active); setSelectedStaffId(active.staffId || ""); setOpen(null); }}>Reassign</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#666" }}>No staff assigned yet</span>
                    <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => { setAssignModal(active); setSelectedStaffId(""); setOpen(null); }}>Assign Staff</button>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Linked Order Items */}
            {(() => {
              const order = getOrder(active);
              return order ? (
                <SectionCard title="Order Items" subtitle={`${order.items.length} item${order.items.length !== 1 ? "s" : ""} · ${inr(order.total)}`} padded={false}>
                  <div style={{ padding: 14 }}>
                    {order.items.map(item => (
                      <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {item.img && <img src={item.img} alt={item.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />}
                          <span style={{ color: "#ddd" }}>{item.name} × {item.qty}</span>
                        </div>
                        <span style={{ color: "white" }}>{inr(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontFamily: "'Rajdhani', sans-serif", fontSize: 16, color: "white" }}>
                      <span>Total</span><span style={{ color: "#FF1F45", fontWeight: 700 }}>{inr(order.total)}</span>
                    </div>
                  </div>
                </SectionCard>
              ) : null;
            })()}

            {/* Admin Actions */}
            <SectionCard title="Admin Controls" padded={false}>
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select value={active.status} onChange={e => { updateDeliveryStatus(active.id, e.target.value as Delivery["status"], "admin"); }} style={{ background: "#0d0d0d", color: "white", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
                    {DELIVERY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                  <button className="glass-pill glass-pill-info" onClick={() => advanceDelivery(active)} disabled={active.status === "delivered" || active.status === "cancelled"}>
                    Advance Status
                  </button>
                </div>
                {active.status === "delivered" && (
                  <div className="glass" style={{ borderRadius: 8, padding: 10, border: "1px solid #00cc6633", background: "#00cc6611" }}>
                    <CheckCircle size={14} color="#00cc66" style={{ marginRight: 8 }} />
                    <span style={{ color: "#00cc66", fontSize: 12 }}>Delivery completed on {active.deliveredAt ? formatDate(active.deliveredAt) : "—"}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repairs ──────────────────────────────────────────────────────────────

export function AdminRepairs({ store, updateRepairStatus, patchRepair }: { store: DashboardStore; updateRepairStatus: any; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  useAuthStaffRefresh();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  
  const technicianOptions = getAllStaffOptions(store);
  const technicianName = (id?: string) => technicianOptions.find(s => s.id === id)?.name || store.staff.find(s => s.id === id)?.name || "Unassigned";
  
  const filteredRepairs = store.repairs.filter(r => {
    const matchesSearch = (r.customerName || "").toLowerCase().includes(search.toLowerCase()) || 
                          (r.device || "").toLowerCase().includes(search.toLowerCase()) ||
                          r.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === "all" || 
                         (statusFilter === "open" && !["ready", "delivered", "closed"].includes(r.status)) ||
                         r.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const selectedRepair = store.repairs.find(r => r.id === selectedRepairId);

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SectionCard title="Repair Management" subtitle="Validate requests, approve work, assign technicians, and schedule service">
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "#111", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
              <Search size={14} color="#777" />
              <input 
                type="text" 
                placeholder="Search repairs by ID, customer, or device..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ background: "transparent", border: "none", color: "white", outline: "none", width: "100%", fontSize: 12 }} 
              />
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              <button onClick={() => setStatusFilter("all")} className={`glass-pill ${statusFilter === "all" ? "glass-pill-primary" : "glass-pill-outline"}`} style={{ fontSize: 11 }}>All</button>
              <button onClick={() => setStatusFilter("open")} className={`glass-pill ${statusFilter === "open" ? "glass-pill-warning" : "glass-pill-outline"}`} style={{ fontSize: 11 }}>Open</button>
              <button onClick={() => setStatusFilter("submitted")} className={`glass-pill ${statusFilter === "submitted" ? "glass-pill-info" : "glass-pill-outline"}`} style={{ fontSize: 11 }}>New Requests</button>
              <button onClick={() => setStatusFilter("ready")} className={`glass-pill ${statusFilter === "ready" ? "glass-pill-success" : "glass-pill-outline"}`} style={{ fontSize: 11 }}>Ready</button>
            </div>
          </div>
          
          <DataTable
            rowKey={r => r.id}
            data={filteredRepairs}
            columns={[
              { key: "id", label: "Ticket", render: r => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, cursor: "pointer", color: "#00b4ff", textDecoration: "underline" }} onClick={() => setSelectedRepairId(r.id)}>#{r.id.slice(-8).toUpperCase()}</span> },
              { key: "customer", label: "Customer", render: r => (
                <div>
                  <div style={{ color: "white" }}>{r.customerName || r.customerId}</div>
                  <div style={{ fontSize: 10, color: "#777" }}>{r.contactPhone || "No phone"}</div>
                </div>
              ) },
              { key: "device", label: "Device", render: r => (
                <div>
                  <div style={{ color: "white" }}>{r.device}</div>
                  <div style={{ fontSize: 10, color: "#777" }}>{r.deviceType || "Device"} · {r.serialNumber || "No serial"}</div>
                </div>
              ) },
              { key: "issue", label: "Issue", render: r => <span style={{ maxWidth: 150, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.issue}</span> },
              { key: "quote", label: "Quote Details", render: r => (
                <RepairQuoteEditor repair={r} patchRepair={patchRepair} />
              ) },
              { key: "technician", label: "Technician", render: r => (
                <RepairTechnicianCell repair={r} technicianOptions={technicianOptions} technicianName={technicianName} patchRepair={patchRepair} />
              ) },
              { key: "staffProgress", label: "Staff Progress", render: r => (
                <RepairStaffProgressCell repair={r} technicianName={technicianName} />
              ) },
              { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
              { key: "action", label: "", render: r => (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
                  <select value={r.status} onChange={e => {
                    patchRepair(r.id, { status: e.target.value as Repair["status"] });
                    toast.success("Status synced to customer dashboard");
                  }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
                    {REPAIR_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => { setSelectedRepairId(r.id); }}>Quote</button>
                    <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setSelectedRepairId(r.id)}>View</button>
                  </div>
                </div>
              ) },
            ]}
          />
        </SectionCard>
      </div>
      
      {selectedRepair && (
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionCard title="Repair Details" subtitle={`#${selectedRepair.id.slice(-8).toUpperCase()}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <StatusBadge status={selectedRepair.status} />
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setSelectedRepairId(null)}>Close</button>
            </div>
            
            <div style={{ fontSize: 12, color: "#ccc", marginBottom: 16 }}>
              <div style={{ marginBottom: 4 }}><strong>Device:</strong> {selectedRepair.device}</div>
              <div style={{ marginBottom: 4 }}><strong>Type:</strong> {selectedRepair.serviceType}</div>
              <div style={{ marginBottom: 4 }}><strong>Customer:</strong> {selectedRepair.customerName}</div>
              <div style={{ marginBottom: 4 }}><strong>Issue:</strong> {selectedRepair.issue}</div>
            </div>
            
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, color: "white", marginBottom: 8 }}>Timeline Progress</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedRepair.timeline?.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: step.done ? "#00cc66" : "#333", border: "2px solid #111" }} />
                    <div style={{ fontSize: 11, color: step.done ? "white" : "#777" }}>{step.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              <h4 style={{ fontSize: 12, color: "white", marginBottom: 8 }}>Quotation</h4>
              <RepairQuoteEditor repair={selectedRepair} patchRepair={patchRepair} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function RepairTechnicianCell({ repair, technicianOptions, technicianName, patchRepair }: { repair: Repair; technicianOptions: StaffOption[]; technicianName: (id?: string) => string; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 180 }} onClick={e => e.stopPropagation()}>
      <select value={repair.technicianId || ""} onChange={e => {
        const staffId = e.target.value;
        patchRepair(repair.id, {
          technicianId: staffId || undefined,
          status: staffId ? "assigned" : repair.status,
          technicianNotes: staffId ? `Assigned to ${technicianName(staffId)}` : "Technician assignment cleared",
        });
        toast.success(staffId ? `${technicianName(staffId)} notified in staff dashboard` : "Assignment cleared");
      }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
        <option value="">Assign technician...</option>
        {technicianOptions.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}
      </select>
      <div className="glass" style={{ borderRadius: 8, padding: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
        <strong style={{ color: "white" }}>{technicianName(repair.technicianId)}</strong>
        <div style={{ color: "#777", marginTop: 3 }}>{repair.technicianId ? "Assigned" : "Awaiting assignment"}</div>
      </div>
    </div>
  );
}

// Dedicated column that mirrors the live work progress the technician updates
// from their staff dashboard (status, % complete, current stage, last update).
function RepairStaffProgressCell({ repair, technicianName }: { repair: Repair; technicianName: (id?: string) => string }) {
  const steps = repair.timeline || [];
  const done = steps.filter(step => step.done).length;
  const total = steps.length || 1;
  const percent = Math.round((done / total) * 100);
  const currentStage = [...steps].reverse().find(step => step.done)?.label || "Not started";
  if (!repair.technicianId) {
    return <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#777" }}>No technician assigned</span>;
  }
  return (
    <div className="glass" style={{ borderRadius: 8, padding: 9, minWidth: 200, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <strong style={{ color: "white" }}>{technicianName(repair.technicianId)}</strong>
        <StatusBadge status={repair.status} />
      </div>
      <div style={{ color: "#aaa" }}>Current stage: <span style={{ color: "white" }}>{currentStage}</span></div>
      <div style={{ marginTop: 7, height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#00cc66,#00b4ff)" }} />
      </div>
      <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · {percent}% · Updated {formatTime(repair.technicianLastStatusAt || repair.updatedAt || repair.createdAt)}</div>
      {repair.technicianNotes && <div style={{ color: "#9a9a9a", marginTop: 5, fontStyle: "italic" }}>{repair.technicianNotes}</div>}
    </div>
  );
}

function RepairQuoteEditor({ repair, patchRepair }: { repair: Repair; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const defaults = repair.quotationItems?.length
    ? repair.quotationItems
    : [
        ...(repair.partsRequired || []).map(p => ({ label: p.name, cost: p.cost })),
        { label: "Labor Charges", cost: repair.laborCost || 0 },
        { label: "Diagnostics", cost: repair.estimatedCharge || 0 },
        { label: "GST", cost: 0 },
      ];
  const [items, setItems] = useState(defaults.length ? defaults : [{ label: "Repair Part", cost: 0 }, { label: "Labor Charges", cost: 0 }, { label: "GST", cost: 0 }]);
  const [note, setNote] = useState(repair.quotationNote || "Includes diagnosis, repair, testing, and service warranty.");
  useEffect(() => {
    const nextDefaults = repair.quotationItems?.length
      ? repair.quotationItems
      : [
          ...(repair.partsRequired || []).map(p => ({ label: p.name, cost: p.cost })),
          { label: "Labor Charges", cost: repair.laborCost || 0 },
          { label: "Diagnostics", cost: repair.estimatedCharge || 0 },
          { label: "GST", cost: 0 },
        ];
    setItems(nextDefaults.length ? nextDefaults : [{ label: "Repair Part", cost: 0 }, { label: "Labor Charges", cost: 0 }, { label: "GST", cost: 0 }]);
    setNote(repair.quotationNote || "Includes diagnosis, repair, testing, and service warranty.");
  }, [repair.id, repair.updatedAt, repair.quotation, repair.quotationNote]);
  const total = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const updateItem = (index: number, patch: Partial<{ label: string; cost: number }>) => setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 86px 24px", gap: 5 }}>
          <input value={item.label} onChange={e => updateItem(index, { label: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 7px", color: "white", fontSize: 11, minWidth: 0 }} />
          <input type="number" min="0" value={item.cost || ""} onChange={e => updateItem(index, { cost: Number(e.target.value || 0) })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 7px", color: "white", fontSize: 11, minWidth: 0 }} />
          <button className="glass-pill glass-pill-sm glass-pill-red" style={{ width: 24, minWidth: 24, padding: 0 }} onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setItems(prev => [...prev, { label: "New Item", cost: 0 }])}>Add Cost Item</button>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Quotation note" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 11 }}>{inr(total)}</span>
        <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => {
          const quoteItems = items.filter(item => item.label.trim());
          const parts = quoteItems.filter(item => !/labor|diagnostic|gst|pickup|delivery/i.test(item.label)).map(item => ({ name: item.label, cost: Number(item.cost || 0) }));
          const labor = quoteItems.find(item => /labor/i.test(item.label))?.cost || repair.laborCost || 0;
          patchRepair(repair.id, {
            status: "quotation",
            quotationItems: quoteItems,
            partsRequired: parts.length ? parts : repair.partsRequired,
            laborCost: Number(labor || 0),
            quotation: total,
            quotationNote: note,
            adminVerified: true,
            diagnosisReport: repair.diagnosisReport || "Device diagnosis completed. Repair quotation prepared after inspection.",
          });
          toast.success("Itemized repair quotation sent to customer");
        }}>Send Quote</button>
      </div>
    </div>
  );
}

function PCBuildQuoteEditor({ build, patchPCBuild }: { build: PCBuild; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  const defaults = build.quotationItems?.length
    ? build.quotationItems
    : [
        ...build.components?.map(c => ({ label: c.type + ": " + c.name, cost: c.price })) || [],
        { label: "Assembly Charge", cost: build.assemblyCharge || 0 },
        { label: "GST (18%)", cost: build.gst || 0 },
        { label: "Shipping", cost: build.shipping || 0 },
      ];
  const [items, setItems] = useState(defaults.length ? defaults : [{ label: "Component", cost: 0 }, { label: "Assembly Charge", cost: 0 }, { label: "GST", cost: 0 }]);
  const [note, setNote] = useState(build.quotationNote || "Professional build with warranty and testing.");
  useEffect(() => {
    const nextDefaults = build.quotationItems?.length
      ? build.quotationItems
      : [
          ...build.components?.map(c => ({ label: c.type + ": " + c.name, cost: c.price })) || [],
          { label: "Assembly Charge", cost: build.assemblyCharge || 0 },
          { label: "GST (18%)", cost: build.gst || 0 },
          { label: "Shipping", cost: build.shipping || 0 },
        ];
    setItems(nextDefaults.length ? nextDefaults : [{ label: "Component", cost: 0 }, { label: "Assembly Charge", cost: 0 }, { label: "GST", cost: 0 }]);
    setNote(build.quotationNote || "Professional build with warranty and testing.");
  }, [build.id, build.updatedAt, build.quotation, build.quotationNote]);
  const total = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const updateItem = (index: number, patch: Partial<{ label: string; cost: number }>) => setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, justifyContent: "flex-end" }}>
      {build.quotation ? (
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#00b4ff", fontWeight: 700 }}>{inr(build.quotation)}</span>
          <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{build.quotationNote ? build.quotationNote.split(" ").slice(0, 2).join(" ") : ""}</div>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "#777" }}>No quote</span>
      )}
      <button
        className="glass-pill glass-pill-sm glass-pill-outline"
        onClick={() => {
          const quoteItems = items.filter(item => item.label.trim());
          patchPCBuild(build.id, {
            status: "quotation",
            quotationItems: quoteItems,
            quotation: total,
            quotationNote: note,
            adminVerified: true,
          });
          toast.success("PC Build quotation sent to customer");
        }}
      >
        Edit
      </button>
    </div>
  );
}

function ServiceTechnicianCell({ request, technicianOptions, technicianName, patchServiceRequest }: { request: ServiceRequest; technicianOptions: StaffOption[]; technicianName: (id?: string) => string; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 180 }} onClick={e => e.stopPropagation()}>
      <select value={request.technicianId || ""} onChange={e => {
        const staffId = e.target.value;
        patchServiceRequest(request.id, {
          technicianId: staffId || undefined,
          status: staffId ? "technician-assigned" : request.status,
          technicianNotes: staffId ? `Assigned to ${technicianName(staffId)}` : "Technician assignment cleared",
        });
        toast.success(staffId ? `${technicianName(staffId)} notified in staff dashboard` : "Assignment cleared");
      }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
        <option value="">Assign technician...</option>
        {technicianOptions.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}
      </select>
      <div className="glass" style={{ borderRadius: 8, padding: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
        <strong style={{ color: "white" }}>{technicianName(request.technicianId)}</strong>
        <div style={{ color: "#777", marginTop: 3 }}>{request.technicianId ? "Assigned" : "Awaiting assignment"}</div>
      </div>
    </div>
  );
}

// Dedicated column mirroring the live work progress the assigned staff updates
// from their dashboard (status, current stage, % complete, last update, notes).
function ServiceStaffProgressCell({ request, technicianName }: { request: ServiceRequest; technicianName: (id?: string) => string }) {
  const steps = request.timeline || [];
  const done = steps.filter(step => step.done).length;
  const total = steps.length || 1;
  const percent = Math.round((done / total) * 100);
  const currentStage = [...steps].reverse().find(step => step.done)?.label || "Not started";
  if (!request.technicianId) {
    return <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#777" }}>No technician assigned</span>;
  }
  return (
    <div className="glass" style={{ borderRadius: 8, padding: 9, minWidth: 200, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <strong style={{ color: "white" }}>{technicianName(request.technicianId)}</strong>
        <StatusBadge status={request.status} />
      </div>
      <div style={{ color: "#aaa" }}>Current stage: <span style={{ color: "white" }}>{currentStage}</span></div>
      <div style={{ marginTop: 7, height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#ffd700,#00b4ff)" }} />
      </div>
      <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · {percent}% · Updated {formatTime(request.technicianLastStatusAt || request.updatedAt || request.createdAt)}</div>
      {request.technicianNotes && <div style={{ color: "#9a9a9a", marginTop: 5, fontStyle: "italic" }}>{request.technicianNotes}</div>}
    </div>
  );
}

function AdminServiceManagement({ store, kind, patchServiceRequest }: { store: DashboardStore; kind: ServiceRequestKind; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  useAuthStaffRefresh();
  const rows = (store.serviceRequests || []).filter(r => r.kind === kind);
  const technicianOptions = getAllStaffOptions(store);
  const technicianName = (id?: string) => technicianOptions.find(s => s.id === id)?.name || store.staff.find(s => s.id === id)?.name || "Unassigned";
  const title = kind === "upgrade" ? "Upgrade Management" : kind === "software" ? "Software & Data Management" : kind === "rental" ? "Rental Management" : kind === "sell" ? "Second-Hand Sell Requests" : kind === "assembly" ? "Assembly Management" : "Support Dashboard";
  const subtitle = kind === "upgrade"
    ? "Review upgrade requests, verify compatibility, assign technicians, quote, reserve parts, and track QA"
    : kind === "software"
      ? "Review software/data requests, assign engineers, quote, track backup, recovery, installation, QA, and reports"
      : kind === "rental"
        ? "Verify documents, approve rentals, assign products, generate agreements, track deposits, delivery, returns, refunds"
        : kind === "sell"
          ? "Review product photos, assign inspection, generate price offers, approve payment, certify inventory, publish for resale"
          : kind === "assembly"
            ? "Validate customer-provided equipment, assign staff, quote assembly & installation, and track assembly, testing, invoice, and warranty"
            : "Classify support tickets, assign technicians, monitor sessions, proposals, invoices, SLA, AMC, and feedback";

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <DataTable
        rowKey={r => r.id}
        data={rows}
        columns={[
          { key: "id", label: "Request", render: r => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>#{r.id.slice(-8).toUpperCase()}</span> },
          { key: "customer", label: "Customer", render: r => (
            <div>
              <div style={{ color: "white" }}>{r.customerName || r.customerId}</div>
              <div style={{ fontSize: 10, color: "#777" }}>{r.contactPhone || "No phone"}</div>
            </div>
          ) },
          { key: "request", label: "Request", render: r => (
            <div>
              <div style={{ color: "white" }}>{r.category}</div>
              <div style={{ fontSize: 10, color: "#777" }}>{r.deviceType} · {r.serviceMethod}</div>
            </div>
          ) },
          { key: "details", label: "Requirements", render: r => <span style={{ maxWidth: 240, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.requirements}</span> },
          { key: "media", label: "Media", render: r => <MediaCell files={r.uploads} /> },
          { key: "technician", label: "Technician", render: r => (
            <ServiceTechnicianCell request={r} technicianOptions={technicianOptions} technicianName={technicianName} patchServiceRequest={patchServiceRequest} />
          ) },
          { key: "staffProgress", label: "Staff Work Progress", render: r => (
            <ServiceStaffProgressCell request={r} technicianName={technicianName} />
          ) },
          { key: "quote", label: kind === "sell" ? "Offer Details" : "Quote Details", render: r => <ServiceQuoteEditor request={r} kind={kind} patchServiceRequest={patchServiceRequest} /> },
          { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
          { key: "action", label: "", render: r => (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
              <select value={r.status} onChange={e => {
                patchServiceRequest(r.id, { status: e.target.value as ServiceRequest["status"] });
                toast.success("Customer timeline updated");
              }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
                {SERVICE_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button className="glass-pill glass-pill-sm glass-pill-success" onClick={() => { patchServiceRequest(r.id, { adminVerified: true, status: "admin-approved" }); toast.success("Request approved"); }}>Approve</button>
                <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => { patchServiceRequest(r.id, { status: "rejected" }); toast.error("Request rejected"); }}>Reject</button>
              </div>
            </div>
          ) },
        ]}
      />
    </SectionCard>
  );
}

function ServiceQuoteEditor({ request, kind, patchServiceRequest }: { request: ServiceRequest; kind: ServiceRequestKind; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const defaults = request.quotationItems?.length
    ? request.quotationItems
    : kind === "upgrade"
      ? [{ label: "Component Price", cost: 0 }, { label: "Installation Charges", cost: 0 }, { label: "Optimization Charges", cost: 0 }, { label: "GST", cost: 0 }]
      : kind === "software"
        ? [{ label: "Service Charges", cost: 0 }, { label: "Software License Cost", cost: 0 }, { label: "Data Recovery Cost", cost: 0 }, { label: "GST", cost: 0 }]
        : kind === "rental"
          ? [{ label: "Rental Charges", cost: 0 }, { label: "Security Deposit", cost: 0 }, { label: "Delivery Charges", cost: 0 }, { label: "GST", cost: 0 }]
          : kind === "sell"
            ? [{ label: "Final Offered Price", cost: request.expectedPrice || 0 }]
            : kind === "assembly"
              ? [{ label: "Assembly Charges", cost: 0 }, { label: "Installation Charges", cost: 0 }, { label: "Cable Management", cost: 0 }, { label: "Configuration Charges", cost: 0 }, { label: "Travel Charges", cost: 0 }, { label: "GST", cost: 0 }]
              : [{ label: "Support Charges", cost: 0 }, { label: "AMC / SLA Charges", cost: 0 }, { label: "GST", cost: 0 }];
  const [items, setItems] = useState(defaults);
  const [note, setNote] = useState(request.quotationNote || "Includes service, documentation, testing, and customer notification.");
  const total = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const updateItem = (index: number, patch: Partial<{ label: string; cost: number }>) => setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 86px 24px", gap: 5 }}>
          <input value={item.label} onChange={e => updateItem(index, { label: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 7px", color: "white", fontSize: 11, minWidth: 0 }} />
          <input type="number" min="0" value={item.cost || ""} onChange={e => updateItem(index, { cost: Number(e.target.value || 0) })} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 7px", color: "white", fontSize: 11, minWidth: 0 }} />
          <button className="glass-pill glass-pill-sm glass-pill-red" style={{ width: 24, minWidth: 24, padding: 0 }} onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
      <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setItems(prev => [...prev, { label: "New Item", cost: 0 }])}>Add Cost Item</button>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Quotation note" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 11 }}>{inr(total)}</span>
        <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => {
          patchServiceRequest(request.id, {
            status: kind === "sell" ? "offer-sent" : "quotation",
            quotationItems: items.filter(item => item.label.trim()),
            quotation: total,
            quotationNote: note,
            diagnosisReport: request.diagnosisReport || (kind === "sell" ? "Product inspection reviewed and price offer prepared." : kind === "rental" ? "Documents and availability reviewed. Rental quote prepared." : kind === "support" ? "Support scope reviewed and quotation/proposal prepared." : kind === "upgrade" ? "System inspected, benchmarked, and upgrade path identified." : kind === "assembly" ? "Customer-provided equipment reviewed and assembly scope prepared." : "Software diagnosis completed and service scope prepared."),
            compatibilityReport: request.compatibilityReport || (kind === "rental" ? "Product availability, deposit, agreement, and delivery requirements checked." : kind === "sell" ? "Photos, bill, serial number, and condition reviewed." : kind === "support" ? "Issue severity, support method, and resolution path checked." : kind === "upgrade" ? "Compatibility, BIOS support, thermals, clearance, and power draw verified." : kind === "assembly" ? "Equipment checklist, component compatibility, and on-site/in-shop requirements checked." : "OS, storage health, drivers, malware state, and data availability checked."),
            recommendation: request.recommendation || (kind === "sell" ? "Offer sent to customer for approval." : kind === "rental" ? "Proceed with agreement, payment, product reservation, and delivery." : kind === "support" ? "Proceed with support session/proposal and resolution workflow." : kind === "upgrade" ? "Recommended upgrade package prepared." : kind === "assembly" ? "Proceed with assembly, configuration, testing, and validation." : "Recommended software/data service plan prepared."),
          });
          toast.success(kind === "sell" ? "Price offer sent to customer" : "Itemized quotation sent to customer");
        }}>{kind === "sell" ? "Send Offer" : "Send Quote"}</button>
      </div>
    </div>
  );
}

export function AdminUpgrades(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="upgrade" />;
}

export function AdminSoftwareServices(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="software" />;
}

export function AdminRentalWorkflow(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="rental" />;
}

export function AdminSellRequests(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="sell" />;
}

export function AdminSupportWorkflow(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="support" />;
}

export function AdminAssemblyService(props: { store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <AdminServiceManagement {...props} kind="assembly" />;
}

// ─── Rentals ──────────────────────────────────────────────────────────────

export function AdminRentals({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Rental Requests">
      <DataTable
        rowKey={r => r.id}
        data={store.rentals}
        columns={[
          { key: "product", label: "Product", render: r => r.productName },
          { key: "period", label: "Period", render: r => `${formatDate(r.startDate)} → ${formatDate(r.endDate)}` },
          { key: "deposit", label: "Deposit", align: "right", render: r => inr(r.deposit) },
          { key: "rate", label: "Monthly", align: "right", render: r => inr(r.monthlyRate) },
          { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
          { key: "action", label: "", render: r => (
            <div style={{ display: "flex", gap: 4 }}>
              <button className="glass-pill glass-pill-sm glass-pill-success" onClick={() => toast.success("Approved")}>Approve</button>
              <button className="glass-pill glass-pill-sm glass-pill-info">Refund</button>
            </div>
          )},
        ]}
      />
    </SectionCard>
  );
}

// ─── Custom PC ────────────────────────────────────────────────────────────

export function AdminCustomPC({ store, patchPCBuild }: { store: DashboardStore; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  useAuthStaffRefresh();
  const builders = getAllStaffOptions(store);
  const builderName = (id?: string) => builders.find(s => s.id === id)?.name || store.staff.find(s => s.id === id)?.name || "Unassigned";
  return (
    <SectionCard title="Custom PC Management" subtitle="Review requirements, validate compatibility, reserve inventory, quote, assign builder, and track delivery">
      <DataTable
        rowKey={b => b.id}
        data={store.pcBuilds}
        columns={[
          { key: "name", label: "Build", render: b => <div><div style={{ color: "white" }}>{b.name}</div><small style={{ color: "#777" }}>{b.purpose || "Purpose"} · {b.performanceLevel || "Level"} · {b.budgetRange || "Budget"}</small></div> },
          { key: "customer", label: "Customer", render: b => (
            <div style={{ minWidth: 170 }}>
              <div style={{ color: "white" }}>{b.customerName || b.customerId}</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{b.contactEmail || "No email"}</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{b.contactPhone || "No phone"}</div>
            </div>
          ) },
          { key: "components", label: "Components & Breakdown", render: b => (
            <div style={{ minWidth: 320, display: "grid", gap: 5 }}>
              {b.components.map(c => (
                <div key={`${c.type}-${c.name}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#ddd" }}>
                  <span><strong style={{ color: "white" }}>{c.type}:</strong> {c.name}</span>
                  <span style={{ color: "#FF1F45", whiteSpace: "nowrap" }}>{inr(c.price)}</span>
                </div>
              ))}
              <div style={{ margin: "6px 0", height: 1, background: "rgba(255,255,255,.06)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#aaa" }}>
                <span>Assembly Charge</span><span>{inr(b.assemblyCharge || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#aaa" }}>
                <span>GST (18%)</span><span>{inr(b.gst || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#aaa" }}>
                <span>Shipping</span><span>{b.shipping ? inr(b.shipping) : "FREE"}</span>
              </div>
              <div style={{ margin: "6px 0", height: 1, background: "rgba(255,255,255,.06)" }} />
              <div style={{ fontSize: 10, color: "#777", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>Compatibility Report</div>
              {(b.validationReport || []).map(v => (
                <div key={v.label} style={{ display: "flex", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: v.pass ? "#00cc66" : "#ff1f45", alignItems: "flex-start" }}>
                  <CheckCircle size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span title={v.detail}>{v.label}</span>
                </div>
              ))}
            </div>
          ) },
          { key: "quote", label: "Quote", render: b => (
            <PCBuildQuoteEditor build={b} patchPCBuild={patchPCBuild} />
          ) },
          { key: "tech", label: "Technician", render: b => (
            <PCBuildTechnicianCell build={b} builders={builders} builderName={builderName} patchPCBuild={patchPCBuild} />
          ) },
          { key: "staffProgress", label: "Staff Work Progress", render: b => (
            <PCBuildStaffProgressCell build={b} builderName={builderName} />
          ) },
          { key: "status", label: "Status", render: b => <StatusBadge status={b.status} /> },
          { key: "action", label: "", render: b => (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
              <select value={b.status} onChange={e => { patchPCBuild(b.id, { status: e.target.value as PCBuild["status"] }); toast.success("Build status synced"); }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
                {PC_BUILD_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => { patchPCBuild(b.id, { status: "components-verified" }); toast.success("Components verified"); }}>Verify</button>
                <button className="glass-pill glass-pill-sm glass-pill-success" onClick={() => { patchPCBuild(b.id, { status: "quotation", quotation: b.quotation || b.total, quotationNote: "Admin verified quotation sent to customer." }); toast.success("Quotation sent"); }}>Quote</button>
                <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => { patchPCBuild(b.id, { status: "reserved" }); toast.success("Components reserved"); }}>Reserve</button>
                <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => { patchPCBuild(b.id, { status: "warranty-generated", invoiceId: b.invoiceId || `INV-${b.id.slice(-6).toUpperCase()}`, warrantyId: b.warrantyId || `WAR-${b.id.slice(-6).toUpperCase()}`, warrantyEndsAt: Date.now() + 1095 * 86400000 }); toast.success("Invoice and warranty generated"); }}>Docs</button>
              </div>
            </div>
          ) },
        ]}
      />
    </SectionCard>
  );
}

function PCBuildTechnicianCell({ build, builders, builderName, patchPCBuild }: { build: PCBuild; builders: StaffOption[]; builderName: (id?: string) => string; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 180 }} onClick={e => e.stopPropagation()}>
      <select value={build.technicianId || ""} onChange={e => {
        const staffId = e.target.value;
        patchPCBuild(build.id, {
          technicianId: staffId || undefined,
          status: staffId ? "technician-assigned" : build.status,
          technicianNotes: staffId ? `Assigned to ${builderName(staffId)}` : "Technician assignment cleared",
        });
        toast.success(staffId ? `${builderName(staffId)} notified in staff dashboard` : "Assignment cleared");
      }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
        <option value="">Assign PC builder...</option>
        {builders.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}
      </select>
      <div className="glass" style={{ borderRadius: 8, padding: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
        <strong style={{ color: "white" }}>{builderName(build.technicianId)}</strong>
        <div style={{ color: "#777", marginTop: 3 }}>{build.technicianId ? "Assigned" : "Awaiting assignment"}</div>
      </div>
    </div>
  );
}

// Dedicated column mirroring the live build progress the assigned builder updates
// from their staff dashboard (status, current stage, % complete, last update).
function PCBuildStaffProgressCell({ build, builderName }: { build: PCBuild; builderName: (id?: string) => string }) {
  const steps = build.timeline || [];
  const done = steps.filter(step => step.done).length;
  const total = steps.length || 1;
  const percent = Math.round((done / total) * 100);
  const currentStage = [...steps].reverse().find(step => step.done)?.label || "Not started";
  if (!build.technicianId) {
    return <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#777" }}>No builder assigned</span>;
  }
  return (
    <div className="glass" style={{ borderRadius: 8, padding: 9, minWidth: 200, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <strong style={{ color: "white" }}>{builderName(build.technicianId)}</strong>
        <StatusBadge status={build.status} />
      </div>
      <div style={{ color: "#aaa" }}>Current stage: <span style={{ color: "white" }}>{currentStage}</span></div>
      <div style={{ marginTop: 7, height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#a855f7,#00b4ff)" }} />
      </div>
      <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · {percent}% · Updated {formatTime(build.technicianLastStatusAt || build.updatedAt || build.createdAt)}</div>
      {build.technicianNotes && <div style={{ color: "#9a9a9a", marginTop: 5, fontStyle: "italic" }}>{build.technicianNotes}</div>}
    </div>
  );
}

// ─── Custom Builder Management ─────────────────────────────────────────────

const COMPONENT_CATEGORIES: ComponentCategory[] = ["CPU", "Motherboard", "RAM", "GPU", "Storage", "PSU", "Cabinet", "Cooler", "Fans", "OS", "Accessories", "Network Device"];
const MARKET_TAGS: MarketTag[] = ["Low Budget", "Budget Popular", "Frequent", "Popular", "Trending", "Latest", "Creator", "Premium", "Rich Class", "Extreme"];
const STOCK_STATUSES: { value: BuilderComponent["stockStatus"]; label: string }[] = [
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
  { value: "pre-order", label: "Pre-Order" },
];
const PERFORMANCE_TIERS: PerformanceTier[] = ["Entry", "Mid", "High", "Extreme"];
const BUDGET_RANGES = ["Under ₹75,000", "₹75,000 - ₹1,00,000", "₹1,00,000 - ₹2,00,000", "₹2,00,000 - ₹3,00,000", "₹3,00,000+"];
const COMPATIBILITY_RULE_TYPES = [
  { value: "socket", label: "CPU Socket" },
  { value: "chipset", label: "Chipset" },
  { value: "memory-type", label: "Memory Type (DDR4/DDR5)" },
  { value: "power", label: "Power/PSU" },
  { value: "physical", label: "Physical Fit" },
  { value: "slot", label: "Slot Availability" },
  { value: "interface", label: "Interface" },
];

function BuilderOverviewMetrics({ metrics }: { metrics: { totalCategories: number; activeOptions: number; hiddenOptions: number; popularSelections: { componentId: string; name: string; count: number }[]; latestPriceUpdate: number; buildRequestsGenerated: number } }) {
  const topPick = metrics.popularSelections[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
      <KPICard label="Total Categories" value={metrics.totalCategories} icon={<Package size={14} />} color="#FF1F45" />
      <KPICard label="Active Options" value={metrics.activeOptions} icon={<CheckCircle size={14} />} color="#00cc66" />
      <KPICard label="Hidden/Disabled" value={metrics.hiddenOptions} icon={<Archive size={14} />} color="#ff6b00" />
      <KPICard label="Top Selected" value={topPick ? `${topPick.name} (${topPick.count}×)` : "No data yet"} icon={<Star size={14} />} color="#FFD700" />
      <KPICard label="Latest Price Update" value={new Date(metrics.latestPriceUpdate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} icon={<Clock size={14} />} color="#00b4ff" />
      <KPICard label="Build Requests" value={metrics.buildRequestsGenerated} icon={<Cpu size={14} />} color="#a855f7" />
    </div>
  );
}


function ContentConfigEditor({ config, onChange }: { config: BuilderContentConfig; onChange: (patch: Partial<BuilderContentConfig>) => void }) {
  const set = <K extends keyof BuilderContentConfig>(key: K, value: BuilderContentConfig[K]) => onChange({ [key]: value });
  return (
    <SectionCard title="Builder Page Content" subtitle="Customize the customer-facing Custom PC Builder page">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Field label="Page Title" value={config.pageTitle} onChange={v => set("pageTitle", v)} placeholder="Custom PC Solutions" />
        <Field label="Subtitle" value={config.subtitle} onChange={v => set("subtitle", v)} placeholder="Configure your dream PC" />
        <Field label="Workflow Badge Text" value={config.workflowBadgeText} onChange={v => set("workflowBadgeText", v)} placeholder="End-to-End Build Workflow" />
        <Field label="Builder Description" value={config.builderDescription} onChange={v => set("builderDescription", v)} placeholder="Detailed description..." multiline />
        <Field label="CTA Button Text" value={config.ctaButtonText} onChange={v => set("ctaButtonText", v)} placeholder="Submit Build Request" />
        <Field label="Assembly Charge (₹)" type="number" value={String(config.assemblyCharge)} onChange={v => set("assemblyCharge", Number(v) || 0)} />
        <Field label="GST Percentage" type="number" value={String(config.gstPercentage)} onChange={v => set("gstPercentage", Number(v) || 0)} />
        <Field label="Free Shipping Threshold (₹)" type="number" value={String(config.freeShippingThreshold)} onChange={v => set("freeShippingThreshold", Number(v) || 0)} />
        <Field label="Shipping Rule Description" value={config.shippingRule} onChange={v => set("shippingRule", v)} placeholder="Free shipping above..." />
      </div>
      <div style={{ marginTop: 20 }}>
        <label style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>Validation Checklist Labels</label>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {config.validationChecklist.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={item} onChange={e => {
                const next = [...config.validationChecklist];
                next[idx] = e.target.value;
                onChange({ validationChecklist: next });
              }} style={{ flex: 1, background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 12 }} />
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => {
                const next = config.validationChecklist.filter((_, i) => i !== idx);
                onChange({ validationChecklist: next });
              }}><Trash2 size={10} /></button>
            </div>
          ))}
          <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => onChange({ validationChecklist: [...config.validationChecklist, "New Check"] })} style={{ marginTop: 8 }}>
            <Plus size={10} /> Add Checklist Item
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function BuildPurposesManager({ purposes, onUpdate, onAdd, onRemove }: { purposes: BuildPurposeButton[]; onUpdate: (id: string, patch: Partial<BuildPurposeButton>) => void; onAdd: () => void; onRemove: (id: string) => void }) {
  const sorted = [...purposes].sort((a, b) => a.order - b.order);
  return (
    <SectionCard title="Build Purposes" subtitle="Manage customer build purpose options">
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map(p => (
          <div key={p.id} className="glass" style={{ borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center" }}>
            <GripVertical size={14} color="#555" />
            <Field label="Purpose" value={p.purpose} onChange={v => onUpdate(p.id, { purpose: v as BuildPurpose })} />
            <Field label="Label" value={p.label} onChange={v => onUpdate(p.id, { label: v })} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={p.isActive ? "active" : "hidden"} onChange={e => onUpdate(p.id, { isActive: e.target.value === "active" })} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
              <button className={`glass-pill glass-pill-sm ${p.isActive ? "glass-pill-success" : "glass-pill-outline"}`} onClick={() => onUpdate(p.id, { isActive: !p.isActive })} style={{ padding: "5px 8px", fontSize: 9 }}>
                <ToggleLeft size={11} /> {p.isActive ? "On" : "Off"}
              </button>
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => onRemove(p.id)}><Trash2 size={10} /></button>
            </div>
          </div>
        ))}
      </div>
      <button className="glass-pill glass-pill-primary" onClick={onAdd} style={{ marginTop: 14 }}>
        <Plus size={12} /> Add Build Purpose
      </button>
    </SectionCard>
  );
}

function ComponentCategoryManager({ components, categoryId, onAdd, onUpdate, onRemove, onReorder }: { components: BuilderComponent[]; categoryId: ComponentCategory; onAdd: () => void; onUpdate: (id: string, patch: Partial<BuilderComponent>) => void; onRemove: (id: string) => void; onReorder: (id: string, newOrder: number) => void }) {
  const sorted = [...components].sort((a, b) => a.order - b.order);
  return (
    <div className="glass" style={{ borderRadius: 12, padding: 16, border: "1px solid rgba(255,31,69,.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#FF1F45" }}>{categoryId}</div>
        <span style={{ fontSize: 11, color: "#777" }}>{sorted.filter(c => c.isActive).length} active · {sorted.length} total</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map((comp, idx) => (
          <div key={comp.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 8, alignItems: "center", padding: "8px 10px", background: comp.isActive ? "transparent" : "rgba(255,255,255,.02)", borderRadius: 8 }}>
            <GripVertical size={12} color="#555" />
            <div style={{ fontSize: 12, color: comp.isActive ? "white" : "#666", textDecoration: comp.isActive ? "none" : "line-through" }}>
              {comp.brand} {comp.model}
            </div>
            <div style={{ fontSize: 11, color: "#aaa" }}>₹{comp.price.toLocaleString("en-IN")}</div>
            {comp.marketTag && <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ fontSize: 9, padding: "3px 6px" }}>{comp.marketTag}</span>}
            <div style={{ display: "flex", gap: 4 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => onUpdate(comp.id, { isActive: !comp.isActive })} style={{ fontSize: 9, padding: "4px 6px" }}>
                {comp.isActive ? <EyeIcon size={10} /> : <Eye size={10} />}
              </button>
              <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => {
                const newName = prompt("Rename component:", comp.name);
                if (newName) onUpdate(comp.id, { name: newName });
              }} style={{ fontSize: 9, padding: "4px 6px" }}><Edit3 size={10} /></button>
              <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => onRemove(comp.id)} style={{ fontSize: 9, padding: "4px 6px" }}><Trash2 size={10} /></button>
            </div>
          </div>
        ))}
      </div>
      <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={onAdd} style={{ marginTop: 10, fontSize: 10 }}>
        <Plus size={10} /> Add Component
      </button>
    </div>
  );
}

function AddComponentDialog({ categoryId, onClose, onAdd }: { categoryId: ComponentCategory; onClose: () => void; onAdd: (comp: Omit<BuilderComponent, "id" | "order">) => void }) {
  const [form, setForm] = useState({
    name: "", brand: "", model: "", price: "", marketTag: "" as MarketTag | "",
    tier: "" as PerformanceTier | "", compatibilityNotes: "", stockStatus: "in-stock" as BuilderComponent["stockStatus"],
    isActive: true,
  });
  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = () => {
    if (!form.name.trim() || !form.price) { toast.error("Name and price are required."); return; }
    onAdd({
      categoryId,
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      price: Number(form.price),
      marketTag: form.marketTag || undefined,
      tier: form.tier || undefined,
      compatibilityNotes: form.compatibilityNotes.trim() || undefined,
      stockStatus: form.stockStatus,
      isActive: form.isActive,
    });
    onClose();
    toast.success("Component added successfully");
  };
  return (
    <div className="glass-card" style={{ padding: 20, maxWidth: 500, margin: "0 auto", border: "1px solid rgba(255,31,69,.3)" }}>
      <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", marginBottom: 16 }}>Add Component to {categoryId}</h3>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Component Name" value={form.name} onChange={v => set("name", v)} placeholder="e.g., RTX 5070 12GB" required />
        <Field label="Brand" value={form.brand} onChange={v => set("brand", v)} placeholder="e.g., NVIDIA" />
        <Field label="Model" value={form.model} onChange={v => set("model", v)} placeholder="e.g., RTX 5070" />
        <Field label="Price (₹)" type="number" value={form.price} onChange={v => set("price", v)} placeholder="66000" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Market Tag" value={form.marketTag} onChange={v => set("marketTag", v as MarketTag)} placeholder="e.g., Trending" />
          <Field label="Tier" value={form.tier} onChange={v => set("tier", v as PerformanceTier)} placeholder="e.g., High" />
        </div>
        <Field label="Compatibility Notes" value={form.compatibilityNotes} onChange={v => set("compatibilityNotes", v)} placeholder="e.g., Requires DDR5 motherboard" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>Stock Status</label>
            <select value={form.stockStatus} onChange={e => set("stockStatus", e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 12, marginTop: 6 }}>
              {STOCK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
              <span style={{ fontSize: 12, color: "white" }}>Active</span>
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="glass-pill glass-pill-primary" onClick={submit}><Save size={12} /> Add Component</button>
          <button className="glass-pill glass-pill-outline" onClick={onClose}><X size={12} /> Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PricingRulesEditor({ pricingRules, onChange }: { pricingRules: CustomBuilderConfig["pricingRules"]; onChange: (patch: Partial<CustomBuilderConfig["pricingRules"]>) => void }) {
  return (
    <SectionCard title="Pricing Rules" subtitle="Configure assembly charges, GST, and shipping">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>Assembly Charges by Tier</label>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {PERFORMANCE_TIERS.map(tier => (
              <div key={tier} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#aaa", width: 80 }}>{tier}</span>
                <Field label="" type="number" value={String(pricingRules.assemblyCharges[tier] || 0)} onChange={v => onChange({ assemblyCharges: { ...pricingRules.assemblyCharges, [tier]: Number(v) || 0 } })} style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="GST (%)" type="number" value={String(pricingRules.gstPercent)} onChange={v => onChange({ gstPercent: Number(v) || 0 })} />
          <Field label="Shipping Charge (₹)" type="number" value={String(pricingRules.shippingCharge)} onChange={v => onChange({ shippingCharge: Number(v) || 0 })} />
          <Field label="Free Shipping Threshold (₹)" type="number" value={String(pricingRules.freeShippingThreshold)} onChange={v => onChange({ freeShippingThreshold: Number(v) || 0 })} />
        </div>
      </div>
    </SectionCard>
  );
}

function CompatibilityRulesEditor({ rules, onUpdate, onAdd }: { rules: CompatibilityRule[]; onUpdate: (id: string, patch: Partial<CompatibilityRule>) => void; onAdd: () => void }) {
  return (
    <SectionCard title="Compatibility Rules" subtitle="Configure validation rules for component compatibility">
      <div style={{ display: "grid", gap: 8 }}>
        {rules.map(rule => (
          <div key={rule.id} className="glass" style={{ borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "white", fontWeight: 600 }}>{rule.name}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{rule.description}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span className="glass-pill glass-pill-sm glass-pill-outline">{rule.category}</span>
                <span style={{ fontSize: 10, color: "#555" }}>↔</span>
                {rule.checksWith.map(cat => <span key={cat} className="glass-pill glass-pill-sm glass-pill-outline">{cat}</span>)}
                <span className="glass-pill glass-pill-sm glass-pill-info">{COMPATIBILITY_RULE_TYPES.find(t => t.value === rule.ruleType)?.label}</span>
              </div>
            </div>
            <select value={rule.isActive ? "active" : "inactive"} onChange={e => onUpdate(rule.id, { isActive: e.target.value === "active" })} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className={`glass-pill glass-pill-sm ${rule.isActive ? "glass-pill-success" : "glass-pill-outline"}`} onClick={() => onUpdate(rule.id, { isActive: !rule.isActive })}>
              <ToggleLeft size={11} /> {rule.isActive ? "On" : "Off"}
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function BuilderPreviewDialog({ config, onClose }: { config: CustomBuilderConfig; onClose: () => void }) {
  const [form, setForm] = useState({ name: "Preview Customer", phone: "9876543210", email: "preview@test.com", purpose: "Gaming", budgetRange: "₹1,00,000 - ₹2,00,000", performanceLevel: "High" });
  const selected = COMPONENT_CATEGORIES.reduce((acc, cat) => { acc[cat] = 0; return acc; }, {} as Record<ComponentCategory, number>);
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#050505", borderRadius: 16, maxWidth: 1200, width: "100%", maxHeight: "90vh", overflow: "auto", border: "1px solid rgba(122,0,255,.35)", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "white" }}>Preview: {config.contentConfig.pageTitle}</h2>
          <button className="glass-pill glass-pill-sm glass-pill-red" onClick={onClose}><X size={14} /> Close</button>
        </div>
        <div style={{ background: "#0a0a0a", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "#FF1F45", marginBottom: 8 }}>{config.contentConfig.pageTitle}</h3>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16 }}>{config.contentConfig.builderDescription}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {config.buildPurposes.filter(p => p.isActive).map(v => (
              <button key={v.id} className={form.purpose === v.purpose ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("purpose", v.purpose)} style={{ padding: "9px 13px", fontSize: 10 }}>{v.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {PERFORMANCE_TIERS.map(v => (
              <button key={v} className={form.performanceLevel === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("performanceLevel", v)} style={{ padding: "9px 13px", fontSize: 10 }}>{v}</button>
            ))}
            <select value={form.budgetRange} onChange={e => set("budgetRange", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "9px 13px", color: "white", fontSize: 11 }}>
              {BUDGET_RANGES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
          {COMPONENT_CATEGORIES.map(cat => {
            const catComponents = config.components[cat]?.filter(c => c.isActive) || [];
            if (!catComponents.length) return null;
            return (
              <div key={cat} className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "#FF1F45", marginBottom: 8 }}>{cat}</div>
                <select style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "10px", color: "white" }}>
                  {catComponents.map((o, i) => <option key={o.id} value={i}>{o.name} · ₹{o.price.toLocaleString("en-IN")}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        <div className="glass-card" style={{ borderRadius: 14, padding: 22, border: "1px solid rgba(122,0,255,.35)" }}>
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 16px" }}>Build Summary Preview</h3>
          <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Customer:</strong> {form.name} · {form.phone}</div>
            <div style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Purpose:</strong> {form.purpose} · <strong style={{ color: "white" }}>Tier:</strong> {form.performanceLevel}</div>
            <div style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Budget:</strong> {form.budgetRange}</div>
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              {(config.contentConfig.validationChecklist || []).map(v => (
                <span key={v} style={{ display: "flex", gap: 8, fontSize: 12, color: "#00cc66" }}><CheckCircle size={13} /> {v}</span>
              ))}
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#aaa" }}>Components Total</span>
                <span style={{ color: "white" }}>₹--</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#aaa" }}>Assembly ({form.performanceLevel})</span>
                <span style={{ color: "white" }}>₹{config.pricingRules.assemblyCharges[form.performanceLevel as PerformanceTier]?.toLocaleString("en-IN") || "--"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#aaa" }}>GST ({config.contentConfig.gstPercentage}%)</span>
                <span style={{ color: "white" }}>Calculated at checkout</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 16, borderTop: "2px solid rgba(122,0,255,.5)" }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12 }}>Final Estimate</span>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, color: "#7a00ff", fontWeight: 800 }}>₹--</span>
            </div>
          </div>
          <button className="glass-pill glass-pill-primary" style={{ padding: "13px 20px", fontSize: 10, marginTop: 18, width: "100%", opacity: 0.6, cursor: "not-allowed" }} disabled>
            {config.contentConfig.ctaButtonText} (Preview Mode)
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminCustomBuilder({
  store, patchCustomBuilderConfig, publishBuilderConfig, addBuilderComponent,
  updateBuilderComponent, removeBuilderComponent, reorderBuilderComponents,
  updateBuildPurpose, addBuildPurpose, removeBuildPurpose,
  updatePricingRules, updateContentConfig, updateDefaultPreset, getBuilderMetrics,
}: {
  store: DashboardStore;
  patchCustomBuilderConfig: (patch: Partial<CustomBuilderConfig>) => void;
  publishBuilderConfig: () => void;
  addBuilderComponent: (categoryId: ComponentCategory, component: Omit<BuilderComponent, "id" | "order">) => void;
  updateBuilderComponent: (categoryId: ComponentCategory, componentId: string, patch: Partial<BuilderComponent>) => void;
  removeBuilderComponent: (categoryId: ComponentCategory, componentId: string) => void;
  reorderBuilderComponents: (categoryId: ComponentCategory, componentId: string, newOrder: number) => void;
  updateBuildPurpose: (purposeId: string, patch: Partial<BuildPurposeButton>) => void;
  addBuildPurpose: (purpose: Omit<BuildPurposeButton, "id">) => void;
  removeBuildPurpose: (purposeId: string) => void;
  updatePricingRules: (patch: Partial<CustomBuilderConfig["pricingRules"]>) => void;
  updateContentConfig: (patch: Partial<BuilderContentConfig>) => void;
  updateDefaultPreset: (tier: PerformanceTier, components: Record<string, string>) => void;
  getBuilderMetrics: () => { totalCategories: number; activeOptions: number; hiddenOptions: number; popularSelections: { componentId: string; name: string; count: number }[]; latestPriceUpdate: number; buildRequestsGenerated: number };
}) {
  useAuthStaffRefresh();
  const config = store.customBuilderConfig;
  const metrics = getBuilderMetrics();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPreview, setShowPreview] = useState(false);
  const [showAddComponent, setShowAddComponent] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const sections = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "content", label: "Page Content", icon: <Edit3 size={14} /> },
    { id: "purposes", label: "Build Purposes", icon: <ClipboardList size={14} /> },
    { id: "categories", label: "Component Categories", icon: <Package size={14} /> },
    { id: "compatibility", label: "Compatibility Rules", icon: <CheckCircle size={14} /> },
    { id: "pricing", label: "Pricing Rules", icon: <Receipt size={14} /> },
  ];

  const saveDraft = () => {
    patchCustomBuilderConfig({ status: "draft" });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
    toast.success("Draft saved successfully");
  };

  const publish = () => {
    const validationErrors: string[] = [];
    const categoriesWithComponents = Object.keys(config.components) as ComponentCategory[];
    categoriesWithComponents.forEach(cat => {
      const active = config.components[cat]?.filter(c => c.isActive) || [];
      if (cat === "CPU" || cat === "Motherboard" || cat === "RAM" || cat === "GPU" || cat === "PSU") {
        if (active.length === 0) validationErrors.push(`${cat}: At least one active option required`);
      }
      const names = active.map(c => c.name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) validationErrors.push(`${cat}: Duplicate component names found`);
    });
    const hasDefaults = config.defaultPresets.every(p => Object.keys(p.components).length > 0);
    if (!hasDefaults) validationErrors.push("All tier presets must have default selections");
    if (!config.contentConfig.validationChecklist.length) validationErrors.push("Validation checklist is empty");
    if (validationErrors.length > 0) {
      toast.error("Validation failed:\n" + validationErrors.join("\n"));
      return;
    }
    publishBuilderConfig();
    toast.success("Builder configuration published successfully!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white", margin: 0 }}>Custom Builder Management</h1>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Configure the customer-facing Custom PC Builder</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className={`glass-pill ${config.status === "published" ? "glass-pill-success" : "glass-pill-outline"}`} style={{ fontSize: 10 }}>
            <StatusBadge status={config.status} />
          </span>
          <button className="glass-pill glass-pill-outline" onClick={() => setShowPreview(true)}><EyeIcon size={12} /> Preview Builder</button>
          <button className="glass-pill glass-pill-info" onClick={saveDraft}>
            <Save size={12} /> {draftSaved ? "Saved!" : "Save Draft"}
          </button>
          <button className="glass-pill glass-pill-primary" onClick={publish}><Send size={12} /> Publish Changes</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 12 }}>
        {sections.map(s => (
          <button key={s.id} className={`glass-pill ${activeTab === s.id ? "glass-pill-primary" : "glass-pill-outline"}`} onClick={() => setActiveTab(s.id)} style={{ fontSize: 11 }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div>
          <BuilderOverviewMetrics metrics={metrics} />
          <SectionCard title="Builder Configuration" subtitle="Current configuration overview">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>Configuration Info</div>
                <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Version</span><span style={{ color: "white" }}>v{config.version}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Status</span><span style={{ color: "white" }}>{config.status}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Published At</span><span style={{ color: "white" }}>{config.publishedAt ? new Date(config.publishedAt).toLocaleString("en-IN") : "Never"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Last Modified</span><span style={{ color: "white" }}>{new Date(config.lastModifiedAt).toLocaleString("en-IN")}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Modified By</span><span style={{ color: "white" }}>{config.modifiedBy}</span></div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>Quick Stats</div>
                <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Build Purposes</span><span style={{ color: "white" }}>{config.buildPurposes.length} ({config.buildPurposes.filter(p => p.isActive).length} active)</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Component Categories</span><span style={{ color: "white" }}>{Object.keys(config.components).length}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Compatibility Rules</span><span style={{ color: "white" }}>{config.compatibilityRules.length} ({config.compatibilityRules.filter(r => r.isActive).length} active)</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Performance Tiers</span><span style={{ color: "white" }}>{PERFORMANCE_TIERS.length}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#aaa" }}>Budget Ranges</span><span style={{ color: "white" }}>{BUDGET_RANGES.length}</span></div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "content" && (
        <ContentConfigEditor config={config.contentConfig} onChange={patch => updateContentConfig(patch)} />
      )}

      {activeTab === "purposes" && (
        <BuildPurposesManager
          purposes={config.buildPurposes}
          onUpdate={(id, patch) => updateBuildPurpose(id, patch)}
          onAdd={() => {
            const name = prompt("Enter new build purpose name:");
            if (name) addBuildPurpose({ purpose: name as BuildPurpose, label: name, order: config.buildPurposes.length + 1, isActive: true });
          }}
          onRemove={id => { if (confirm("Remove this build purpose?")) removeBuildPurpose(id); }}
        />
      )}

      {activeTab === "categories" && (
        <SectionCard title="Component Categories" subtitle="Manage all builder component options and tier presets">
          <DefaultPresetsEditor config={config} onUpdatePreset={updateDefaultPreset} />
          <div style={{ display: "grid", gap: 20, marginTop: 24 }}>
            {COMPONENT_CATEGORIES.map(cat => (
              <ComponentCategoryManager
                key={cat}
                categoryId={cat}
                components={config.components[cat] || []}
                onAdd={() => setShowAddComponent(cat)}
                onUpdate={(id, patch) => updateBuilderComponent(cat, id, patch)}
                onRemove={id => { if (confirm("Remove this component?")) removeBuilderComponent(cat, id); }}
                onReorder={(id, newOrder) => reorderBuilderComponents(cat, id, newOrder)}
              />
            ))}
          </div>
          {showAddComponent && (
            <AddComponentDialog categoryId={showAddComponent} onClose={() => setShowAddComponent(null)} onAdd={(comp) => addBuilderComponent(showAddComponent, comp)} />
          )}
        </SectionCard>
      )}

      {activeTab === "compatibility" && (
        <CompatibilityRulesEditor rules={config.compatibilityRules} onUpdate={(id, patch) => {
          patchCustomBuilderConfig({
            compatibilityRules: config.compatibilityRules.map(r => r.id === id ? { ...r, ...patch } : r),
          });
        }} onAdd={() => {
          const name = prompt("Enter compatibility rule name:");
          if (name) patchCustomBuilderConfig({
            compatibilityRules: [...config.compatibilityRules, {
              id: `rule_${Date.now()}`,
              name,
              description: "",
              category: "CPU",
              checksWith: ["Motherboard"],
              ruleType: "socket",
              isActive: true,
            }],
          });
        }} />
      )}

      {activeTab === "pricing" && (
        <PricingRulesEditor pricingRules={config.pricingRules} onChange={patch => updatePricingRules(patch)} />
      )}

      {showPreview && (
        <BuilderPreviewDialog config={config} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}


function DefaultPresetsEditor({ config, onUpdatePreset }: { config: CustomBuilderConfig; onUpdatePreset: (tier: PerformanceTier, components: Record<string, string>) => void }) {
  const [activeTier, setActiveTier] = useState<PerformanceTier>("Mid");
  const currentPreset = config.defaultPresets.find(p => p.tier === activeTier)?.components || {};

  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ fontSize: 11, color: "#777", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 12 }}>Default Presets</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {PERFORMANCE_TIERS.map(tier => (
          <button key={tier} className={activeTier === tier ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => setActiveTier(tier)} style={{ fontSize: 11 }}>
            {tier} Tier
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {COMPONENT_CATEGORIES.map(cat => {
          const options = config.components[cat] || [];
          const activeOptions = options.filter(o => o.isActive);
          return (
            <div key={cat} className="glass" style={{ borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6 }}>{cat}</div>
              <select
                value={currentPreset[cat] || ""}
                onChange={e => onUpdatePreset(activeTier, { ...currentPreset, [cat]: e.target.value })}
                style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}
              >
                <option value="">-- Select Default --</option>
                {activeOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.brand} {o.model} (₹{o.price.toLocaleString("en-IN")})</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminAssembly({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Assembly Queue">
      <DataTable
        rowKey={a => a.id}
        data={store.assemblies}
        columns={[
          { key: "product", label: "Product", render: a => a.productName },
          { key: "components", label: "Components", render: a => a.components.join(", ") },
          { key: "tech", label: "Technician", render: a => store.staff.find(s => s.id === a.technicianId)?.name || "—" },
          { key: "status", label: "Status", render: a => <StatusBadge status={a.status} /> },
        ]}
      />
    </SectionCard>
  );
}

// ─── Remote Support ───────────────────────────────────────────────────────

export function AdminRemoteSupport({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Support Tickets">
      <DataTable
        rowKey={t => t.id}
        data={store.tickets}
        columns={[
          { key: "subject", label: "Subject" },
          { key: "messages", label: "Messages", align: "right", render: t => t.messages.length },
          { key: "agent", label: "Agent", render: t => store.staff.find(s => s.id === t.staffId)?.name || "Unassigned" },
          { key: "status", label: "Status", render: t => <StatusBadge status={t.status} /> },
        ]}
      />
    </SectionCard>
  );
}

// ─── Marketplace ──────────────────────────────────────────────────────────

export function AdminMarketplace({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Second-Hand Marketplace">
      <DataTable
        rowKey={m => m.id}
        data={store.marketplace}
        columns={[
          { key: "seller", label: "Seller", render: m => m.sellerName },
          { key: "product", label: "Product", render: m => m.productName },
          { key: "condition", label: "Condition" },
          { key: "price", label: "Asking", align: "right", render: m => inr(m.askingPrice) },
          { key: "status", label: "Status", render: m => <StatusBadge status={m.status} /> },
          { key: "action", label: "", render: m => <button className="glass-pill glass-pill-sm glass-pill-primary">Inspect</button> },
        ]}
      />
    </SectionCard>
  );
}

// ─── CRM ──────────────────────────────────────────────────────────────────

// ─── Customers ────────────────────────────────────────────────────────────

interface DemoUser { id: string; name: string; email: string; role: string; status: string; createdAt: string; }
function readDemoUsers(): DemoUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("deskto-auth-demo-state");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (parsed.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.createdAt }));
  } catch { return []; }
}

function writeDemoUserStatus(userId: string, status: string) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    parsed.users = (parsed.users || []).map((u: any) => String(u.id) === userId ? { ...u, status } : u);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new Event("deskto-auth-state-changed"));
    return true;
  } catch {
    return false;
  }
}

function customerMetrics(store: DashboardStore, customerId: string) {
  const orders = store.orders.filter(o => o.customerId === customerId);
  const repairs = store.repairs.filter(r => r.customerId === customerId);
  const services = store.serviceRequests.filter(r => r.customerId === customerId);
  const builds = store.pcBuilds.filter(b => b.customerId === customerId);
  const reviews = store.reviews.filter(r => r.customerId === customerId);
  const spent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    + repairs.reduce((sum, repair) => sum + Number(repair.quotation || repair.estimatedCharge || 0), 0)
    + services.reduce((sum, request) => sum + Number(request.quotation || 0), 0)
    + builds.reduce((sum, build) => sum + Number(build.total || 0), 0);
  return { orders, repairs, services, builds, reviews, spent };
}

export function AdminCRM({ store, addCRMNote }: { store: DashboardStore; addCRMNote: (note: { customerId: string; text: string; by: string }) => void }) {
  const users = readDemoUsers();
  const [customerId, setCustomerId] = useState(users.find(u => u.role === "customer")?.id || users[0]?.id || "");
  const [note, setNote] = useState("");
  const selected = users.find(u => u.id === customerId) || users[0];
  const metrics = selected ? customerMetrics(store, selected.id) : null;
  const notes = store.crmNotes.filter(n => !selected || n.customerId === selected.id);

  const saveNote = () => {
    if (!selected || !note.trim()) {
      toast.error("Select a customer and enter a CRM note.");
      return;
    }
    addCRMNote({ customerId: selected.id, text: note.trim(), by: "Admin" });
    setNote("");
    toast.success("CRM note saved");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Customer CRM Profile" subtitle="Orders, services, preferences, notes, and retention context">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <SelectField label="Customer" value={selected?.id || ""} onChange={setCustomerId} options={users.map(u => u.id)} />
            {selected && (
              <div className="glass-card" style={{ padding: 14, display: "grid", gap: 8 }}>
                <strong style={{ color: "white" }}>{selected.name}</strong>
                <span style={{ color: "#aaa", fontSize: 12 }}>{selected.email}</span>
                <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ width: "fit-content", pointerEvents: "none" }}>{selected.status}</span>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 10 }}>
            <KPICard label="Orders" value={metrics?.orders.length || 0} icon={<ShoppingBag size={14} />} color="#FF1F45" />
            <KPICard label="Service Requests" value={(metrics?.repairs.length || 0) + (metrics?.services.length || 0) + (metrics?.builds.length || 0)} icon={<Wrench size={14} />} color="#00b4ff" />
            <KPICard label="Payments" value={inr(metrics?.spent || 0)} icon={<Receipt size={14} />} color="#00cc66" />
            <KPICard label="Reviews" value={metrics?.reviews.length || 0} icon={<MessageSquare size={14} />} color="#ffd700" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Add CRM Note" subtitle="Preference, follow-up, complaint, VIP eligibility, or service history">
        <Area label="Note" value={note} onChange={setNote} placeholder="Customer prefers WhatsApp updates, follow up tomorrow, complaint resolved..." />
        <button className="glass-pill glass-pill-primary" style={{ marginTop: 12 }} onClick={saveNote}><Save size={12} /> Save Note</button>
      </SectionCard>

      <SectionCard title="CRM History" subtitle={`${notes.length} notes for selected customer`}>
        <DataTable
          rowKey={n => n.id}
          data={notes}
          columns={[
            { key: "by", label: "By", render: n => n.by },
            { key: "text", label: "Note", render: n => <span style={{ maxWidth: 720, display: "inline-block" }}>{n.text}</span> },
            { key: "at", label: "Date", render: n => formatDate(n.at) },
          ]}
        />
      </SectionCard>
    </div>
  );
}

export function AdminCustomers({ store, addLog }: { store: DashboardStore; addLog: (event: string, detail: string, actor?: string) => void }) {
  const users = readDemoUsers();
  const [selectedId, setSelectedId] = useState(users[0]?.id || "");
  const [refresh, setRefresh] = useState(0);
  const selected = users.find(u => u.id === selectedId) || users[0];
  const metrics = selected ? customerMetrics(store, selected.id) : null;

  const setStatus = (user: DemoUser, status: string) => {
    if (!writeDemoUserStatus(user.id, status)) {
      toast.error("Could not update account status.");
      return;
    }
    addLog("customer_status_updated", `${user.email} marked ${status}`, "admin");
    setRefresh(t => t + 1);
    toast.success(`Customer ${status}`);
  };

  return (
    <div key={refresh} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Customer Directory" subtitle={`${users.length} registered`}>
        <DataTable
          rowKey={u => u.id}
          data={users}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", render: u => <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ pointerEvents: "none" }}>{u.role}</span> },
            { key: "status", label: "Status", render: u => <span className={`glass-pill glass-pill-sm ${u.status === "active" ? "glass-pill-success" : "glass-pill-red"}`} style={{ pointerEvents: "none" }}>{u.status}</span> },
            { key: "createdAt", label: "Joined", render: u => u.createdAt ? formatDate(new Date(u.createdAt).getTime()) : "—" },
            { key: "action", label: "", render: u => (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); setStatus(u, u.status === "locked" ? "active" : "locked"); }}>{u.status === "locked" ? <Unlock size={10} /> : <Lock size={10} />} {u.status === "locked" ? "Unlock" : "Lock"}</button>
                <button className="glass-pill glass-pill-sm glass-pill-success" onClick={(e) => { e.stopPropagation(); setStatus(u, "active"); }}>Verify</button>
                <button className="glass-pill glass-pill-sm glass-pill-info" onClick={(e) => { e.stopPropagation(); setSelectedId(u.id); }}>History</button>
              </div>
            )},
          ]}
        />
      </SectionCard>

      {selected && metrics && (
        <SectionCard title={`${selected.name} History`} subtitle="Orders, services, payments, reviews, and support context">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
            <KPICard label="Orders" value={metrics.orders.length} icon={<ShoppingBag size={14} />} color="#FF1F45" />
            <KPICard label="Repairs" value={metrics.repairs.length} icon={<Wrench size={14} />} color="#ff6b00" />
            <KPICard label="Services" value={metrics.services.length + metrics.builds.length} icon={<Database size={14} />} color="#00b4ff" />
            <KPICard label="Payments" value={inr(metrics.spent)} icon={<Receipt size={14} />} color="#00cc66" />
            <KPICard label="Reviews" value={metrics.reviews.length} icon={<MessageSquare size={14} />} color="#ffd700" />
          </div>
          <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.7 }}>
            Use this history for refund decisions, warranty checks, repeat-customer offers, and suspicious account review.
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Staff ────────────────────────────────────────────────────────────────

export function AdminStaff({ store, addStaffMember }: { store: DashboardStore; addStaffMember: (staff: Omit<StaffMember, "id" | "joinedAt" | "performance"> & { id?: string }) => StaffMember }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "technician", department: "Repairs", phone: "" });
  const save = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    addStaffMember({ name: draft.name.trim(), email: draft.email.trim(), role: draft.role as StaffMember["role"], department: draft.department.trim() || "Operations" });
    setDraft({ name: "", email: "", role: "technician", department: "Repairs", phone: "" });
    setShowForm(false);
    toast.success("Staff profile created");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Staff Directory" subtitle={`${store.staff.length} members`}
        action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> Add Staff</button>}
      >
        {showForm && (
          <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Field label="Name" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} />
            <Field label="Email" value={draft.email} onChange={v => setDraft({ ...draft, email: v })} />
            <SelectField label="Role" value={draft.role} onChange={v => setDraft({ ...draft, role: v })} options={["technician", "sales", "support", "delivery"]} />
            <Field label="Department" value={draft.department} onChange={v => setDraft({ ...draft, department: v })} />
            <Field label="Phone" value={draft.phone} onChange={v => setDraft({ ...draft, phone: v })} />
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="glass-pill glass-pill-primary" style={{ width: "100%" }} onClick={save}><Save size={11} /> Save</button>
            </div>
          </div>
        )}
        <DataTable
          rowKey={s => s.id}
          data={store.staff}
          columns={[
            { key: "id", label: "ID", render: s => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{s.id.toUpperCase()}</span> },
            { key: "name", label: "Name" },
            { key: "role", label: "Role", render: s => <span style={{ textTransform: "capitalize" }}>{s.role}</span> },
            { key: "department", label: "Department" },
            { key: "rating", label: "Rating", align: "right", render: s => `${s.performance.rating}★` },
            { key: "jobs", label: "Jobs", align: "right", render: s => s.performance.jobs },
            { key: "attendance", label: "Attend.", align: "right", render: s => `${s.performance.attendancePct}%` },
          ]}
        />
      </SectionCard>
      <SectionCard title="Assignment Availability" subtitle="New staff can be assigned across repairs, upgrades, software, rentals, support, sell used, and custom PC work." />
    </div>
  );
}

// ─── Suppliers ────────────────────────────────────────────────────────────

export function AdminSuppliers({ store, addSupplier }: { store: DashboardStore; addSupplier: (supplier: Omit<Supplier, "id"> & { id?: string }) => Supplier }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", email: "", components: "" });
  const save = () => {
    if (!draft.name.trim() || !draft.contact.trim() || !draft.email.trim()) {
      toast.error("Supplier name, contact, and email are required.");
      return;
    }
    addSupplier({ name: draft.name.trim(), contact: draft.contact.trim(), email: draft.email.trim(), components: splitList(draft.components.replace(/,/g, "|")) });
    setDraft({ name: "", contact: "", email: "", components: "" });
    setShowForm(false);
    toast.success("Supplier added");
  };
  return (
    <SectionCard title="Suppliers" subtitle={`${store.suppliers.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> Add Supplier</button>}
    >
      {showForm && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Supplier Name" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} />
          <Field label="Contact Number" value={draft.contact} onChange={v => setDraft({ ...draft, contact: v })} />
          <Field label="Email" value={draft.email} onChange={v => setDraft({ ...draft, email: v })} />
          <Field label="Components" value={draft.components} onChange={v => setDraft({ ...draft, components: v })} placeholder="CPU | GPU | RAM" />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="glass-pill glass-pill-primary" style={{ width: "100%" }} onClick={save}><Save size={11} /> Save</button>
          </div>
        </div>
      )}
      <DataTable
        rowKey={s => s.id}
        data={store.suppliers}
        columns={[
          { key: "name", label: "Name" },
          { key: "contact", label: "Contact" },
          { key: "email", label: "Email" },
          { key: "components", label: "Components", render: s => s.components.join(", ") },
        ]}
      />
    </SectionCard>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────────────

export function AdminPurchaseOrders({ store, addPurchaseOrder, patchPurchaseOrder }: { store: DashboardStore; addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt"> & { id?: string }) => PurchaseOrder; patchPurchaseOrder: (id: string, patch: Partial<PurchaseOrder>) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ supplierId: store.suppliers[0]?.id || "", component: "", qty: "1", cost: "", gst: "18" });
  const save = () => {
    const qty = Number(draft.qty || 0);
    const cost = Number(draft.cost || 0);
    const gst = Number(draft.gst || 0);
    if (!draft.supplierId || !draft.component.trim() || qty <= 0 || cost <= 0) {
      toast.error("Supplier, component, quantity, and unit cost are required.");
      return;
    }
    const total = Math.round(qty * cost * (1 + gst / 100));
    addPurchaseOrder({ supplierId: draft.supplierId, items: [{ component: draft.component.trim(), qty, cost, gst }], total, status: "sent" });
    setDraft({ supplierId: store.suppliers[0]?.id || "", component: "", qty: "1", cost: "", gst: "18" });
    setShowForm(false);
    toast.success("Purchase order sent");
  };
  return (
    <SectionCard title="Purchase Orders" subtitle={`${store.purchaseOrders.length} total`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> Create PO</button>}
    >
      {showForm && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <SelectField label="Supplier" value={draft.supplierId} onChange={v => setDraft({ ...draft, supplierId: v })} options={store.suppliers.map(s => s.id)} />
          <Field label="Component" value={draft.component} onChange={v => setDraft({ ...draft, component: v })} />
          <Field label="Quantity" value={draft.qty} onChange={v => setDraft({ ...draft, qty: v })} type="number" />
          <Field label="Unit Cost" value={draft.cost} onChange={v => setDraft({ ...draft, cost: v })} type="number" />
          <Field label="GST %" value={draft.gst} onChange={v => setDraft({ ...draft, gst: v })} type="number" />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="glass-pill glass-pill-primary" style={{ width: "100%" }} onClick={save}><Send size={11} /> Send PO</button>
          </div>
        </div>
      )}
      <DataTable
        rowKey={p => p.id}
        data={store.purchaseOrders}
        columns={[
          { key: "id", label: "PO ID", render: p => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{p.id}</span> },
          { key: "supplier", label: "Supplier", render: p => store.suppliers.find(s => s.id === p.supplierId)?.name || "—" },
          { key: "items", label: "Items", render: p => `${p.items.length} item${p.items.length > 1 ? "s" : ""}` },
          { key: "total", label: "Total", align: "right", render: p => inr(p.total) },
          { key: "status", label: "Status", render: p => <StatusBadge status={p.status} /> },
          { key: "action", label: "", render: p => (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="glass-pill glass-pill-sm glass-pill-info" onClick={(e) => { e.stopPropagation(); patchPurchaseOrder(p.id, { status: "sent" }); }}>Sent</button>
              <button className="glass-pill glass-pill-sm glass-pill-success" onClick={(e) => { e.stopPropagation(); patchPurchaseOrder(p.id, { status: "received" }); }}>Receive</button>
            </div>
          ) },
        ]}
      />
    </SectionCard>
  );
}

// ─── Coupons ──────────────────────────────────────────────────────────────

export function AdminCoupons({ store, addCoupon, patchCoupon }: { store: DashboardStore; addCoupon: (coupon: Omit<Coupon, "id" | "redeemed"> & { id?: string; redeemed?: boolean }) => Coupon; patchCoupon: (id: string, patch: Partial<Coupon>) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ code: "", description: "", discountPercent: "", discountAmount: "", minSpend: "", expiresAt: "", usageLimit: "" });
  const save = () => {
    if (!draft.code.trim() || !draft.description.trim() || (!Number(draft.discountPercent) && !Number(draft.discountAmount))) {
      toast.error("Code, description, and discount are required.");
      return;
    }
    addCoupon({
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim(),
      discountPercent: Number(draft.discountPercent || 0),
      discountAmount: Number(draft.discountAmount || 0),
      minSpend: Number(draft.minSpend || 0),
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).getTime() : Date.now() + 30 * 86400000,
      usageLimit: Number(draft.usageLimit || 0) || undefined,
      redeemed: false,
      active: true,
    });
    setDraft({ code: "", description: "", discountPercent: "", discountAmount: "", minSpend: "", expiresAt: "", usageLimit: "" });
    setShowForm(false);
    toast.success("Coupon created");
  };
  return (
    <SectionCard title="Coupons" subtitle={`${store.coupons.length} configured`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> New Coupon</button>}
    >
      {showForm && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Field label="Code" value={draft.code} onChange={v => setDraft({ ...draft, code: v })} />
          <Field label="Description" value={draft.description} onChange={v => setDraft({ ...draft, description: v })} />
          <Field label="Discount %" value={draft.discountPercent} onChange={v => setDraft({ ...draft, discountPercent: v })} type="number" />
          <Field label="Flat Discount" value={draft.discountAmount} onChange={v => setDraft({ ...draft, discountAmount: v })} type="number" />
          <Field label="Min Spend" value={draft.minSpend} onChange={v => setDraft({ ...draft, minSpend: v })} type="number" />
          <Field label="Expiry" value={draft.expiresAt} onChange={v => setDraft({ ...draft, expiresAt: v })} type="date" />
          <Field label="Usage Limit" value={draft.usageLimit} onChange={v => setDraft({ ...draft, usageLimit: v })} type="number" />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="glass-pill glass-pill-primary" style={{ width: "100%" }} onClick={save}><Save size={11} /> Save Coupon</button>
          </div>
        </div>
      )}
      <DataTable
        rowKey={c => c.id}
        data={store.coupons}
        columns={[
          { key: "code", label: "Code", render: c => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", letterSpacing: 1 }}>{c.code}</span> },
          { key: "description", label: "Description" },
          { key: "discount", label: "Discount", align: "right", render: c => c.discountPercent ? `${c.discountPercent}%` : c.discountAmount ? inr(c.discountAmount) : "—"},
          { key: "minSpend", label: "Min Spend", align: "right", render: c => inr(c.minSpend) },
          { key: "usage", label: "Usage", render: c => `${c.usedCount || 0}/${c.usageLimit || "∞"}` },
          { key: "expires", label: "Expires", render: c => formatDate(c.expiresAt) },
          { key: "status", label: "Status", render: c => <span className={`glass-pill glass-pill-sm ${c.active === false ? "glass-pill-red" : "glass-pill-success"}`} style={{ pointerEvents: "none" }}>{c.active === false ? "Disabled" : "Active"}</span> },
          { key: "action", label: "", render: c => <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={(e) => { e.stopPropagation(); patchCoupon(c.id, { active: c.active === false }); }}>{c.active === false ? "Enable" : "Disable"}</button> },
        ]}
      />
    </SectionCard>
  );
}

// ─── Offers ───────────────────────────────────────────────────────────────

export function AdminOffers({ store, addOffer, patchOffer }: { store: DashboardStore; addOffer: (offer: Omit<DashboardStore["offers"][number], "id" | "createdAt" | "updatedAt"> & { id?: string }) => DashboardStore["offers"][number]; patchOffer: (id: string, patch: Partial<DashboardStore["offers"][number]>) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: "", detail: "", code: "", discount: "", linkedTo: "", startsAt: "", expiresAt: "" });
  const save = () => {
    if (!draft.title.trim() || !draft.detail.trim() || !draft.code.trim()) {
      toast.error("Offer title, details, and code are required.");
      return;
    }
    addOffer({
      title: draft.title.trim(),
      detail: draft.detail.trim(),
      code: draft.code.trim().toUpperCase(),
      discount: draft.discount.trim(),
      linkedTo: draft.linkedTo.trim(),
      startsAt: draft.startsAt ? new Date(draft.startsAt).getTime() : Date.now(),
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).getTime() : Date.now() + 30 * 86400000,
      active: true,
    });
    setDraft({ title: "", detail: "", code: "", discount: "", linkedTo: "", startsAt: "", expiresAt: "" });
    setShowForm(false);
    toast.success("Offer created");
  };
  return (
    <SectionCard title="Promotional Offers" subtitle={`${store.offers.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => setShowForm(v => !v)}><Plus size={12} /> New Offer</button>}
    >
      {showForm && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Offer Title" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} />
          <Field label="Offer Code" value={draft.code} onChange={v => setDraft({ ...draft, code: v })} />
          <Field label="Discount" value={draft.discount} onChange={v => setDraft({ ...draft, discount: v })} placeholder="25% OFF / Free 1st Day" />
          <Field label="Linked Product/Service" value={draft.linkedTo} onChange={v => setDraft({ ...draft, linkedTo: v })} />
          <Field label="Start Date" value={draft.startsAt} onChange={v => setDraft({ ...draft, startsAt: v })} type="date" />
          <Field label="End Date" value={draft.expiresAt} onChange={v => setDraft({ ...draft, expiresAt: v })} type="date" />
          <Area label="Offer Details" value={draft.detail} onChange={v => setDraft({ ...draft, detail: v })} />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="glass-pill glass-pill-primary" style={{ width: "100%" }} onClick={save}><Save size={11} /> Activate</button>
          </div>
        </div>
      )}
      <div className="dash-tab-grid">
        {store.offers.map(o => (
          <div key={o.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{o.title}</div>
              <span className={`glass-pill glass-pill-sm ${o.active === false ? "glass-pill-red" : "glass-pill-success"}`} style={{ pointerEvents: "none" }}>{o.active === false ? "Inactive" : "Active"}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#aaa", marginTop: 4 }}>{o.detail}</div>
            {o.discount && <div style={{ color: "#00cc66", fontWeight: 700, marginTop: 8 }}>{o.discount}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", letterSpacing: 1 }}>{o.code}</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>Expires {formatDate(o.expiresAt)}</span>
            </div>
            <button className="glass-pill glass-pill-sm glass-pill-outline" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); patchOffer(o.id, { active: o.active === false }); }}>{o.active === false ? "Activate" : "Disable"}</button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────

export function AdminReports({ store }: { store: DashboardStore }) {
  // Monthly revenue (mocked from order dates)
  const monthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    monthBuckets[d.toLocaleDateString("en-IN", { month: "short" })] = 0;
  }
  store.orders.forEach(o => {
    const m = new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short" });
    if (m in monthBuckets) monthBuckets[m] += o.total;
  });
  const monthly = Object.entries(monthBuckets).map(([month, revenue]) => ({ month, revenue }));

  // Top products by sales count
  const topProducts = [...store.products].sort((a, b) => b.id - a.id).slice(0, 6).map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    revenue: store.orders.flatMap(o => o.items).filter(i => i.productId === p.id).reduce((s, i) => s + i.qty * i.price, 0) || Math.floor(Math.random() * 50000 + 10000),
  }));

  // Tech performance
  const techPerf = store.staff.filter(s => s.role === "technician").map(s => ({ name: s.name.split(" ")[0], jobs: s.performance.jobs, rating: s.performance.rating }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <SectionCard title="Monthly Revenue" subtitle="Last 6 months">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <XAxis dataKey="month" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#FF1F45" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Technician Performance">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={techPerf}>
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="jobs" fill="#00b4ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Products by Revenue">
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={topProducts} layout="vertical">
              <XAxis type="number" stroke="#666" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="#666" fontSize={10} width={100} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="revenue" fill="#00cc66" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────

export function AdminNotifications({ store, addNotification, markNotificationRead, archiveNotification }: { store: DashboardStore; addNotification: any; markNotificationRead: (id: string) => void; archiveNotification: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [audience, setAudience] = useState<"all" | "customers" | "staff" | "admins">("all");
  const items = store.notifications.slice(0, 30);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Compose Notification">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none" }} />
          <input type="text" value={detail} onChange={e => setDetail(e.target.value)} placeholder="Detail" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none" }} />
          <select value={audience} onChange={e => setAudience(e.target.value as any)} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 12 }}>
            <option value="all">All users</option>
            <option value="customers">Customers only</option>
            <option value="staff">Staff only</option>
            <option value="admins">Admins only</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="glass-pill glass-pill-primary" onClick={() => { if (!title || !detail) { toast.error("Title and detail required"); return; } addNotification({ title, detail, type: "system", audience }); setTitle(""); setDetail(""); toast.success("Notification sent"); }}><Send size={12} /> Broadcast</button>
        </div>
      </SectionCard>

      <SectionCard title="Recent Notifications" subtitle={`${items.length} shown`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(n => (
            <div key={n.id} className="glass-card" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white" }}>{n.title}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#aaa", marginTop: 4 }}>{n.detail}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666", marginTop: 4 }}>{formatDate(n.createdAt)} · audience: {n.audience || "customer"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ pointerEvents: "none" }}>{n.type}</span>
                  {!n.read && <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => markNotificationRead(n.id)}>Mark Read</button>}
                  {!n.archived && <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => archiveNotification(n.id)}><Archive size={10} /> Archive</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────

export function AdminSettings({ store, updateSettings }: { store: DashboardStore; updateSettings: any }) {
  const [form, setForm] = useState<DashboardSettings>(store.settings);
  const [zone, setZone] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);

  const Field = ({ label, k, type = "text" }: { label: string; k: keyof DashboardSettings; type?: string }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</span>
      <input type={type} value={form[k] as any} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: "none" }} />
    </label>
  );

  const removeZone = (z: string) => {
    setForm({ ...form, shippingZones: form.shippingZones.filter(zone => zone !== z) });
  };

  const resetAllSettings = () => {
    updateSettings({
      gstPercent: 18,
      paymentGateway: "Razorpay",
      emailProvider: "SendGrid",
      whatsappProvider: "Twilio",
      smsProvider: "TextLocal",
      businessHours: "9AM-7PM",
      shippingZones: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai"],
      gstSlabs: {
        Essential: 0,
        Standard: 18,
        Luxury: 28,
      }
    });
    setResetConfirm(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Tax & Payment"
        action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => { updateSettings({ ...form, gstPercent: Number(form.gstPercent || 0) }); toast.success("Settings saved"); }}><Save size={11} /> Save</button>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Field label="GST %" k="gstPercent" type="number" />
          <Field label="Payment Gateway" k="paymentGateway" />
          <Field label="Email Provider" k="emailProvider" />
          <Field label="WhatsApp Provider" k="whatsappProvider" />
          <Field label="SMS Provider" k="smsProvider" />
          <Field label="Business Hours" k="businessHours" />
        </div>
      </SectionCard>

      <SectionCard title="Shipping Zones">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {form.shippingZones.map(z => (
            <div key={z} className="glass-pill glass-pill-outline glass-pill-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>{z}</span>
              <button
                className="glass-pill-sm"
                style={{ padding: "2px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "#666" }}
                onClick={() => removeZone(z)}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, maxWidth: 520 }}>
          <input
            value={zone}
            onChange={e => setZone(e.target.value)}
            placeholder="Add shipping zone"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: "none" }}
          />
          <button
            className="glass-pill glass-pill-sm glass-pill-primary"
            onClick={() => {
              const next = zone.trim();
              if (!next) return;
              setForm({ ...form, shippingZones: Array.from(new Set([...form.shippingZones, next])) });
              setZone("");
            }}
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {resetConfirm ? (
          <div style={{ marginTop: 14, padding: 12, background: "rgba(255,31,69,0.1)", border: "1px solid rgba(255,31,69,0.3)", borderRadius: 8 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white", marginBottom: 12 }}>Reset all settings to default values?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="glass-pill glass-pill-red" onClick={resetAllSettings}>
                <RefreshCcw size={11} /> Yes, Reset
              </button>
              <button className="glass-pill glass-pill-outline" onClick={() => setResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className="glass-pill glass-pill-sm glass-pill-outline"
            onClick={() => setResetConfirm(true)}
            style={{ marginTop: 14, fontSize: 12 }}
          >
            <RefreshCcw size={11} /> Reset All Settings
          </button>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────

export function AdminAuditLogs({ store }: { store: DashboardStore }) {
  const [filter, setFilter] = useState("");
  const events = Array.from(new Set(store.auditLogs.map(l => l.event)));
  const filtered = filter ? store.auditLogs.filter(l => l.event === filter) : store.auditLogs;

  const exportCsv = () => {
    const rows = ["id,event,detail,actor,at", ...filtered.map(l => `${l.id},${l.event},"${l.detail}",${l.actor || ""},${new Date(l.at).toISOString()}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deskto-audit-logs-${Date.now().toString().slice(-8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  return (
    <SectionCard title="Audit Logs" subtitle={`${filtered.length} events`}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "6px 12px", color: "white", fontSize: 11 }}>
            <option value="">All events</option>
            {events.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button className="glass-pill glass-pill-primary glass-pill-sm" onClick={exportCsv}><Download size={11} /> Export CSV</button>
        </div>
      }
    >
      <DataTable
        rowKey={l => l.id}
        data={filtered}
        columns={[
          { key: "event", label: "Event", render: l => <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ pointerEvents: "none" }}>{l.event}</span> },
          { key: "detail", label: "Detail" },
          { key: "actor", label: "Actor", render: l => l.actor || "system" },
          { key: "at", label: "Timestamp", render: l => `${formatDate(l.at)} ${formatTime(l.at)}` },
        ]}
      />
    </SectionCard>
  );
}

// ─── Backup & Restore ─────────────────────────────────────────────────────

export function AdminBackup({ store, resetStore }: { store: DashboardStore; resetStore: any }) {
  const exportAll = () => {
    // Wrap the store with a version marker so importFile can validate the file
    // is actually a DESKTO backup (previously this exported the raw store, which
    // importFile then always rejected as "Invalid backup file format").
    const payload = { version: 1, exportedAt: Date.now(), store };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deskto-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Accept both the wrapped { version, store } format written by
        // exportAll and a raw store object (orders/products present) for
        // backups created before this fix.
        const restoredStore = data && typeof data === "object" && data.store ? data.store : data;
        if (!restoredStore || typeof restoredStore !== "object" || !Array.isArray(restoredStore.orders)) {
          throw new Error("Invalid backup file format");
        }
        window.localStorage.setItem("deskto-dashboard-v1", JSON.stringify(restoredStore));
        toast.success("Backup restored — reload to see changes");
      } catch (error: any) {
        console.error("Restore error:", error);
        toast.error(error?.message || "Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Backup">
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}>Download a complete snapshot of all dashboard data (orders, repairs, products, settings).</p>
        <button className="glass-pill glass-pill-primary" onClick={exportAll}><Download size={12} /> Export All Data</button>
      </SectionCard>

      <SectionCard title="Restore">
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}>Upload a previously exported backup file to restore data.</p>
        <input type="file" accept="application/json" onChange={importFile} style={{ display: "none" }} id="restore-file" />
        <button className="glass-pill glass-pill-outline" onClick={() => document.getElementById("restore-file")?.click()}><RefreshCcw size={12} /> Choose Backup File</button>
      </SectionCard>

      <SectionCard title="Reset Demo Data">
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}>Reseed the demo dataset from scratch. This will overwrite any changes.</p>
        <button className="glass-pill glass-pill-red" onClick={() => { if (confirm("Reset all demo data?")) { resetStore(); toast.success("Demo data reset"); } }}><RefreshCcw size={12} /> Reset Demo</button>
      </SectionCard>
    </div>
  );
}
