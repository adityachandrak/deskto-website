import type { AuthUser } from "./lib/currentUser";
import type { DashboardStore, GamingHubItem, PCBuild, Repair, ServiceRequest, StaffMember, TaskItem } from "./lib/dashboardData";
import { SectionCard } from "./components/dashboard/SectionCard";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { EmptyState } from "./components/dashboard/EmptyState";
import { DataTable } from "./components/dashboard/DataTable";

const formatDate = (value?: number) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending";

// Work-stage statuses a technician can set on an assigned repair. These sync to
// the admin Repair Management dashboard via the shared dashboard store.
const STAFF_REPAIR_STATUS_OPTIONS: [Repair["status"], string][] = [
  ["assigned", "Technician Assigned"],
  ["device-received", "Device Received"],
  ["diagnosing", "Diagnosis Started"],
  ["in-repair", "Repair Started"],
  ["repair-progress", "Repair In Progress"],
  ["qc", "Quality Testing"],
  ["completed", "Repair Completed"],
  ["ready", "Ready for Pickup"],
];

// Work-stage statuses a technician can set on each service-request kind. Updates
// sync to the admin Staff Work Progress column via the shared dashboard store.
const STAFF_SERVICE_STATUS_OPTIONS: Record<ServiceRequest["kind"], [ServiceRequest["status"], string][]> = {
  upgrade: [
    ["technician-assigned", "Technician Assigned"],
    ["inspection", "System Inspection"],
    ["compatibility-verified", "Compatibility Verified"],
    ["in-progress", "Upgrade Started"],
    ["optimization", "Performance Optimization"],
    ["quality-testing", "Quality Testing"],
    ["completed", "Completed"],
    ["ready", "Ready for Delivery"],
  ],
  software: [
    ["technician-assigned", "Technician Assigned"],
    ["diagnosis", "System Diagnosis"],
    ["in-progress", "Installation Started"],
    ["data-recovery", "Data Recovery"],
    ["optimization", "Optimization"],
    ["quality-testing", "Quality Testing"],
    ["completed", "Completed"],
    ["ready", "Ready"],
  ],
  rental: [
    ["technician-assigned", "Assigned"],
    ["documents-verified", "Documents Verified"],
    ["reserved", "Product Reserved"],
    ["prepared", "Product Prepared"],
    ["shipped", "Product Shipped"],
    ["active", "Rental Active"],
    ["product-received", "Product Received"],
    ["completed", "Completed"],
  ],
  sell: [
    ["technician-assigned", "Inspection Scheduled"],
    ["inspection", "Product Inspected"],
    ["inventory-added", "Added to Inventory"],
    ["published", "Published for Resale"],
    ["completed", "Completed"],
  ],
  assembly: [
    ["technician-assigned", "Staff Assigned"],
    ["inspection", "Equipment Verified"],
    ["in-progress", "Assembly Started"],
    ["optimization", "Configuration"],
    ["quality-testing", "Testing & Validation"],
    ["completed", "Assembly Completed"],
    ["ready", "Ready for Delivery"],
  ],
  support: [
    ["technician-assigned", "Ticket Assigned"],
    ["session-scheduled", "Session Scheduled"],
    ["connected", "Technician Connected"],
    ["in-progress", "In Progress"],
    ["completed", "Resolved"],
  ],
};

// Work-stage statuses a builder can set on a custom PC build.
const STAFF_PC_BUILD_STATUS_OPTIONS: [PCBuild["status"], string][] = [
  ["technician-assigned", "Technician Assigned"],
  ["assembling", "Assembly Started"],
  ["software-install", "Software Installed"],
  ["stress-test", "Stress Testing"],
  ["qc", "Quality Approved"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
];

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = Math.round((done / (total || 1)) * 100);
  return (
    <>
      <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#00cc66,#00b4ff)" }} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777" }}>{done}/{total || 1} steps synced to admin</div>
    </>
  );
}

function staffOwns(staff: StaffMember, value?: string) {
  return !value || value === staff.id || value === staff.name || value === staff.email;
}

function QueueCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <SectionCard title={title} subtitle={subtitle}>{children}</SectionCard>;
}

