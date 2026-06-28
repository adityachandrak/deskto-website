import { useState } from "react";
import {
  ShoppingBag, Wrench, CalendarDays, Headphones, Gift, Bell, LogOut as LogOutIcon,
  Package, Truck, ShieldCheck, Heart, Plus, X, ArrowRight, CheckCircle, Clock,
  ShoppingCart, MapPin, Star, Upload, Trash2, Edit, FileText, Download, AlertCircle,
  Calendar, Award, MessageSquare, Zap, Database,
} from "lucide-react";
import { KPICard } from "./components/dashboard/KPICard";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { SectionCard } from "./components/dashboard/SectionCard";
import { DataTable, type Column } from "./components/dashboard/DataTable";
import { EmptyState } from "./components/dashboard/EmptyState";
import type { AuthUser } from "./lib/currentUser";
import type {
  DashboardStore, Order, Repair, Rental, PCBuild, Assembly, SupportTicket,
  Review, Coupon, NotificationItem, Address, ServiceRequest,
} from "./lib/dashboardData";
import { mediaName, openMediaFile } from "./lib/mediaStore";
import { useWishlist } from "./lib/wishlist";
import { PRODUCTS } from "./app";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const formatDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysUntil = (t: number) => Math.ceil((t - Date.now()) / 86400000);
const uploadName = mediaName;

async function openMedia(file: string) {
  try {
    const mediaWindow = window.open("", "_blank");
    const opened = await openMediaFile(file, mediaWindow);
    if (!opened) toast.error(`${uploadName(file)} could not be opened. Please upload it again.`);
  } catch {
    toast.error(`Could not open ${uploadName(file)}.`);
  }
}

// ─── Overview ─────────────────────────────────────────────────────────────

export function CustomerOverview({ user, data, onTab }: { user: AuthUser; data: ReturnType<typeof import("./lib/dashboardData").useDashboardData>; onTab: (k: string) => void }) {
  const { store } = data;
  const myOrders = store.orders.filter(o => o.customerId === user.id);
  const activeOrders = myOrders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const openRepairs = store.repairs.filter(r => r.customerId === user.id && !["ready", "delivered"].includes(r.status)).length;
  const activeRentals = store.rentals.filter(r => r.customerId === user.id && r.status === "active").length;
  const openTickets = store.tickets.filter(t => t.customerId === user.id && !["resolved", "closed"].includes(t.status)).length;
  const points = store.rewards.find(r => r.customerId === user.id)?.points || 0;
  const unread = store.notifications.filter(n => !n.read && !n.archived && n.customerId === user.id).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="dash-kpi-grid">
        <KPICard label="Active Orders" value={activeOrders} icon={<ShoppingBag size={14} />} color="#FF1F45" hint={`${myOrders.length} total`} />
        <KPICard label="Open Repairs" value={openRepairs} icon={<Wrench size={14} />} color="#ff6b00" hint={`${store.repairs.filter(r => r.customerId === user.id).length} total`} />
        <KPICard label="Active Rentals" value={activeRentals} icon={<CalendarDays size={14} />} color="#00b4ff" hint="Rental in progress" />
        <KPICard label="Support Tickets" value={openTickets} icon={<Headphones size={14} />} color="#a855f7" hint="Open or in-progress" />
        <KPICard label="Loyalty Points" value={points} icon={<Gift size={14} />} color="#00cc66" hint="Redeem anytime" />
        <KPICard label="Notifications" value={unread} icon={<Bell size={14} />} color="#ffd700" hint="Unread" />
      </div>

      <SectionCard title="Quick Actions" subtitle="Jump into the most common flows">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <button onClick={() => onTab("orders")} className="glass-pill glass-pill-primary"><ShoppingBag size={13} /> Track Order</button>
          <button onClick={() => onTab("repairs")} className="glass-pill glass-pill-outline"><Wrench size={13} /> File Repair</button>
          <button onClick={() => onTab("rentals")} className="glass-pill glass-pill-outline"><Truck size={13} /> Book Rental</button>
          <button onClick={() => { window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }} className="glass-pill glass-pill-outline"><ShoppingCart size={13} /> Browse Products</button>
        </div>
      </SectionCard>

      <SectionCard title="Recent Orders" subtitle="Your latest purchases">
        {myOrders.length === 0 ? <EmptyState icon={<Package size={24} />} title="No orders yet" /> : (
          <DataTable
            rowKey={o => o.id}
            data={myOrders.slice(0, 5)}
            columns={[
              { key: "id", label: "Order ID", render: o => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{o.id.slice(-8).toUpperCase()}</span> },
              { key: "items", label: "Items", render: o => o.items.map(i => i.name).join(", ").slice(0, 50) },
              { key: "total", label: "Total", align: "right", render: o => inr(o.total) },
              { key: "status", label: "Status", render: o => <StatusBadge status={o.status} /> },
              { key: "date", label: "Placed", render: o => formatDate(o.createdAt) },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────

export function CustomerProfile({ user }: { user: AuthUser }) {
  const [form, setForm] = useState({
    name: user.name, email: user.email, phone: user.phone, gst: "",
  });
  const [twoFA, setTwoFA] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Personal Details" subtitle="Update your contact information">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <FormField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <FormField label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <FormField label="GST (optional)" value={form.gst} onChange={v => setForm({ ...form, gst: v })} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button className="glass-pill glass-pill-primary" onClick={() => toast.success("Profile updated")}>Save Changes</button>
          <button className="glass-pill glass-pill-outline" onClick={() => setForm({ name: user.name, email: user.email, phone: user.phone, gst: "" })}>Reset</button>
        </div>
      </SectionCard>

      <SectionCard title="Profile Photo" subtitle="Add a personal touch">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #FF1F45, #5a0008)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white", fontWeight: 800 }}>
            {user.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="glass-pill glass-pill-outline"><Upload size={13} /> Upload Photo</button>
            <button className="glass-pill glass-pill-red">Remove</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Security" subtitle="Password & two-factor authentication">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <FormField label="Current Password" type="password" value={pw.current} onChange={v => setPw({ ...pw, current: v })} />
            <FormField label="New Password" type="password" value={pw.next} onChange={v => setPw({ ...pw, next: v })} />
            <FormField label="Confirm New Password" type="password" value={pw.confirm} onChange={v => setPw({ ...pw, confirm: v })} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setTwoFA(!twoFA)}
              className={`glass-pill glass-pill-icon ${twoFA ? "glass-pill-success" : ""}`}
              style={{ width: 44, height: 24, borderRadius: 999, padding: 0, position: "relative" }}
            >
              <div style={{ position: "absolute", top: 2, left: twoFA ? 22 : 2, width: 20, height: 20, background: "white", borderRadius: "50%", transition: "left .2s" }} />
            </button>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white" }}>Two-Factor Authentication</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888" }}>Adds an OTP step on every login.</div>
            </div>
          </div>
          <div>
            <button className="glass-pill glass-pill-primary" onClick={() => { setPw({ current: "", next: "", confirm: "" }); toast.success("Password updated"); }}>Save Security Settings</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: "none",
        }}
      />
    </label>
  );
}

