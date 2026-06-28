import { useEffect, useState } from "react";
import {
  ShoppingBag, Wrench, Truck, TrendingUp, Bell, Package, Database, Tag, Award,
  Users, UserCog, Truck as TruckIcon, Receipt, Ticket, Settings, History,
  RefreshCcw, BarChart3, Plus, Search, Filter, AlertCircle, Save, Send,
  Download, Eye, Lock, Unlock, Zap, X, Gamepad2, MessageSquare, Archive,
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

export function AdminOverview({ data }: { data: ReturnType<typeof import("./lib/dashboardData").useDashboardData> }) {
  const { store } = data;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaysOrders = store.orders.filter(o => o.createdAt >= todayStart.getTime());
  const totalRevenue = store.orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const lowStock = store.products.filter(p => p.stock < 5).length;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="dash-kpi-grid">
        <KPICard label="Today's Sales" value={inr(todaysOrders.reduce((s, o) => s + o.total, 0))} icon={<TrendingUp size={14} />} color="#00cc66" delta={{ value: 8, positive: true }} />
        <KPICard label="Orders Today" value={todaysOrders.length} icon={<ShoppingBag size={14} />} color="#FF1F45" hint={`${store.orders.length} total`} />
        <KPICard label="Revenue (Delivered)" value={inr(totalRevenue)} icon={<TrendingUp size={14} />} color="#00b4ff" delta={{ value: 14, positive: true }} />
        <KPICard label="Open Repairs" value={store.repairs.filter(r => !["ready", "delivered"].includes(r.status)).length} icon={<Wrench size={14} />} color="#ff6b00" />
        <KPICard label="Active Rentals" value={store.rentals.filter(r => r.status === "active").length} icon={<Truck size={14} />} color="#a855f7" />
        <KPICard label="Open Tickets" value={store.tickets.filter(t => !["resolved", "closed"].includes(t.status)).length} icon={<Bell size={14} />} color="#ffd700" />
        <KPICard label="Low-Stock Items" value={lowStock} icon={<AlertCircle size={14} />} color="#FF1F45" hint="Restock soon" />
        <KPICard label="Audit Events" value={store.auditLogs.length} icon={<History size={14} />} color="#888" hint="Last 200 logged" />
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
        <Area label="Key Specs (pipe | separated)" value={csvList(draft.specs)} onChange={v => set({ specs: splitList(v) })} />
        <Area label="Features (pipe | separated)" value={csvList(draft.features)} onChange={v => set({ features: splitList(v) })} />
        <Area label="Box Contents (pipe | separated)" value={csvList(draft.boxContents)} onChange={v => set({ boxContents: splitList(v) })} />
        <Area label="Compatibility (pipe | separated)" value={csvList(draft.compatibility)} onChange={v => set({ compatibility: splitList(v) })} />
        <Area label="Upgrade Options (pipe | separated)" value={csvList(draft.upgradeOptions)} onChange={v => set({ upgradeOptions: splitList(v) })} />
        <Area label="Recommended Accessories (pipe | separated)" value={csvList(draft.recommendedAccessories)} onChange={v => set({ recommendedAccessories: splitList(v) })} />
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
        <Area label="Keywords / Tags (pipe | separated)" value={csvList([...(draft.seo?.keywords || []), ...(draft.seo?.tags || [])])} onChange={v => setSeo({ keywords: splitList(v), tags: splitList(v) })} />
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
          { key: "actions", label: "", render: p => <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setEditing(p)}>Edit</button><button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => patchCatalogProduct(p.id, { catalogStatus: p.catalogStatus === "archived" ? "published" : "archived", inStock: false })}>{p.catalogStatus === "archived" ? "Restore" : "Archive"}</button><button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => deleteCatalogProduct(p.id)}>Delete</button></div> },
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
    metaTitle: "",
    metaDescription: "",
    keywords: [],
  };
}