export function StaffOverview({ user, data, staff, onTab }: { user: AuthUser; data: any; staff: StaffMember; onTab: (tab: string) => void }) {
  const store: DashboardStore = data.store;
  const counts = [
    { label: "Repairs", value: store.repairs.filter(r => staffOwns(staff, r.technicianId)).length, tab: "repairs" },
    { label: "Upgrades", value: store.serviceRequests.filter(r => r.kind === "upgrade" && staffOwns(staff, r.technicianId)).length, tab: "upgrades" },
    { label: "Software", value: store.serviceRequests.filter(r => r.kind === "software" && staffOwns(staff, r.technicianId)).length, tab: "software" },
    { label: "Gaming Hub", value: store.gamingHub?.length || 0, tab: "gaming" },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <QueueCard title={`Welcome, ${user.name}`} subtitle={`${staff.department || "Staff"} dashboard`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {counts.map(item => (
            <button key={item.label} className="glass-card" onClick={() => onTab(item.tab)} style={{ padding: 16, textAlign: "left", cursor: "pointer" }}>
              <div style={{ color: "#888", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>{item.label}</div>
              <div style={{ color: "white", fontFamily: "'Orbitron', sans-serif", fontSize: 28 }}>{item.value}</div>
            </button>
          ))}
        </div>
      </QueueCard>
    </div>
  );
}

export function StaffTasks({ staff, store, advanceTask }: { staff: StaffMember; store: DashboardStore; advanceTask: (id: string) => void }) {
  const tasks = store.tasks.filter(task => staffOwns(staff, task.assigneeId));
  return <QueueCard title="My Tasks" subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}>
    {tasks.length ? <DataTable rowKey={(t: TaskItem) => t.id} data={tasks} columns={[
      { key: "title", label: "Task" },
      { key: "status", label: "Status", render: t => <StatusBadge status={t.status} /> },
      { key: "due", label: "Due", render: t => formatDate(t.dueAt) },
      { key: "action", label: "", render: t => <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => advanceTask(t.id)}>Update</button> },
    ]} /> : <EmptyState title="No assigned tasks" />}
  </QueueCard>;
}

function StaffRepairStatusControl({ repair, patchRepair }: { repair: Repair; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const done = (repair.timeline || []).filter(s => s.done).length;
  const total = (repair.timeline || []).length || 1;
  const percent = Math.round((done / total) * 100);
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
      <select
        value={repair.status}
        onChange={e => patchRepair(repair.id, { status: e.target.value as Repair["status"], technicianLastStatusAt: Date.now() })}
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 8px", color: "white", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {STAFF_REPAIR_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg,#00cc66,#00b4ff)" }} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777" }}>{done}/{total} steps synced to admin</div>
    </div>
  );
}