// ─── Addresses ────────────────────────────────────────────────────────────

export function CustomerAddresses({ user, store, addAddress, deleteAddress }: { user: AuthUser; store: DashboardStore; addAddress: (a: Omit<Address, "id">) => void; deleteAddress: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<Address, "id">>({ label: "", line1: "", city: "", state: "", pincode: "" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", margin: 0 }}>Saved Addresses</h2>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", margin: "4px 0 0" }}>Manage where DESKTO ships to.</p>
        </div>
        <button className="glass-pill glass-pill-primary" onClick={() => setAdding(true)}><Plus size={13} /> Add Address</button>
      </div>

      {adding && (
        <SectionCard title="New Address" action={<button className="glass-pill glass-pill-icon" onClick={() => setAdding(false)}><X size={13} /></button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <FormField label="Label" value={draft.label} onChange={v => setDraft({ ...draft, label: v })} placeholder="Home, Office..." />
            <FormField label="Address Line 1" value={draft.line1} onChange={v => setDraft({ ...draft, line1: v })} />
            <FormField label="City" value={draft.city} onChange={v => setDraft({ ...draft, city: v })} />
            <FormField label="State" value={draft.state} onChange={v => setDraft({ ...draft, state: v })} />
            <FormField label="Pincode" value={draft.pincode} onChange={v => setDraft({ ...draft, pincode: v })} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="glass-pill glass-pill-primary" onClick={() => { if (!draft.label || !draft.line1) { toast.error("Label and line1 are required"); return; } addAddress(draft); setAdding(false); setDraft({ label: "", line1: "", city: "", state: "", pincode: "" }); }}>Save Address</button>
            <button className="glass-pill glass-pill-outline" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </SectionCard>
      )}

      <div className="dash-tab-grid">
        {store.addresses.map(a => (
          <div key={a.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={14} color="#FF1F45" />
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white" }}>{a.label}</span>
                {a.isDefault && <span className="glass-pill glass-pill-sm glass-pill-primary" style={{ pointerEvents: "none" }}>Default</span>}
              </div>
              <button className="glass-pill glass-pill-icon glass-pill-sm" onClick={() => { if (confirm(`Delete "${a.label}"?`)) deleteAddress(a.id); }} style={{ width: 26, height: 26 }}>
                <Trash2 size={11} />
              </button>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ccc" }}>
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
              {a.city}, {a.state} — {a.pincode}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="glass-pill glass-pill-sm glass-pill-outline"><Edit size={10} /> Edit</button>
              {!a.isDefault && <button className="glass-pill glass-pill-sm glass-pill-outline">Set Default</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────

export function CustomerOrders({ user, store, updateOrderStatus }: { user: AuthUser; store: DashboardStore; updateOrderStatus: (id: string, status: Order["status"]) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<Order | null>(null);
  const myOrders = store.orders.filter(o => o.customerId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const filtered = filter === "all" ? myOrders : myOrders.filter(o => o.status === filter);

  const STATUSES = ["all", "placed", "verified", "packing", "shipped", "delivered", "cancelled"];
  const active = open ? store.orders.find(o => o.id === open.id) || open : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUSES.map(s => (
          <button key={s} className={`glass-pill ${filter === s ? "glass-pill-primary" : "glass-pill-outline"} glass-pill-sm`} onClick={() => setFilter(s)}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <SectionCard title={`Orders (${filtered.length})`}>
        {filtered.length === 0 ? <EmptyState icon={<Package size={24} />} title="No orders yet" /> : (
          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            {filtered.map(order => (
              <button key={order.id} onClick={() => setOpen(order)} className="glass" style={{ borderRadius: 10, padding: 14, textAlign: "left", border: "1px solid rgba(255,255,255,.08)", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center", cursor: "pointer" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 13 }}>#{order.id.slice(-8).toUpperCase()}</span>
                    <StatusBadge status={order.status} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#777", fontSize: 11 }}>{formatDate(order.createdAt)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {order.items.slice(0, 3).map(item => <img key={item.productId} src={item.img} alt={item.name} style={{ width: 42, height: 34, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,.08)" }} />)}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#ddd", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.items[0]?.name || "DESKTO order"}{order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#777", fontSize: 11, marginTop: 3 }}>
                        {order.deliveryMethod === "pickup" ? "Store pickup" : "Home delivery"} · {order.paymentMethod?.toUpperCase() || "Payment"} · {order.items.reduce((sum, item) => sum + item.qty, 0)} qty
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", color: "#FF1F45", fontSize: 18, fontWeight: 700 }}>{inr(order.total)}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#777", fontSize: 11, marginTop: 4 }}>View Details</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpen(null)}>
          <div className="glass-card" style={{ width: "min(520px, 100%)", height: "100vh", overflowY: "auto", padding: 24, borderRadius: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", margin: 0 }}>Order #{active.id.slice(-8).toUpperCase()}</h3>
              <button className="glass-pill glass-pill-icon" onClick={() => setOpen(null)}><X size={13} /></button>
            </div>
            <div style={{ marginBottom: 18 }}><StatusBadge status={active.status} /></div>

            <SectionCard title="Items" padded={false}>
              <div style={{ padding: 14 }}>
                {active.items.map(i => (
                  <div key={i.productId} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                    <img src={i.img} alt={i.name} style={{ width: 42, height: 34, objectFit: "cover", borderRadius: 6 }} />
                    <span style={{ color: "#ddd" }}>{i.name} × {i.qty}</span>
                    <span style={{ color: "white" }}>{inr(i.price * i.qty)}</span>
                  </div>
                ))}
                {typeof active.subtotal === "number" && <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}><span>Subtotal</span><span>{inr(active.subtotal)}</span></div>}
                {!!active.discount && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#00cc66" }}><span>Discount{active.couponCode ? ` (${active.couponCode})` : ""}</span><span>-{inr(active.discount)}</span></div>}
                {typeof active.gst === "number" && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}><span>GST</span><span>{inr(active.gst)}</span></div>}
                {typeof active.shipping === "number" && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}><span>Shipping</span><span>{active.shipping ? inr(active.shipping) : "FREE"}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white" }}>
                  <span>Total</span><span>{inr(active.total)}</span>
                </div>
              </div>
            </SectionCard>

            {active.shippingAddress && (
              <SectionCard title={active.deliveryMethod === "pickup" ? "Pickup / Contact" : "Delivery Address"} padded={false}>
                <div style={{ padding: 14, fontFamily: "'Space Grotesk', sans-serif", color: "#CFCFCF", fontSize: 12, lineHeight: 1.7 }}>
                  <strong style={{ color: "white" }}>{active.shippingAddress.name}</strong><br />
                  {active.deliveryMethod === "pickup" ? "Store pickup selected" : <>{active.shippingAddress.line1}{active.shippingAddress.line2 ? `, ${active.shippingAddress.line2}` : ""}<br />{active.shippingAddress.city}, {active.shippingAddress.state} {active.shippingAddress.pincode}</>}<br />
                  {active.shippingAddress.phone} · {active.shippingAddress.email}
                </div>
              </SectionCard>
            )}

            <div style={{ marginTop: 18 }}>
              <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.4, textTransform: "uppercase", margin: "0 0 12px" }}>Tracking</h4>
              <div className="dash-timeline">
                {active.status === "cancelled" && <div className="glass-red" style={{ borderRadius: 9, padding: 10, marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif", color: "#FFC0C8", fontSize: 12 }}>This order has been cancelled.</div>}
                {active.trackingSteps.map(s => (
                  <div key={s.label} className={`dash-timeline-step ${s.done ? "done" : ""}`}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: s.done ? "white" : "#888" }}>{s.label}</div>
                    {s.done && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>{formatDate(s.at)}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              {active.invoiceId && <button className="glass-pill glass-pill-primary" onClick={() => toast.success(`Invoice ${active.invoiceId} ready`)}><Download size={13} /> Invoice</button>}
              {active.warrantyEndsAt && <button className="glass-pill glass-pill-outline" onClick={() => toast.success(`Warranty valid until ${formatDate(active.warrantyEndsAt!)}`)}><ShieldCheck size={13} /> Warranty</button>}
              {["placed", "verified"].includes(active.status) && <button className="glass-pill glass-pill-red" onClick={() => { updateOrderStatus(active.id, "cancelled"); toast.success("Order cancelled"); }}>Cancel Order</button>}
              <button className="glass-pill glass-pill-outline">Write Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repairs ──────────────────────────────────────────────────────────────

function repairQuoteItems(repair: Repair) {
  return repair.quotationItems?.length
    ? repair.quotationItems
    : [
        ...(repair.partsRequired || []).map(p => ({ label: p.name, cost: p.cost })),
        ...(repair.laborCost ? [{ label: "Labor Charges", cost: repair.laborCost }] : []),
      ];
}

function RepairQuotationPanel({ repair, patchRepair, updateRepairStatus, onClose }: { repair: Repair; patchRepair: (id: string, patch: Partial<Repair>) => void; updateRepairStatus: (id: string, s: any) => void; onClose?: () => void }) {
  if (!repair.quotation) return null;
  const items = repairQuoteItems(repair);
  const canApprove = repair.status === "quotation";
  const canPay = ["quote-approved", "payment-pending"].includes(repair.status);
  return (
    <div className="glass" style={{ borderRadius: 10, padding: 14, marginTop: 14, border: "1px solid rgba(255,31,69,.18)" }}>
      <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 14px" }}>Quotation</h4>
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {items.length > 0 ? items.map((item, index) => (
          <div key={`${item.label}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 7 }}>
            <span>{item.label}</span>
            <span style={{ color: "white" }}>{inr(item.cost || 0)}</span>
          </div>
        )) : (
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa" }}>Admin quotation is being prepared.</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "white" }}>
          <span>Total</span>
          <span>{inr(repair.quotation)}</span>
        </div>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa", lineHeight: 1.6, margin: 0 }}>{repair.quotationNote || "Final quotation prepared after diagnosis."}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canApprove && <button className="glass-pill glass-pill-success" onClick={() => { patchRepair(repair.id, { status: "quote-approved" }); toast.success("Quotation approved"); }}>Approve Quotation</button>}
        {canPay && <button className="glass-pill glass-pill-primary" onClick={() => { patchRepair(repair.id, { status: "paid", paidAmount: repair.quotation, advancePaid: repair.quotation }); toast.success("Payment successful"); }}>Pay Now</button>}
        {canApprove && <button className="glass-pill glass-pill-outline" onClick={() => toast.message("Revision request sent to admin")}>Request Changes</button>}
        {canApprove && <button className="glass-pill glass-pill-red" onClick={() => { updateRepairStatus(repair.id, "closed"); toast.success("Repair request closed"); onClose?.(); }}>Reject</button>}
      </div>
    </div>
  );
}

function RepairTimelinePanel({ repair }: { repair: Repair }) {
  return (
    <div className="glass" style={{ borderRadius: 10, padding: 14, marginTop: 14 }}>
      <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 12px" }}>Live Timeline</h4>
      <div className="dash-timeline">
        {repair.timeline.map(s => (
          <div key={s.label} className={`dash-timeline-step ${s.done ? "done" : ""}`}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: s.done ? "white" : "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerRepairs({ user, store, updateRepairStatus, patchRepair }: { user: AuthUser; store: DashboardStore; updateRepairStatus: (id: string, s: any) => void; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const [open, setOpen] = useState<Repair | null>(null);
  const myRepairs = store.repairs.filter(r => r.customerId === user.id);
  const active = open ? store.repairs.find(r => r.id === open.id) || open : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Repair Service Workflow" subtitle={`${myRepairs.length} repair request${myRepairs.length === 1 ? "" : "s"}`}>
        {myRepairs.length === 0 ? <EmptyState icon={<Wrench size={24} />} title="No repair tickets" hint="File a repair from any device page." /> : (
          <div className="dash-tab-grid">
            {myRepairs.map(r => (
              <div key={r.id} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 12, alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "#888" }}>#{r.id.slice(-8).toUpperCase()}</span>
                    <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, color: "white", margin: "8px 0 6px" }}>{r.device}</h4>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa", margin: 0 }}>{r.issue}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
                  <Stat label="Device" value={`${r.deviceType || "Device"} · ${r.brand || "-"} ${r.model || ""}`} />
                  <Stat label="Service" value={r.serviceType || "Service"} />
                  <Stat label="Slot" value={r.preferredSlot || "Schedule pending"} />
                  <Stat label="Quote" value={r.quotation ? inr(r.quotation) : r.estimatedCharge ? inr(r.estimatedCharge) : "Pending"} highlight={Boolean(r.quotation)} />
                </div>
                <RepairQuotationPanel repair={r} patchRepair={patchRepair} updateRepairStatus={updateRepairStatus} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
                  <RepairTimelinePanel repair={r} />
                  <div className="glass" style={{ borderRadius: 10, padding: 14, marginTop: 14 }}>
                    <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 12px" }}>Reports</h4>
                    <div style={{ display: "grid", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF" }}>
                      <span><strong style={{ color: "white" }}>Diagnosis:</strong> {r.diagnosisReport || "Pending"}</span>
                      <span><strong style={{ color: "white" }}>Serial:</strong> {r.serialNumber || "Not provided"}</span>
                      <span><strong style={{ color: "white" }}>Uploaded:</strong> {r.uploadedFiles?.length ? r.uploadedFiles.map(uploadName).join(", ") : "No media uploaded"}</span>
                    </div>
                  </div>
                </div>
                <button className="glass-pill glass-pill-outline glass-pill-sm" style={{ marginTop: 14 }} onClick={() => setOpen(r)}>Open Detail Drawer</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpen(null)}>
          <div className="glass-card" style={{ width: "min(520px, 100%)", height: "100vh", overflowY: "auto", padding: 24, borderRadius: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", margin: 0 }}>{active.device}</h3>
              <button className="glass-pill glass-pill-icon" onClick={() => setOpen(null)}><X size={13} /></button>
            </div>
            <StatusBadge status={active.status} />

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#ccc", margin: "16px 0" }}>{active.issue}</p>
            <div className="glass" style={{ borderRadius: 10, padding: 12, display: "grid", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF" }}>
              <span><strong style={{ color: "white" }}>Device:</strong> {active.deviceType || "Device"} · {active.brand || "-"} {active.model || ""}</span>
              <span><strong style={{ color: "white" }}>Service:</strong> {active.serviceType || "-"} · {active.preferredSlot || "Schedule pending"}</span>
              <span><strong style={{ color: "white" }}>Serial:</strong> {active.serialNumber || "Not provided"}</span>
              <span><strong style={{ color: "white" }}>Uploaded:</strong> {active.uploadedFiles?.length ? active.uploadedFiles.map(uploadName).join(", ") : "No media uploaded"}</span>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.4, textTransform: "uppercase", margin: "0 0 12px" }}>Live Status</h4>
              <div className="dash-timeline">
                {active.timeline.map(s => (
                  <div key={s.label} className={`dash-timeline-step ${s.done ? "done" : ""}`}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: s.done ? "white" : "#888" }}>{s.label}</div>
                    {s.done && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>{formatDate(s.at)}</div>}
                  </div>
                ))}
              </div>
            </div>

            {active.diagnosisReport && (
              <SectionCard title="Diagnosis Report">
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.7 }}>{active.diagnosisReport}</p>
                {!!active.partsRequired?.length && active.partsRequired.map(p => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <span>{p.name}</span><span>{inr(p.cost)}</span>
                  </div>
                ))}
              </SectionCard>
            )}

            <RepairQuotationPanel repair={active} patchRepair={patchRepair} updateRepairStatus={updateRepairStatus} onClose={() => setOpen(null)} />

            {(active.invoiceId || active.warrantyId) && (
              <SectionCard title="Documents">
                <div style={{ display: "grid", gap: 8 }}>
                  {active.invoiceId && <button className="glass-pill glass-pill-outline"><FileText size={12} /> Invoice {active.invoiceId.slice(-8).toUpperCase()}</button>}
                  {active.warrantyId && <button className="glass-pill glass-pill-outline"><ShieldCheck size={12} /> Warranty {active.warrantyId.slice(-8).toUpperCase()}</button>}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rentals ──────────────────────────────────────────────────────────────

export function CustomerRentals({ user, store, updateRental }: { user: AuthUser; store: DashboardStore; updateRental: (id: string, p: any) => void }) {
  const myRentals = store.rentals.filter(r => r.customerId === user.id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {myRentals.length === 0 ? <EmptyState icon={<Truck size={24} />} title="No rentals" hint="Rent a gaming rig for events or travel." action={<button className="glass-pill glass-pill-primary">Browse Rentals</button>} /> : (
        myRentals.map(r => {
          const daysLeft = daysUntil(r.endDate);
          return (
            <SectionCard key={r.id} title={r.productName} subtitle={`Rental #${r.id.slice(-8).toUpperCase()}`} action={<StatusBadge status={r.status} />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                <Stat label="Start Date" value={formatDate(r.startDate)} />
                <Stat label="Return Date" value={formatDate(r.endDate)} />
                <Stat label="Days Left" value={daysLeft > 0 ? `${daysLeft} days` : "Overdue"} highlight={daysLeft <= 3} />
                <Stat label="Deposit" value={inr(r.deposit)} />
                <Stat label="Monthly Rate" value={inr(r.monthlyRate)} />
              </div>
              {r.status === "active" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="glass-pill glass-pill-primary" onClick={() => { updateRental(r.id, { endDate: r.endDate + 30 * 86400000 }); toast.success("Rental extended by 30 days"); }}>Extend Rental</button>
                  <button className="glass-pill glass-pill-outline" onClick={() => { updateRental(r.id, { status: "returning" }); toast.success("Return scheduled"); }}>Schedule Return</button>
                  <button className="glass-pill glass-pill-outline">View Agreement</button>
                </div>
              )}
            </SectionCard>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: highlight ? "#FF1F45" : "white", marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ─── PC Builds ────────────────────────────────────────────────────────────

export function CustomerPCBuilds({ user, store, patchPCBuild }: { user: AuthUser; store: DashboardStore; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  const builds = store.pcBuilds.filter(b => b.customerId === user.id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {builds.length === 0 ? <EmptyState icon={<Package size={24} />} title="No PC builds" hint="Start a custom build on the homepage." action={<button className="glass-pill glass-pill-primary">Start Build</button>} /> : (
        builds.map(b => (
          <SectionCard key={b.id} title={b.name} subtitle={`Build #${b.id.slice(-8).toUpperCase()}`} action={<StatusBadge status={b.status} />}>
            <div className="dash-tab-grid" style={{ marginBottom: 16 }}>
              {b.components.map(c => (
                <div key={c.name} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>{c.type}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white", marginTop: 4 }}>{c.name}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", marginTop: 4 }}>{inr(c.price)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white" }}>Total: {inr(b.total)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["quotation", "submitted"].includes(b.status) && <button className="glass-pill glass-pill-success" onClick={() => { patchPCBuild(b.id, { status: "approved" }); toast.success("Build quotation approved"); }}>Approve Quotation</button>}
                {b.status === "approved" && <button className="glass-pill glass-pill-primary" onClick={() => { patchPCBuild(b.id, { status: "paid", paidAmount: b.quotation || b.total, invoiceId: b.invoiceId || `INV-${b.id.slice(-6).toUpperCase()}` }); toast.success("Advance payment successful"); }}>Pay Advance</button>}
                <button className="glass-pill glass-pill-outline">Invoice</button>
                {b.warrantyEndsAt && <button className="glass-pill glass-pill-outline"><ShieldCheck size={12} /> Warranty</button>}
              </div>
            </div>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <SectionCard title="Validation">
                {(b.validationReport || []).map(v => <div key={v.label} style={{ display: "flex", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", marginBottom: 8 }}><CheckCircle size={13} color={v.pass ? "#00cc66" : "#FF1F45"} /> {v.label}</div>)}
              </SectionCard>
              <SectionCard title="Timeline">
                <div className="dash-timeline">
                  {(b.timeline || []).map(s => <div key={s.label} className={`dash-timeline-step ${s.done ? "done" : ""}`}><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: s.done ? "white" : "#888" }}>{s.label}</div></div>)}
                </div>
              </SectionCard>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}

function CustomerServiceRequests({ user, store, kind, patchServiceRequest }: { user: AuthUser; store: DashboardStore; kind: ServiceRequest["kind"]; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const requests = (store.serviceRequests || []).filter(r => r.customerId === user.id && r.kind === kind);
  const icon = kind === "upgrade" ? <Zap size={24} /> : kind === "software" ? <Database size={24} /> : kind === "rental" ? <CalendarDays size={24} /> : kind === "sell" ? <Truck size={24} /> : <Headphones size={24} />;
  const title = kind === "upgrade" ? "Upgrade & Optimization" : kind === "software" ? "Software & Data Services" : kind === "rental" ? "Rental Solutions" : kind === "sell" ? "Sell Used Products" : "Remote & Business IT Support";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {requests.length === 0 ? <EmptyState icon={icon} title={`No ${title.toLowerCase()} requests`} hint={`Open ${title} from Services to submit a new request.`} /> : (
        requests.map(r => (
          <SectionCard key={r.id} title={r.title} subtitle={`Request #${r.id.slice(-8).toUpperCase()}`} action={<StatusBadge status={r.status} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              <Stat label="Device" value={r.deviceType} />
              <Stat label="Category" value={r.category} />
              <Stat label="Service" value={r.serviceMethod} />
              <Stat label="Slot" value={r.preferredSlot || "Schedule pending"} />
              <Stat label={kind === "sell" ? "Offer" : "Quote"} value={r.quotation ? inr(r.quotation) : r.expectedPrice ? `Expected ${inr(r.expectedPrice)}` : "Pending"} highlight={Boolean(r.quotation)} />
            </div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#ccc", lineHeight: 1.7, margin: "0 0 16px" }}>{r.requirements}</p>
            {r.quotation && ["quotation", "offer-sent", "approved", "accepted"].includes(r.status) && (
              <SectionCard title={kind === "sell" ? "Price Offer" : "Quotation"}>
                <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                  {(r.quotationItems || []).map((item, index) => (
                    <div key={`${item.label}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 7 }}>
                      <span>{item.label}</span>
                      <span style={{ color: "white" }}>{inr(item.cost || 0)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Orbitron', sans-serif", fontSize: 15, color: "white" }}>
                    <span>Total</span>
                    <span>{inr(r.quotation)}</span>
                  </div>
                  {r.quotationNote && <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa", lineHeight: 1.6, margin: 0 }}>{r.quotationNote}</p>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="glass-pill glass-pill-success" onClick={() => { patchServiceRequest(r.id, { status: kind === "sell" ? "accepted" : "approved" }); toast.success(kind === "sell" ? "Offer accepted" : "Quotation approved"); }}>{kind === "sell" ? "Accept Offer" : "Approve Quotation"}</button>
                  {kind !== "sell" && <button className="glass-pill glass-pill-primary" onClick={() => { patchServiceRequest(r.id, { status: "paid", paidAmount: r.quotation }); toast.success("Payment successful"); }}>Pay Now</button>}
                  <button className="glass-pill glass-pill-outline" onClick={() => toast.message(kind === "sell" ? "Offer rejected" : "Change request sent")}>{kind === "sell" ? "Reject Offer" : "Request Changes"}</button>
                </div>
              </SectionCard>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <SectionCard title="Live Timeline">
                <div className="dash-timeline">
                  {r.timeline.map(s => <div key={s.label} className={`dash-timeline-step ${s.done ? "done" : ""}`}><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: s.done ? "white" : "#888" }}>{s.label}</div></div>)}
                </div>
              </SectionCard>
              <SectionCard title={kind === "upgrade" ? "Reports" : "Service Details"}>
                <div style={{ display: "grid", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF" }}>
                  <span><strong style={{ color: "white" }}>Technician:</strong> {r.technicianId || "Not assigned"}</span>
                  <span><strong style={{ color: "white" }}>Diagnosis:</strong> {r.diagnosisReport || "Pending"}</span>
                  <span><strong style={{ color: "white" }}>Recommendation:</strong> {r.recommendation || r.compatibilityReport || "Pending"}</span>
                  <span><strong style={{ color: "white" }}>Uploads:</strong> {r.uploads?.length ? "" : "No uploads"}</span>
                  {!!r.uploads?.length && (
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {r.uploads.map(file => (
                        <button key={file} className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => openMedia(file)}>
                          <FileText size={11} /> {uploadName(file)}
                        </button>
                      ))}
                    </span>
                  )}
                  {(r.invoiceId || r.warrantyId || r.reportId) && <span><strong style={{ color: "white" }}>Docs:</strong> {[r.invoiceId, r.warrantyId, r.reportId].filter(Boolean).join(" · ")}</span>}
                </div>
              </SectionCard>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}

export function CustomerUpgrades(props: { user: AuthUser; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <CustomerServiceRequests {...props} kind="upgrade" />;
}

export function CustomerSoftwareServices(props: { user: AuthUser; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <CustomerServiceRequests {...props} kind="software" />;
}

export function CustomerRentalRequests(props: { user: AuthUser; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <CustomerServiceRequests {...props} kind="rental" />;
}

export function CustomerSellRequests(props: { user: AuthUser; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <CustomerServiceRequests {...props} kind="sell" />;
}

export function CustomerSupportRequests(props: { user: AuthUser; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  return <CustomerServiceRequests {...props} kind="support" />;
}

// ─── Assembly ─────────────────────────────────────────────────────────────

export function CustomerAssembly({ user, store }: { user: AuthUser; store: DashboardStore }) {
  const items = store.assemblies.filter(a => a.customerId === user.id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {items.length === 0 ? <EmptyState icon={<Package size={24} />} title="No assembly requests" /> : (
        items.map(a => (
          <SectionCard key={a.id} title={a.productName} subtitle={`Assembly #${a.id.slice(-8).toUpperCase()}`} action={<StatusBadge status={a.status} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {a.components.map(c => (
                <div key={c} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={12} color="#00cc66" /> {c}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="glass-pill glass-pill-primary">Invoice</button>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}

// ─── Remote Support ───────────────────────────────────────────────────────

export function CustomerRemoteSupport({ user, store, addReplyToTicket, closeTicket }: { user: AuthUser; store: DashboardStore; addReplyToTicket: (id: string, text: string, from: "customer" | "agent") => void; closeTicket: (id: string) => void }) {
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const tickets = store.tickets.filter(t => t.customerId === user.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Support Tickets">
        {tickets.length === 0 ? <EmptyState icon={<Headphones size={24} />} title="No support tickets" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tickets.map(t => (
              <div key={t.id} className="glass-card" style={{ padding: 14, cursor: "pointer" }} onClick={() => setActive(t)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white" }}>{t.subject}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", marginTop: 4 }}>#{t.id.slice(-8).toUpperCase()} · {formatDate(t.createdAt)}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {active && (
        <SectionCard title={active.subject} subtitle={`Ticket #${active.id.slice(-8).toUpperCase()}`} action={<StatusBadge status={active.status} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, maxHeight: 300, overflowY: "auto" }}>
            {active.messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "customer" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
                  background: m.from === "customer" ? "rgba(255,31,69,0.15)" : "rgba(255,255,255,0.05)",
                  border: m.from === "customer" ? "1px solid rgba(255,31,69,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd",
                }}>
                  {m.text}
                  <div style={{ fontSize: 9, color: "#666", marginTop: 4 }}>{formatDate(m.at)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type a reply…"
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "10px 16px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, outline: "none" }}
              onKeyDown={e => { if (e.key === "Enter" && reply.trim()) { addReplyToTicket(active.id, reply.trim(), "customer"); setReply(""); } }}
            />
            <button className="glass-pill glass-pill-primary" onClick={() => { if (reply.trim()) { addReplyToTicket(active.id, reply.trim(), "customer"); setReply(""); } }}>Send</button>
          </div>
          {active.meetingLink && (
            <div style={{ marginTop: 12, padding: 10, background: "rgba(0,180,255,0.08)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 10 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#00b4ff" }}>Meeting: {active.meetingLink}</div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Wishlist ─────────────────────────────────────────────────────────────

export function CustomerWishlist() {
  const { ids, toggle } = useWishlist();
  const items = PRODUCTS.filter(p => ids.includes(p.id));
  return (
    <SectionCard title="Wishlist" subtitle={`${items.length} saved`}>
      {items.length === 0 ? <EmptyState icon={<Heart size={24} />} title="Your wishlist is empty" hint="Tap the heart on any product to save it." action={<button className="glass-pill glass-pill-primary">Browse Products</button>} /> : (
        <div className="dash-tab-grid">
          {items.map(p => (
            <div key={p.id} className="glass-card" style={{ padding: 14 }}>
              <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 10, background: `linear-gradient(135deg, #1a1a1a, #0a0a0a)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 11, marginBottom: 10 }}>{p.category}</div>
              <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white", margin: "0 0 6px" }}>{p.name}</h4>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "#FF1F45" }}>{inr(p.price)}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button className="glass-pill glass-pill-sm glass-pill-primary"><ShoppingCart size={10} /> Move to Cart</button>
                <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => toggle(p.id)}><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Cart ─────────────────────────────────────────────────────────────────

interface CartLine { productId: number; qty: number; }
function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem("deskto_cart_v1") || "[]"); } catch { return []; }
}

export function CustomerCart() {
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  const items = lines.map(l => {
    const p = PRODUCTS.find(x => x.id === l.productId);
    return p ? { ...p, qty: l.qty } : null;
  }).filter(Boolean) as (typeof PRODUCTS[number] & { qty: number })[];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <SectionCard title="Shopping Cart" subtitle={`${items.length} items`}>
      {items.length === 0 ? <EmptyState icon={<ShoppingCart size={24} />} title="Your cart is empty" action={<button className="glass-pill glass-pill-primary">Browse Products</button>} /> : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(i => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                <div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white" }}>{i.name}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", marginTop: 2 }}>Qty: {i.qty}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#FF1F45" }}>{inr(i.price * i.qty)}</span>
                  <button className="glass-pill glass-pill-icon glass-pill-sm" onClick={() => { const next = lines.filter(l => l.productId !== i.id); window.localStorage.setItem("deskto_cart_v1", JSON.stringify(next)); setLines(next); }} style={{ width: 26, height: 26 }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white" }}>Total: {inr(total)}</div>
            <button className="glass-pill glass-pill-primary" onClick={() => toast.success("Checkout coming soon")}>Proceed to Checkout <ArrowRight size={12} /></button>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────

export function CustomerNotifications({ user, store, markRead, archive }: { user: AuthUser; store: DashboardStore; markRead: (id: string) => void; archive: (id: string) => void }) {
  const items = store.notifications.filter(n => !n.archived && (n.customerId === user.id || n.audience === "all" || n.audience === "customers"));
  return (
    <SectionCard title="Notifications">
      {items.length === 0 ? <EmptyState icon={<Bell size={24} />} title="No notifications" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(n => (
            <div key={n.id} className="glass-card" style={{ padding: 14, opacity: n.read ? 0.7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bell size={12} color={n.read ? "#666" : "#FF1F45"} />
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "white" }}>{n.title}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa", marginTop: 4 }}>{n.detail}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666", marginTop: 4 }}>{formatDate(n.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!n.read && <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => markRead(n.id)}>Mark read</button>}
                  <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => archive(n.id)}>Archive</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────

export function CustomerReviews({ user, store, fileReview }: { user: AuthUser; store: DashboardStore; fileReview: (r: Omit<Review, "id" | "createdAt">) => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<number>(PRODUCTS[0]?.id || 1);
  const myReviews = store.reviews.filter(r => r.customerId === user.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Write a Review">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>Product</span>
            <select value={target} onChange={e => setTarget(Number(e.target.value))} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
              {PRODUCTS.map(p => <option key={p.id} value={p.id} style={{ background: "#0a0a0a" }}>{p.name}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>Rating</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="glass-pill glass-pill-icon glass-pill-sm" style={{ width: 32, height: 32, color: s <= rating ? "#ffd700" : "#444" }}>
                  <Star size={14} fill={s <= rating ? "#ffd700" : "none"} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What did you love or hate?"
          rows={3}
          style={{ width: "100%", marginTop: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, resize: "vertical", outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="glass-pill glass-pill-primary" onClick={() => { if (!text) { toast.error("Add a description"); return; } fileReview({ customerId: user.id, productId: target, rating, text }); setText(""); toast.success("Review submitted"); }}>Submit Review</button>
          <button className="glass-pill glass-pill-outline"><Upload size={12} /> Add Photos</button>
        </div>
      </SectionCard>

      <SectionCard title="Your Reviews" subtitle={`${myReviews.length} submitted`}>
        {myReviews.length === 0 ? <EmptyState icon={<Star size={24} />} title="No reviews yet" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myReviews.map(r => (
              <div key={r.id} className="glass-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= r.rating ? "#ffd700" : "none"} color={s <= r.rating ? "#ffd700" : "#444"} />)}
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>{formatDate(r.createdAt)}</div>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#ddd", marginTop: 8 }}>{r.text}</div>
                {r.productId && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", marginTop: 4 }}>Product: {PRODUCTS.find(p => p.id === r.productId)?.name || `#${r.productId}`}</div>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export function CustomerInvoices({ user, store }: { user: AuthUser; store: DashboardStore }) {
  const items = store.orders.filter(o => o.customerId === user.id && o.invoiceId);
  return (
    <SectionCard title="Invoices" subtitle="One invoice per order">
      {items.length === 0 ? <EmptyState icon={<FileText size={24} />} title="No invoices" /> : (
        <DataTable
          rowKey={o => o.id}
          data={items}
          columns={[
            { key: "id", label: "Order", render: o => <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>{o.id.slice(-8).toUpperCase()}</span> },
            { key: "date", label: "Date", render: o => formatDate(o.createdAt) },
            { key: "total", label: "Amount", align: "right", render: o => inr(o.total) },
            { key: "action", label: "", render: o => <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => toast.success("Invoice PDF generated")}><Download size={10} /> PDF</button> },
          ]}
        />
      )}
    </SectionCard>
  );
}

// ─── Warranty ─────────────────────────────────────────────────────────────

export function CustomerWarranty({ user, store }: { user: AuthUser; store: DashboardStore }) {
  const items = store.orders.filter(o => o.customerId === user.id && o.warrantyEndsAt);
  return (
    <SectionCard title="Active Warranties">
      {items.length === 0 ? <EmptyState icon={<ShieldCheck size={24} />} title="No active warranties" /> : (
        <DataTable
          rowKey={o => o.id}
          data={items}
          columns={[
            { key: "items", label: "Product", render: o => o.items[0]?.name || "—" },
            { key: "expires", label: "Expires", render: o => formatDate(o.warrantyEndsAt!) },
            { key: "days", label: "Days Left", render: o => {
              const d = daysUntil(o.warrantyEndsAt!);
              return <span style={{ color: d < 60 ? "#ff6b00" : "#00cc66" }}>{d > 0 ? `${d} days` : "Expired"}</span>;
            }},
            { key: "action", label: "", render: o => <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => toast.success("Warranty card downloaded")}><Download size={10} /> Card</button> },
          ]}
        />
      )}
    </SectionCard>
  );
}

// ─── Rewards ──────────────────────────────────────────────────────────────

export function CustomerRewards({ user, store, redeemCoupon }: { user: AuthUser; store: DashboardStore; redeemCoupon: (id: string) => void }) {
  const reward = store.rewards.find(r => r.customerId === user.id);
  const available = store.coupons.filter(c => !c.redeemed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SectionCard title="Reward Points">
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 38, color: "#FF1F45", fontWeight: 900 }}>{reward?.points || 0}</div>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", margin: "6px 0" }}>Earn 50 points for every ₹1,000 spent. Redeem for coupons below.</p>
        {reward && (
          <div style={{ marginTop: 12 }}>
            <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>History</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {reward.history.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#ddd" }}>{h.label}</span>
                  <span style={{ color: h.delta > 0 ? "#00cc66" : "#FF1F45" }}>{h.delta > 0 ? "+" : ""}{h.delta}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Available Coupons" subtitle={`${available.length} ready to redeem`}>
        {available.length === 0 ? <EmptyState icon={<Award size={24} />} title="No coupons available" /> : (
          <div className="dash-tab-grid">
            {available.map(c => (
              <div key={c.id} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "#FF1F45", letterSpacing: 1 }}>{c.code}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white", fontWeight: 800 }}>{c.discountPercent}% OFF</div>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#aaa", marginTop: 6 }}>{c.description}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666", marginTop: 4 }}>Min spend {inr(c.minSpend)} · Expires {formatDate(c.expiresAt)}</div>
                <button className="glass-pill glass-pill-primary" style={{ marginTop: 12 }} onClick={() => { redeemCoupon(c.id); toast.success(`${c.code} redeemed — saved!`); }}>Redeem</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Logout ───────────────────────────────────────────────────────────────

export function CustomerLogout({ onConfirm, user }: { onConfirm: () => void; user: AuthUser }) {
  return (
    <SectionCard title="Sign Out" subtitle="End your session">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "30px 0" }}>
        <LogOutIcon size={40} color="#FF1F45" />
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white" }}>Goodbye, {user.name.split(" ")[0]}!</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#888", textAlign: "center", maxWidth: 380 }}>
          You can always come back by signing in again. Your cart and wishlist will be saved.
        </div>
        <button className="glass-pill glass-pill-primary glass-pill-lg" onClick={onConfirm}>Confirm Logout</button>
      </div>
    </SectionCard>
  );
}