function validateGamingHubItem(item: Partial<GamingHubItem>, publish: boolean) {
  if (!item.title?.trim()) return "Title is required.";
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
  const uploadSingle = async (file: File | undefined, key: "coverImage" | "thumbnailImage") => {
    if (!file) return;
    try {
      const img = await readGamingImage(file);
      setDraft(prev => ({ ...prev, [key]: img, ...(key === "coverImage" && !prev.thumbnailImage ? { thumbnailImage: img } : {}) }));
      toast.success(`${key === "coverImage" ? "Cover" : "Thumbnail"} image added`);
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
        <Field label="Title" value={draft.title} onChange={v => set({ title: v, slug: draft.slug || gamingSlug(v), metaTitle: draft.metaTitle || v })} />
        <Field label="Slug" value={draft.slug} onChange={v => set({ slug: gamingSlug(v) })} />
        <Field label="Category" value={draft.category} onChange={v => set({ category: v })} />
        <Field label="Author" value={draft.author} onChange={v => set({ author: v })} />
        <Field label="Publish Date" type="date" value={new Date(draft.publishDate || Date.now()).toISOString().slice(0, 10)} onChange={v => set({ publishDate: new Date(v).getTime() || Date.now() })} />
      </div>
      <Area label="Short Description" value={draft.shortDescription} onChange={v => set({ shortDescription: v, metaDescription: draft.metaDescription || v })} />
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
        <Area label="Intro" value={draft.intro} onChange={v => set({ intro: v })} />
        <Area label="Main Article Body" value={draft.body} onChange={v => set({ body: v })} />
        <Area label="Specs" value={draft.specs} onChange={v => set({ specs: v })} />
        <Area label="Benchmark Data" value={draft.benchmarkData} onChange={v => set({ benchmarkData: v })} />
        <Area label="Tips (pipe | separated)" value={csvList(draft.tips)} onChange={v => set({ tips: splitList(v) })} />
        <Area label="Pros (pipe | separated)" value={csvList(draft.pros)} onChange={v => set({ pros: splitList(v) })} />
        <Area label="Cons (pipe | separated)" value={csvList(draft.cons)} onChange={v => set({ cons: splitList(v) })} />
        <Area label="Tags (pipe | separated)" value={csvList(draft.tags)} onChange={v => set({ tags: splitList(v) })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <Field label="Offer Details" value={draft.offerDetails} onChange={v => set({ offerDetails: v })} />
        <Field label="Discount" value={draft.discount} onChange={v => set({ discount: v })} />
        <Field label="CTA Text" value={draft.ctaText} onChange={v => set({ ctaText: v })} />
        <Field label="CTA Link" value={draft.ctaHref} onChange={v => set({ ctaHref: v })} />
        <Field label="Related Services" value={csvList(draft.relatedServiceSlugs)} onChange={v => set({ relatedServiceSlugs: splitList(v) })} />
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
        <Field label="Meta Title" value={draft.metaTitle} onChange={v => set({ metaTitle: v })} />
        <Field label="Meta Description" value={draft.metaDescription} onChange={v => set({ metaDescription: v })} />
        <Area label="Keywords (pipe | separated)" value={csvList(draft.keywords)} onChange={v => set({ keywords: splitList(v) })} />
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
  const items = store.gamingHub || [];
  const filtered = items.filter(item => `${item.title} ${item.category} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
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
    patchGamingHubItem(item.id, { comments: item.comments.map(comment => comment.id === commentId ? { ...comment, status } : comment) });
    toast.success(`Comment ${status}`);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <KPICard label="Total Posts" value={items.length} icon={Gamepad2} color="#FF1F45" />
        <KPICard label="Published" value={items.filter(i => i.status === "published").length} icon={Eye} color="#00cc66" />
        <KPICard label="Drafts" value={items.filter(i => i.status === "draft").length} icon={Archive} color="#ffd700" />
        <KPICard label="Total Views" value={totalViews} icon={BarChart3} color="#00b4ff" />
        <KPICard label="Pending Comments" value={pendingComments} icon={MessageSquare} color="#a855f7" />
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
            { key: "actions", label: "", render: item => <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><a href={`/services/gaming-hub/${item.slug}`} className="glass-pill glass-pill-sm glass-pill-outline" style={{ textDecoration: "none" }}>Preview</a><button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setEditing(item)}>Edit</button><button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => patchGamingHubItem(item.id, { status: item.status === "archived" ? "published" : "archived" })}>{item.status === "archived" ? "Restore" : "Archive"}</button><button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => deleteGamingHubItem(item.id)}>Delete</button></div> },
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

// ─── Categories ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Gaming PC", icon: "🎮", count: 6, color: "#FF1F45" },
  { name: "Desktop PC", icon: "🖥️", count: 4, color: "#00b4ff" },
  { name: "Gaming Laptop", icon: "💻", count: 3, color: "#a855f7" },
  { name: "Laptop", icon: "💼", count: 5, color: "#00cc66" },
  { name: "Monitor", icon: "🖥️", count: 4, color: "#ffd700" },
  { name: "Components", icon: "🔧", count: 9, color: "#ff6b00" },
];

export function AdminCategories() {
  return (
    <SectionCard title="Categories" subtitle={`${CATEGORIES.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> New Category</button>}
    >
      <div className="dash-tab-grid">
        {CATEGORIES.map(c => (
          <div key={c.name} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}15`, border: `1px solid ${c.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{c.name}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", marginTop: 4 }}>{c.count} products</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline">Edit</button>
              <button className="glass-pill glass-pill-sm glass-pill-red">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Brands ───────────────────────────────────────────────────────────────

const BRANDS = ["DESKTO", "ASUS", "Dell", "MSI", "Lenovo", "Intel", "NVIDIA", "AMD", "Samsung", "Corsair", "Logitech", "Razer", "HyperX", "LG", "TP-Link"];

export function AdminBrands() {
  return (
    <SectionCard title="Brands" subtitle={`${BRANDS.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> New Brand</button>}
    >
      <div className="dash-tab-grid">
        {BRANDS.map(b => (
          <div key={b} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "linear-gradient(135deg, #FF1F45, #5a0008)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", fontWeight: 800 }}>{b[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{b}</div>
            </div>
            <button className="glass-pill glass-pill-icon glass-pill-sm" style={{ width: 28, height: 28 }}><Settings size={12} /></button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────

export function AdminInventory({ store }: { store: DashboardStore }) {
  const lowStock = store.products.filter(p => p.stock < 5);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {lowStock.length > 0 && (
        <div className="glass-card" style={{ padding: 16, borderColor: "rgba(255,31,69,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={20} color="#FF1F45" />
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{lowStock.length} Low-Stock Alerts</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", marginTop: 2 }}>Restock soon to avoid lost sales</div>
            </div>
            <button className="glass-pill glass-pill-primary glass-pill-sm" style={{ marginLeft: "auto" }} onClick={() => toast.success("Purchase order created")}>Create PO</button>
          </div>
        </div>
      )}
      <SectionCard title="Stock Levels">
        <DataTable
          rowKey={p => p.id.toString()}
          data={store.products}
          columns={[
            { key: "id", label: "ID", width: "60px" },
            { key: "name", label: "Product" },
            { key: "category", label: "Category" },
            { key: "stock", label: "Stock", align: "right", render: p => <span style={{ color: p.stock < 5 ? "#FF1F45" : p.stock < 10 ? "#ff6b00" : "#00cc66", fontWeight: 700 }}>{p.stock}</span> },
            { key: "actions", label: "", render: p => <button className="glass-pill glass-pill-sm glass-pill-outline">Restock</button> },
          ]}
        />
      </SectionCard>
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────

export function AdminOrders({ store, updateOrderStatus }: { store: DashboardStore; updateOrderStatus: any }) {
  const STATUS_OPTIONS: Order["status"][] = ["placed", "verified", "packing", "shipped", "delivered", "cancelled"];
  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const [open, setOpen] = useState<Order | null>(null);
  const orders = [...store.orders].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const active = open ? store.orders.find(o => o.id === open.id) || open : null;
  const customerName = (order: Order) => order.customerName || readDemoUsers().find(u => u.id === order.customerId)?.name || "Customer";
  const customerContact = (order: Order) => order.customerPhone || order.customerEmail || readDemoUsers().find(u => u.id === order.customerId)?.email || order.customerId;
  const setStatus = (order: Order, status: Order["status"]) => {
    updateOrderStatus(order.id, status);
    toast.success(`Order ${order.id.slice(-8).toUpperCase()} synced to ${status}`);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["all", ...STATUS_OPTIONS] as const).map(status => (
          <button key={status} className={`glass-pill ${filter === status ? "glass-pill-primary" : "glass-pill-outline"} glass-pill-sm`} onClick={() => setFilter(status)}>
            {status === "all" ? "All" : status.toUpperCase()}
          </button>
        ))}
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
            { key: "fulfillment", label: "Delivery", render: o => <div><strong style={{ color: "white" }}>{o.deliveryMethod === "pickup" ? "Store Pickup" : "Home Delivery"}</strong><br /><span style={{ color: "#777", fontSize: 11 }}>{o.paymentMethod?.toUpperCase() || "Payment"}{o.invoiceId ? ` · ${o.invoiceId}` : ""}</span></div> },
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

// ─── Repairs ──────────────────────────────────────────────────────────────

export function AdminRepairs({ store, updateRepairStatus, patchRepair }: { store: DashboardStore; updateRepairStatus: any; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  useAuthStaffRefresh();
  const technicianOptions = getAllStaffOptions(store);
  const technicianName = (id?: string) => technicianOptions.find(s => s.id === id)?.name || store.staff.find(s => s.id === id)?.name || "Unassigned";
  return (
    <SectionCard title="Repair Management" subtitle="Validate requests, approve work, assign technicians, and schedule service">
      <DataTable
        rowKey={r => r.id}
        data={store.repairs}
        columns={[
          { key: "id", label: "Ticket", render: r => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>#{r.id.slice(-8).toUpperCase()}</span> },
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
          { key: "issue", label: "Issue", render: r => <span style={{ maxWidth: 220, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.issue}</span> },
          { key: "service", label: "Service", render: r => <span>{r.serviceType || "-"}<br /><small style={{ color: "#777" }}>{r.preferredSlot || "Schedule pending"}</small></span> },
          { key: "media", label: "Media", render: r => <MediaCell files={r.uploadedFiles} /> },
          { key: "technician", label: "Technician / Progress", render: r => (
            <RepairTechnicianCell repair={r} technicianOptions={technicianOptions} technicianName={technicianName} patchRepair={patchRepair} />
          ) },
          { key: "quote", label: "Quote Details", render: r => <RepairQuoteEditor repair={r} patchRepair={patchRepair} /> },
          { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
          { key: "action", label: "", render: r => (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 170 }}>
              <select value={r.status} onChange={e => {
                patchRepair(r.id, { status: e.target.value as Repair["status"] });
                toast.success("Status synced to customer dashboard");
              }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
                {REPAIR_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button className="glass-pill glass-pill-sm glass-pill-success" onClick={() => { patchRepair(r.id, { adminVerified: true, status: "admin-approved" }); toast.success("Request approved"); }}>Approve</button>
                <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => { patchRepair(r.id, { status: "rejected" }); toast.error("Request rejected"); }}>Reject</button>
              </div>
              <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => { updateRepairStatus(r.id, r.technicianId ? "device-received" : "received"); toast.success("Customer notification sent"); }}>Schedule / Notify</button>
            </div>
          ) },
        ]}
      />
    </SectionCard>
  );
}

function RepairTechnicianCell({ repair, technicianOptions, technicianName, patchRepair }: { repair: Repair; technicianOptions: StaffOption[]; technicianName: (id?: string) => string; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const done = repair.timeline.filter(step => step.done).length;
  const total = repair.timeline.length || 1;
  const percent = Math.round((done / total) * 100);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 210 }} onClick={e => e.stopPropagation()}>
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
        <strong style={{ color: "white" }}>{technicianName(repair.technicianId)}</strong><br />
        <span style={{ color: "#777" }}>Staff status: </span><StatusBadge status={repair.status} />
        <div style={{ marginTop: 7, height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#00cc66,#00b4ff)" }} />
        </div>
        <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · Updated {formatTime(repair.technicianLastStatusAt || repair.updatedAt || repair.createdAt)}</div>
      </div>
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

function ServiceTechnicianCell({ request, technicianOptions, technicianName, patchServiceRequest }: { request: ServiceRequest; technicianOptions: StaffOption[]; technicianName: (id?: string) => string; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const done = request.timeline.filter(step => step.done).length;
  const total = request.timeline.length || 1;
  const percent = Math.round((done / total) * 100);
  const assignmentStatus: ServiceRequest["status"] = request.kind === "upgrade" ? "technician-assigned" : "technician-assigned";
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 220 }} onClick={e => e.stopPropagation()}>
      <select value={request.technicianId || ""} onChange={e => {
        const staffId = e.target.value;
        patchServiceRequest(request.id, {
          technicianId: staffId || undefined,
          status: staffId ? assignmentStatus : request.status,
          technicianNotes: staffId ? `Assigned to ${technicianName(staffId)}` : "Technician assignment cleared",
        });
        toast.success(staffId ? `${technicianName(staffId)} notified in staff dashboard` : "Assignment cleared");
      }} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "white", fontSize: 11 }}>
        <option value="">Assign technician...</option>
        {technicianOptions.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` · ${s.department}` : ""}</option>)}
      </select>
      <div className="glass" style={{ borderRadius: 8, padding: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#CFCFCF" }}>
        <strong style={{ color: "white" }}>{technicianName(request.technicianId)}</strong><br />
        <span style={{ color: "#777" }}>Staff status: </span><StatusBadge status={request.status} />
        <div style={{ marginTop: 7, height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#ffd700,#00b4ff)" }} />
        </div>
        <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · Updated {formatTime(request.technicianLastStatusAt || request.updatedAt || request.createdAt)}</div>
      </div>
    </div>
  );
}

function AdminServiceManagement({ store, kind, patchServiceRequest }: { store: DashboardStore; kind: ServiceRequestKind; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  useAuthStaffRefresh();
  const rows = (store.serviceRequests || []).filter(r => r.kind === kind);
  const technicianOptions = getAllStaffOptions(store);
  const technicianName = (id?: string) => technicianOptions.find(s => s.id === id)?.name || store.staff.find(s => s.id === id)?.name || "Unassigned";
  const title = kind === "upgrade" ? "Upgrade Management" : kind === "software" ? "Software & Data Management" : kind === "rental" ? "Rental Management" : kind === "sell" ? "Second-Hand Sell Requests" : "Support Dashboard";
  const subtitle = kind === "upgrade"
    ? "Review upgrade requests, verify compatibility, assign technicians, quote, reserve parts, and track QA"
    : kind === "software"
      ? "Review software/data requests, assign engineers, quote, track backup, recovery, installation, QA, and reports"
      : kind === "rental"
        ? "Verify documents, approve rentals, assign products, generate agreements, track deposits, delivery, returns, refunds"
        : kind === "sell"
          ? "Review product photos, assign inspection, generate price offers, approve payment, certify inventory, publish for resale"
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
          { key: "technician", label: "Technician / Progress", render: r => (
            <ServiceTechnicianCell request={r} technicianOptions={technicianOptions} technicianName={technicianName} patchServiceRequest={patchServiceRequest} />
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
            diagnosisReport: request.diagnosisReport || (kind === "sell" ? "Product inspection reviewed and price offer prepared." : kind === "rental" ? "Documents and availability reviewed. Rental quote prepared." : kind === "support" ? "Support scope reviewed and quotation/proposal prepared." : kind === "upgrade" ? "System inspected, benchmarked, and upgrade path identified." : "Software diagnosis completed and service scope prepared."),
            compatibilityReport: request.compatibilityReport || (kind === "rental" ? "Product availability, deposit, agreement, and delivery requirements checked." : kind === "sell" ? "Photos, bill, serial number, and condition reviewed." : kind === "support" ? "Issue severity, support method, and resolution path checked." : kind === "upgrade" ? "Compatibility, BIOS support, thermals, clearance, and power draw verified." : "OS, storage health, drivers, malware state, and data availability checked."),
            recommendation: request.recommendation || (kind === "sell" ? "Offer sent to customer for approval." : kind === "rental" ? "Proceed with agreement, payment, product reservation, and delivery." : kind === "support" ? "Proceed with support session/proposal and resolution workflow." : kind === "upgrade" ? "Recommended upgrade package prepared." : "Recommended software/data service plan prepared."),
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
          { key: "components", label: "Components", render: b => (
            <div style={{ minWidth: 280, display: "grid", gap: 5 }}>
              {b.components.map(c => (
                <div key={`${c.type}-${c.name}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#ddd" }}>
                  <span><strong style={{ color: "white" }}>{c.type}:</strong> {c.name}</span>
                  <span style={{ color: "#FF1F45", whiteSpace: "nowrap" }}>{inr(c.price)}</span>
                </div>
              ))}
              <small style={{ color: "#777", marginTop: 4 }}>{(b.validationReport || []).filter(v => v.pass).length} validations passed</small>
            </div>
          ) },
          { key: "total", label: "Quote", align: "right", render: b => inr(b.quotation || b.total) },
          { key: "tech", label: "Technician / Progress", render: b => (
            <PCBuildTechnicianCell build={b} builders={builders} builderName={builderName} patchPCBuild={patchPCBuild} />
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
  const timeline = build.timeline || [];
  const done = timeline.filter(step => step.done).length;
  const total = timeline.length || 1;
  const percent = Math.round((done / total) * 100);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 220 }} onClick={e => e.stopPropagation()}>
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
        <strong style={{ color: "white" }}>{builderName(build.technicianId)}</strong><br />
        <span style={{ color: "#777" }}>Staff status: </span><StatusBadge status={build.status} />
        <div style={{ marginTop: 7, height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#a855f7,#00b4ff)" }} />
        </div>
        <div style={{ color: "#777", marginTop: 5 }}>{done}/{total} steps · Updated {formatTime(build.technicianLastStatusAt || build.updatedAt || build.createdAt)}</div>
      </div>
    </div>
  );
}

// ─── Assembly ─────────────────────────────────────────────────────────────

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

export function AdminCRM({ store }: { store: DashboardStore }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Customer History">
        <DataTable
          rowKey={n => n.id}
          data={store.crmNotes}
          columns={[
            { key: "by", label: "By", render: n => n.by },
            { key: "text", label: "Note", render: n => <span style={{ maxWidth: 400, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.text}</span> },
            { key: "at", label: "Date", render: n => formatDate(n.at) },
          ]}
        />
      </SectionCard>
    </div>
  );
}

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

export function AdminCustomers({ store }: { store: DashboardStore }) {
  const users = readDemoUsers();
  return (
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
            <div style={{ display: "flex", gap: 4 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline">{u.status === "locked" ? <Unlock size={10} /> : <Lock size={10} />} {u.status === "locked" ? "Unlock" : "Lock"}</button>
              <button className="glass-pill glass-pill-sm glass-pill-info">History</button>
            </div>
          )},
        ]}
      />
    </SectionCard>
  );
}

// ─── Staff ────────────────────────────────────────────────────────────────

export function AdminStaff({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Staff Directory" subtitle={`${store.staff.length} members`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> Add Staff</button>}
    >
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
  );
}

// ─── Suppliers ────────────────────────────────────────────────────────────

export function AdminSuppliers({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Suppliers" subtitle={`${store.suppliers.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> Add Supplier</button>}
    >
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

export function AdminPurchaseOrders({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Purchase Orders" subtitle={`${store.purchaseOrders.length} total`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> Create PO</button>}
    >
      <DataTable
        rowKey={p => p.id}
        data={store.purchaseOrders}
        columns={[
          { key: "id", label: "PO ID", render: p => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{p.id}</span> },
          { key: "supplier", label: "Supplier", render: p => store.suppliers.find(s => s.id === p.supplierId)?.name || "—" },
          { key: "items", label: "Items", render: p => `${p.items.length} item${p.items.length > 1 ? "s" : ""}` },
          { key: "total", label: "Total", align: "right", render: p => inr(p.total) },
          { key: "status", label: "Status", render: p => <StatusBadge status={p.status} /> },
        ]}
      />
    </SectionCard>
  );
}

// ─── Coupons ──────────────────────────────────────────────────────────────

export function AdminCoupons({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Coupons" subtitle={`${store.coupons.length} configured`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> New Coupon</button>}
    >
      <DataTable
        rowKey={c => c.id}
        data={store.coupons}
        columns={[
          { key: "code", label: "Code", render: c => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", letterSpacing: 1 }}>{c.code}</span> },
          { key: "description", label: "Description" },
          { key: "discount", label: "Discount", align: "right", render: c => c.discountPercent ? `${c.discountPercent}%` : "—"},
          { key: "minSpend", label: "Min Spend", align: "right", render: c => inr(c.minSpend) },
          { key: "expires", label: "Expires", render: c => formatDate(c.expiresAt) },
          { key: "status", label: "Status", render: c => <span className={`glass-pill glass-pill-sm ${c.redeemed ? "glass-pill-success" : "glass-pill-outline"}`} style={{ pointerEvents: "none" }}>{c.redeemed ? "Redeemed" : "Active"}</span> },
        ]}
      />
    </SectionCard>
  );
}

// ─── Offers ───────────────────────────────────────────────────────────────

export function AdminOffers({ store }: { store: DashboardStore }) {
  return (
    <SectionCard title="Promotional Offers" subtitle={`${store.offers.length} active`}
      action={<button className="glass-pill glass-pill-primary glass-pill-sm"><Plus size={12} /> New Offer</button>}
    >
      <div className="dash-tab-grid">
        {store.offers.map(o => (
          <div key={o.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white" }}>{o.title}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#aaa", marginTop: 4 }}>{o.detail}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", letterSpacing: 1 }}>{o.code}</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>Expires {formatDate(o.expiresAt)}</span>
            </div>
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

export function AdminNotifications({ store, addNotification }: { store: DashboardStore; addNotification: any }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [audience, setAudience] = useState<"all" | "customers" | "staff">("all");
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
                <span className="glass-pill glass-pill-sm glass-pill-outline" style={{ pointerEvents: "none" }}>{n.type}</span>
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

  const Field = ({ label, k, type = "text" }: { label: string; k: keyof DashboardSettings; type?: string }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</span>
      <input type={type} value={form[k] as any} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: "none" }} />
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Tax & Payment"
        action={<button className="glass-pill glass-pill-primary glass-pill-sm" onClick={() => { updateSettings(form); toast.success("Settings saved"); }}><Save size={11} /> Save</button>}
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
            <span key={z} className="glass-pill glass-pill-outline glass-pill-sm" style={{ pointerEvents: "none" }}>{z}</span>
          ))}
          <button className="glass-pill glass-pill-sm glass-pill-outline"><Plus size={10} /> Add Zone</button>
        </div>
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
    a.download = `audit-logs-${Date.now()}.csv`;
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
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
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
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        window.localStorage.setItem("deskto-dashboard-v1", JSON.stringify(data));
        toast.success("Backup restored — reload to see changes");
      } catch {
        toast.error("Invalid file");
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