export function StaffRepairs({ staff, store, patchRepair }: { staff: StaffMember; store: DashboardStore; updateRepairStatus: any; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const rows = store.repairs.filter(repair => staffOwns(staff, repair.technicianId));
  return <QueueCard title="Assigned Repairs" subtitle={`${rows.length} repair job${rows.length === 1 ? "" : "s"} · update status to sync with admin`}>
    {rows.length ? <DataTable rowKey={(r: Repair) => r.id} data={rows} columns={[
      { key: "device", label: "Device", render: r => <span>{r.device || `${r.brand || ""} ${r.model || ""}`}</span> },
      { key: "issue", label: "Issue" },
      { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
      { key: "updated", label: "Updated", render: r => formatDate(r.technicianLastStatusAt || r.updatedAt) },
      { key: "progress", label: "Update Work Status", render: r => <StaffRepairStatusControl repair={r} patchRepair={patchRepair} /> },
    ]} /> : <EmptyState title="No assigned repairs" />}
  </QueueCard>;
}

function StaffServiceStatusControl({ request, patchServiceRequest }: { request: ServiceRequest; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const options = STAFF_SERVICE_STATUS_OPTIONS[request.kind] || [];
  const done = (request.timeline || []).filter(s => s.done).length;
  const total = (request.timeline || []).length || 1;
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
      <select
        value={request.status}
        onChange={e => patchServiceRequest(request.id, { status: e.target.value as ServiceRequest["status"], technicianLastStatusAt: Date.now() })}
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 8px", color: "white", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* keep the current status selectable even if it is not a staff work-stage */}
        {!options.some(([v]) => v === request.status) && <option value={request.status}>{request.status}</option>}
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <ProgressBar done={done} total={total} />
    </div>
  );
}

function StaffServiceQueue({ title, kind, staff, store, patchServiceRequest }: { title: string; kind: ServiceRequest["kind"]; staff: StaffMember; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const rows = store.serviceRequests.filter(request => request.kind === kind && staffOwns(staff, request.technicianId));
  return <QueueCard title={title} subtitle={`${rows.length} assigned · update status to sync with admin`}>
    {rows.length ? <DataTable rowKey={(r: ServiceRequest) => r.id} data={rows} columns={[
      { key: "title", label: "Request", render: r => <span>{r.title}</span> },
      { key: "detail", label: "Details", render: r => <span>{r.category || r.deviceType || r.serviceMethod}</span> },
      { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
      { key: "updated", label: "Updated", render: r => formatDate(r.technicianLastStatusAt || r.updatedAt) },
      { key: "progress", label: "Update Work Status", render: r => <StaffServiceStatusControl request={r} patchServiceRequest={patchServiceRequest} /> },
    ]} /> : <EmptyState title={`No assigned ${title.toLowerCase()}`} />}
  </QueueCard>;
}

export const StaffUpgrades = (props: any) => <StaffServiceQueue title="Upgrade Queue" kind="upgrade" {...props} />;
export const StaffSoftwareServices = (props: any) => <StaffServiceQueue title="Software Queue" kind="software" {...props} />;
export const StaffRentalWorkflow = (props: any) => <StaffServiceQueue title="Rental Queue" kind="rental" {...props} />;
export const StaffSellRequests = (props: any) => <StaffServiceQueue title="Sell Used Queue" kind="sell" {...props} />;
export const StaffSupportWorkflow = (props: any) => <StaffServiceQueue title="Remote Support Queue" kind="support" {...props} />;
export const StaffAssembly = (props: any) => <StaffServiceQueue title="Assembly Queue" kind="assembly" {...props} />;

function StaffPCBuildStatusControl({ build, patchPCBuild }: { build: PCBuild; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  const done = (build.timeline || []).filter(s => s.done).length;
  const total = (build.timeline || []).length || 1;
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
      <select
        value={build.status}
        onChange={e => patchPCBuild(build.id, { status: e.target.value as PCBuild["status"], technicianLastStatusAt: Date.now() })}
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 8px", color: "white", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {!STAFF_PC_BUILD_STATUS_OPTIONS.some(([v]) => v === build.status) && <option value={build.status}>{build.status}</option>}
        {STAFF_PC_BUILD_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <ProgressBar done={done} total={total} />
    </div>
  );
}

export function StaffPCBuilds({ staff, store, patchPCBuild }: { staff: StaffMember; store: DashboardStore; patchPCBuild: (id: string, patch: Partial<PCBuild>) => void }) {
  const rows = store.pcBuilds.filter(build => staffOwns(staff, build.technicianId));
  return <QueueCard title="Custom PC Builds" subtitle={`${rows.length} assigned · update status to sync with admin`}>
    {rows.length ? <DataTable rowKey={(b: PCBuild) => b.id} data={rows} columns={[
      { key: "name", label: "Build" },
      { key: "purpose", label: "Purpose" },
      { key: "status", label: "Status", render: b => <StatusBadge status={b.status} /> },
      { key: "updated", label: "Updated", render: b => formatDate(b.technicianLastStatusAt || b.updatedAt) },
      { key: "progress", label: "Update Work Status", render: b => <StaffPCBuildStatusControl build={b} patchPCBuild={patchPCBuild} /> },
    ]} /> : <EmptyState title="No assigned builds" />}
  </QueueCard>;
}

export function StaffGamingHub({ store, patchGamingHubItem }: { staff: StaffMember; store: DashboardStore; patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void }) {
  const rows = store.gamingHub || [];
  return <QueueCard title="Gaming Hub" subtitle="Review drafts, content, and comments assigned by admin">
    {rows.length ? <DataTable rowKey={(item: GamingHubItem) => item.id} data={rows} columns={[
      { key: "title", label: "Content" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status", render: item => <StatusBadge status={item.status} /> },
      { key: "comments", label: "Pending Comments", render: item => (item.comments || []).filter(c => c.status === "pending").length },
      { key: "action", label: "", render: item => <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => patchGamingHubItem(item.id, { updatedAt: Date.now() })}>Mark Reviewed</button> },
    ]} /> : <EmptyState title="No Gaming Hub content yet" />}
  </QueueCard>;
}

export const StaffRemoteSupport = StaffSupportWorkflow;
export const StaffDeliveries = ({ store }: { staff: StaffMember; store: DashboardStore }) => <QueueCard title="Deliveries"><EmptyState title={`${store.deliveries.length} delivery tasks in system`} /></QueueCard>;
export const StaffInventoryRequests = ({ store }: { staff: StaffMember; store: DashboardStore; submitInventoryRequest: any }) => <QueueCard title="Inventory Requests"><EmptyState title={`${store.inventoryRequests.length} inventory requests in system`} /></QueueCard>;
export const StaffAttendance = ({ staff }: { staff: StaffMember; store: DashboardStore; clockIn: any; clockOut: any }) => <QueueCard title="Attendance"><p style={{ color: "#ccc" }}>{staff.name} attendance tools are ready.</p></QueueCard>;
export const StaffPerformance = ({ staff }: { staff: StaffMember }) => <QueueCard title="Performance"><p style={{ color: "#ccc" }}>{staff.performance.jobs} jobs · {staff.performance.rating} rating · {staff.performance.attendancePct}% attendance</p></QueueCard>;
export const StaffNotifications = ({ store }: { user: AuthUser; store: DashboardStore; markRead: any; archive: any }) => <QueueCard title="Notifications"><EmptyState title={`${store.notifications.length} notifications in system`} /></QueueCard>;
export const StaffProfile = ({ user, staff }: { user: AuthUser; staff: StaffMember }) => <QueueCard title="Profile"><p style={{ color: "#ccc" }}>{user.name} · {staff.email}</p></QueueCard>;
