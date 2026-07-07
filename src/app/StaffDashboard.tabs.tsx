import { useState, useMemo } from "react";
import { CheckCircle, Circle, Clock, AlertCircle, Bell, Archive, Trash2, Eye, Search, Filter, Calendar, TrendingUp, Award, Target, Zap, Activity, User, Mail, Phone, Building2, Briefcase, Star, Save, X, LogIn, LogOut, Truck, MapPin, ShoppingBag } from "lucide-react";
import type { AuthUser } from "./lib/currentUser";
import type { DashboardStore, GamingHubItem, GamingHubComment, PCBuild, Repair, ServiceRequest, StaffMember, TaskItem, AttendanceLog, InventoryRequest, Delivery } from "./lib/dashboardData";
import { SectionCard } from "./components/dashboard/SectionCard";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { EmptyState } from "./components/dashboard/EmptyState";
import { DataTable } from "./components/dashboard/DataTable";
import { KPICard } from "./components/dashboard/KPICard";
import { toast } from "sonner";

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const formatDate = (value?: number) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending";
const formatTime = (value?: number) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--:--";
const formatDateTime = (value?: number) => value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Pending";

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

function QueueCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <SectionCard title={title} subtitle={subtitle} action={action}>{children}</SectionCard>;
}

// ─── Staff Overview ─────────────────────────────────────────────────────────

export function StaffOverview({ user, data, staff, onTab }: { user: AuthUser; data: any; staff: StaffMember; onTab: (tab: string) => void }) {
  const store: DashboardStore = data.store;
  const myStaffId = staff?.id || "stf_unknown";

  // Calculate stats for staff
  const repairs = store.repairs.filter(r => staffOwns(staff, r.technicianId));
  const upgrades = store.serviceRequests.filter(r => r.kind === "upgrade" && staffOwns(staff, r.technicianId));
  const software = store.serviceRequests.filter(r => r.kind === "software" && staffOwns(staff, r.technicianId));
  const pcBuilds = store.pcBuilds.filter(b => staffOwns(staff, b.technicianId));
  const tasks = store.tasks.filter(t => staffOwns(staff, t.assigneeId));
  const notifications = store.notifications.filter(n => !n.read && !n.archived && (n.staffId === myStaffId || n.audience === "staff" || n.audience === "all"));

  // Active jobs count
  const activeRepairs = repairs.filter(r => !["completed", "delivered", "closed", "ready"].includes(r.status)).length;
  const activeUpgrades = upgrades.filter(r => !["completed", "delivered", "closed", "ready"].includes(r.status)).length;
  const activeSoftware = software.filter(r => !["completed", "delivered", "closed", "ready"].includes(r.status)).length;
  const activeBuilds = pcBuilds.filter(b => !["completed", "delivered", "closed", "ready"].includes(b.status)).length;

  // Today's tasks
  const todayTasks = tasks.filter(t => {
    const dueDate = new Date(t.dueAt).toDateString();
    const today = new Date().toDateString();
    return dueDate === today;
  });

  // Recent activity (last 5 audit logs for this staff)
  const myLogs = store.auditLogs.filter(l => l.actor === myStaffId).slice(0, 5);

  const statCards = [
    { label: "Active Repairs", value: activeRepairs, tab: "repairs", color: "#FF1F45" },
    { label: "Upgrades", value: activeUpgrades, tab: "upgrades", color: "#00cc66" },
    { label: "Software Jobs", value: activeSoftware, tab: "software", color: "#00b4ff" },
    { label: "PC Builds", value: activeBuilds, tab: "builds", color: "#a855f7" },
  ];

  const pendingTasks = todayTasks.filter(t => t.status !== "done").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Welcome Header */}
      <QueueCard title={`Welcome back, ${user.name}`} subtitle={`${staff.department || "Staff"} dashboard · ${notifications.length} unread notifications`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {statCards.map(item => (
            <button
              key={item.label}
              className="glass-card"
              onClick={() => onTab(item.tab)}
              style={{ padding: 16, textAlign: "left", cursor: "pointer", borderLeft: `3px solid ${item.color}`, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            >
              <div style={{ color: "#888", fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
              <div style={{ color: "white", fontFamily: "'Orbitron', sans-serif", fontSize: 32, fontWeight: 700 }}>{item.value}</div>
            </button>
          ))}
        </div>
      </QueueCard>

      {/* Quick Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {/* Tasks Summary */}
        <QueueCard title="Today's Tasks" subtitle={`${pendingTasks} pending`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: pendingTasks > 0 ? "rgba(255,107,0,0.2)" : "rgba(0,204,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={24} color={pendingTasks > 0 ? "#ff6b00" : "#00cc66"} />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                {pendingTasks}
                {tasks.filter(t => t.status !== "done" && t.dueAt < Date.now()).length > 0 && (
                  <span style={{ fontSize: 10, background: "#ff4444", color: "white", padding: "2px 6px", borderRadius: 4, fontFamily: "'Space Grotesk', sans-serif" }}>URGENT</span>
                )}
              </div>
              <div style={{ color: "#888", fontSize: 12 }}>tasks remaining</div>
            </div>
          </div>
          <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => onTab("tasks")} style={{ width: "100%" }}>
            View All Tasks
          </button>
        </QueueCard>

        {/* Notifications Summary */}
        <QueueCard title="Notifications" subtitle={`${notifications.length} unread`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: notifications.length > 0 ? "rgba(255,31,69,0.2)" : "rgba(0,204,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={24} color={notifications.length > 0 ? "#FF1F45" : "#00cc66"} />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white" }}>{notifications.length}</div>
              <div style={{ color: "#888", fontSize: 12 }}>unread alerts</div>
            </div>
          </div>
          <button className="glass-pill glass-pill-sm glass-pill-info" onClick={() => onTab("notifications")} style={{ width: "100%" }}>
            View Notifications
          </button>
        </QueueCard>

        {/* Performance Summary */}
        <QueueCard title="My Performance" subtitle="This month">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={24} color="#a855f7" />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white" }}>{staff.performance.jobs}</div>
              <div style={{ color: "#888", fontSize: 12 }}>jobs completed</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ffd700", fontFamily: "'Orbitron', sans-serif", fontSize: 16 }}>{staff.performance.rating}★</div>
              <div style={{ color: "#666", fontSize: 10 }}>Rating</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#00cc66", fontFamily: "'Orbitron', sans-serif", fontSize: 16 }}>{staff.performance.attendancePct}%</div>
              <div style={{ color: "#666", fontSize: 10 }}>Attendance</div>
            </div>
          </div>
        </QueueCard>
      </div>

      {/* Recent Activity */}
      {myLogs.length > 0 && (
        <QueueCard title="Recent Activity" subtitle="Your latest actions">
          <div style={{ display: "grid", gap: 8 }}>
            {myLogs.map(log => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00b4ff" }} />
                <div style={{ flex: 1, color: "#ccc", fontSize: 13 }}>{log.detail}</div>
                <div style={{ color: "#666", fontSize: 11 }}>{formatDateTime(log.at)}</div>
              </div>
            ))}
          </div>
        </QueueCard>
      )}
    </div>
  );
}

// ─── Staff Tasks ────────────────────────────────────────────────────────────

export function StaffTasks({ staff, store, advanceTask }: { staff: StaffMember; store: DashboardStore; advanceTask: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | "todo" | "in-progress" | "done">("all");
  const [showUpdateModal, setShowUpdateModal] = useState<TaskItem | null>(null);
  const tasks = store.tasks.filter(task => staffOwns(staff, task.assigneeId));

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const handleAdvance = (task: TaskItem) => {
    advanceTask(task.id);
    toast.success(`Task marked as ${task.status === "todo" ? "in progress" : task.status === "in-progress" ? "done" : task.status}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "#ff6b00";
      case "in-progress": return "#00b4ff";
      case "done": return "#00cc66";
      default: return "#888";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo": return <Circle size={16} />;
      case "in-progress": return <Activity size={16} />;
      case "done": return <CheckCircle size={16} />;
      default: return <Circle size={16} />;
    }
  };

  const isOverdue = (task: TaskItem) => task.status !== "done" && task.dueAt < Date.now();

  return (
    <QueueCard
      title="My Tasks"
      subtitle={`${tasks.length} total tasks · ${tasks.filter(t => t.status !== "done").length} pending`}
      action={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "todo", "in-progress", "done"] as const).map(f => (
            <button
              key={f}
              className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f === "all" ? "All" : f === "in-progress" ? "In Progress" : f}
            </button>
          ))}
        </div>
      }
    >
      {filteredTasks.length === 0 ? (
        <EmptyState title="No tasks found" subtitle={filter !== "all" ? `No ${filter.replace("-", " ")} tasks` : "You're all caught up!"} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="glass-card"
              style={{
                padding: 16,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 16,
                alignItems: "center",
                borderLeft: `3px solid ${getStatusColor(task.status)}`,
              }}
            >
              <div style={{ color: getStatusColor(task.status) }}>{getStatusIcon(task.status)}</div>
              <div>
                <div style={{ color: "white", fontWeight: 500, marginBottom: 4 }}>{task.title}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{task.detail}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: isOverdue(task) ? "#ff4444" : "#888", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} />
                  {formatDate(task.dueAt)}
                </div>
                {isOverdue(task) && <div style={{ color: "#ff4444", fontSize: 11 }}>Overdue!</div>}
              </div>
              {task.status !== "done" && (
                <button
                  className="glass-pill glass-pill-sm glass-pill-primary"
                  onClick={() => handleAdvance(task)}
                  style={{ minWidth: 80 }}
                >
                  {task.status === "todo" ? "Start" : task.status === "in-progress" ? "Complete" : "Done"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </QueueCard>
  );
}

// ─── Staff Notifications ───────────────────────────────────────────────────

export function StaffNotifications({ user, store, markRead, archive }: { user: AuthUser; store: DashboardStore; markRead: any; archive: any }) {
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const myStaffId = user.id;

  const myNotifications = useMemo(() => {
    return store.notifications.filter(n =>
      !n.archived && (n.staffId === myStaffId || n.audience === "staff" || n.audience === "all")
    );
  }, [store.notifications, myStaffId]);

  const filtered = filter === "unread" ? myNotifications.filter(n => !n.read) : myNotifications;
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order": return <Briefcase size={16} />;
      case "repair": return <Zap size={16} />;
      case "rental": return <Calendar size={16} />;
      case "support": return <Activity size={16} />;
      case "offer": return <Star size={16} />;
      case "warranty": return <Award size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "order": return "#00b4ff";
      case "repair": return "#FF1F45";
      case "rental": return "#a855f7";
      case "support": return "#00cc66";
      case "offer": return "#ffd700";
      case "warranty": return "#ff6b00";
      default: return "#888";
    }
  };

  return (
    <QueueCard
      title="Notifications"
      subtitle={`${unreadCount} unread of ${myNotifications.length} total`}
      action={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["unread", "all"] as const).map(f => (
            <button
              key={f}
              className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : "Unread"}
              {f === "unread" && unreadCount > 0 && (
                <span style={{ marginLeft: 6, background: "#FF1F45", color: "white", borderRadius: 999, padding: "2px 6px", fontSize: 10 }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState title="No notifications" subtitle={filter === "unread" ? "You're all caught up!" : "No notifications yet"} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(notif => (
            <div
              key={notif.id}
              className="glass-card"
              style={{
                padding: 16,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "start",
                background: notif.read ? "rgba(255,255,255,0.02)" : "rgba(0,180,255,0.05)",
                borderLeft: `3px solid ${getTypeColor(notif.type)}`,
              }}
            >
              <div style={{ color: getTypeColor(notif.type), paddingTop: 2 }}>{getTypeIcon(notif.type)}</div>
              <div>
                <div style={{ color: notif.read ? "#888" : "white", fontWeight: notif.read ? 400 : 500, marginBottom: 4 }}>{notif.title}</div>
                <div style={{ color: "#666", fontSize: 13 }}>{notif.detail}</div>
                <div style={{ color: "#555", fontSize: 11, marginTop: 8 }}>{formatDateTime(notif.createdAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!notif.read && (
                  <button
                    className="glass-pill glass-pill-sm glass-pill-outline"
                    onClick={() => markRead(notif.id)}
                    title="Mark as read"
                    style={{ padding: "6px 10px" }}
                  >
                    <Eye size={14} />
                  </button>
                )}
                <button
                  className="glass-pill glass-pill-sm glass-pill-outline"
                  onClick={() => archive(notif.id)}
                  title="Archive"
                  style={{ padding: "6px 10px" }}
                >
                  <Archive size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </QueueCard>
  );
}

// ─── Staff Attendance ───────────────────────────────────────────────────────

export function StaffAttendance({ staff, store, clockIn, clockOut }: { staff: StaffMember; store: DashboardStore; clockIn: any; clockOut: any }) {
  const myStaffId = staff?.id || "stf_unknown";
  const today = new Date().toISOString().slice(0, 10);

  // Get attendance records for this staff
  const myAttendance = useMemo(() => {
    return store.attendance
      .filter(a => a.staffId === myStaffId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [store.attendance, myStaffId]);

  // Today's record
  const todayRecord = myAttendance.find(a => a.date === today);

  // Calculate stats
  const thisWeek = myAttendance.slice(0, 7);
  const avgHours = thisWeek.length > 0
    ? thisWeek.reduce((sum, a) => sum + a.hours, 0) / thisWeek.length
    : 0;
  const daysPresent = thisWeek.filter(a => a.clockIn).length;

  const handleClockIn = () => {
    clockIn(myStaffId);
    toast.success("Clocked in successfully!");
  };

  const handleClockOut = () => {
    if (!todayRecord?.clockIn) {
      toast.error("Please clock in first");
      return;
    }
    clockOut(myStaffId);
    toast.success("Clocked out successfully!");
  };

  // Calculate hours for today if clocked in
  const todayHours = todayRecord?.clockIn
    ? todayRecord.clockOut
      ? todayRecord.hours
      : Math.round((Date.now() - todayRecord.clockIn) / 3600000 * 10) / 10
    : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Clock In/Out Card */}
      <QueueCard title="Time Tracking" subtitle="Track your work hours">
        <div className="two-col-workflow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, fontFamily: "'Orbitron', sans-serif", color: "white", marginBottom: 8 }}>
              {todayRecord?.clockIn ? formatTime(todayRecord.clockIn) : "--:--"}
            </div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>Clock In Time</div>

            {!todayRecord?.clockIn ? (
              <button className="glass-pill glass-pill-primary" onClick={handleClockIn} style={{ padding: "12px 32px", fontSize: 14 }}>
                <LogIn size={16} style={{ marginRight: 8 }} />
                Clock In
              </button>
            ) : !todayRecord?.clockOut ? (
              <button className="glass-pill glass-pill-primary" onClick={handleClockOut} style={{ padding: "12px 32px", fontSize: 14, background: "rgba(255,31,69,0.3)", borderColor: "#FF1F45" }}>
                <LogOut size={16} style={{ marginRight: 8 }} />
                Clock Out
              </button>
            ) : (
              <div className="glass-pill" style={{ padding: "12px 32px", background: "rgba(0,204,102,0.2)", borderColor: "#00cc66", color: "#00cc66" }}>
                <CheckCircle size={16} style={{ marginRight: 8 }} />
                Completed
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 32, color: "#00b4ff" }}>
                {todayRecord?.clockOut ? todayRecord.hours.toFixed(1) : todayHours.toFixed(1)}
              </div>
              <div style={{ color: "#888", fontSize: 12 }}>Hours Today</div>
            </div>
            <div className="glass-card" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 32, color: "#00cc66" }}>
                {avgHours.toFixed(1)}
              </div>
              <div style={{ color: "#888", fontSize: 12 }}>Avg Hours/Week</div>
            </div>
          </div>
        </div>
      </QueueCard>

      {/* Weekly Summary */}
      <QueueCard title="This Week" subtitle={`${daysPresent}/7 days present · ${avgHours.toFixed(1)} avg hours`}>
        <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(44px, 1fr))", gap: 8, minWidth: 340 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
            const dayRecord = thisWeek[i];
            const hasData = !!dayRecord?.clockIn;
            return (
              <div key={day} style={{ textAlign: "center" }}>
                <div style={{ color: "#666", fontSize: 11, marginBottom: 8 }}>{day}</div>
                <div
                  className="glass-card"
                  style={{
                    padding: 12,
                    background: hasData ? "rgba(0,204,102,0.1)" : "rgba(255,255,255,0.02)",
                    border: hasData ? "1px solid rgba(0,204,102,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {hasData ? (
                    <>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "#00cc66" }}>
                        {dayRecord.hours.toFixed(1)}h
                      </div>
                      <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>
                        {formatTime(dayRecord.clockIn)?.slice(0, 5)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#444", fontSize: 12 }}>--</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </QueueCard>

      {/* Attendance History */}
      <QueueCard title="Attendance History" subtitle={`${myAttendance.length} records`}>
        {myAttendance.length === 0 ? (
          <EmptyState title="No attendance records" subtitle="Clock in to start tracking" />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {myAttendance.slice(0, 14).map(record => (
              <div
                key={record.date}
                className="glass-card"
                style={{
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <Calendar size={16} color="#666" />
                <div style={{ color: "#ccc" }}>{formatDate(new Date(record.date + "T00:00:00").getTime())}</div>
                <div style={{ color: record.clockIn ? "#00cc66" : "#888", fontSize: 12 }}>
                  {record.clockIn ? `In: ${formatTime(record.clockIn)}` : "Absent"}
                </div>
                <div style={{ color: record.clockOut ? "#FF1F45" : "#888", fontSize: 12 }}>
                  {record.clockOut ? `Out: ${formatTime(record.clockOut)}` : "..."}
                </div>
                <div style={{
                  fontFamily: "'Orbitron', sans-serif",
                  color: record.hours >= 8 ? "#00cc66" : record.hours > 0 ? "#ff6b00" : "#888",
                  fontSize: 14,
                }}>
                  {record.hours.toFixed(1)}h
                </div>
              </div>
            ))}
          </div>
        )}
      </QueueCard>
    </div>
  );
}

// ─── Staff Performance ──────────────────────────────────────────────────────

export function StaffPerformance({ staff }: { staff: StaffMember }) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  // Simulated performance data (in real app, this would come from store)
  const performanceData = [
    { label: "Jobs Completed", value: staff.performance.jobs, icon: <Briefcase size={20} />, color: "#00cc66" },
    { label: "Customer Rating", value: `${staff.performance.rating}★`, icon: <Star size={20} />, color: "#ffd700" },
    { label: "Attendance Rate", value: `${staff.performance.attendancePct}%`, icon: <Calendar size={20} />, color: "#00b4ff" },
    { label: "Response Time", value: "<2hrs", icon: <Zap size={20} />, color: "#a855f7" },
  ];

  // Weekly jobs data (simulated)
  const weeklyJobs = [
    { day: "Mon", jobs: 3 },
    { day: "Tue", jobs: 5 },
    { day: "Wed", jobs: 2 },
    { day: "Thu", jobs: 4 },
    { day: "Fri", jobs: 6 },
    { day: "Sat", jobs: 1 },
    { day: "Sun", jobs: 0 },
  ];
  const maxJobs = Math.max(...weeklyJobs.map(d => d.jobs), 1);

  // Service breakdown (simulated)
  const serviceBreakdown = [
    { type: "Repairs", count: 45, color: "#FF1F45" },
    { type: "Upgrades", count: 28, color: "#00cc66" },
    { type: "Software", count: 22, color: "#00b4ff" },
    { type: "Assembly", count: 15, color: "#a855f7" },
  ];
  const totalServices = serviceBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Key Metrics */}
      <QueueCard title="Performance Overview" subtitle="Your key metrics">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {performanceData.map(metric => (
            <div key={metric.label} className="glass-card" style={{ padding: 20, textAlign: "center", borderTop: `3px solid ${metric.color}` }}>
              <div style={{ color: metric.color, marginBottom: 12 }}>{metric.icon}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white", marginBottom: 4 }}>{metric.value}</div>
              <div style={{ color: "#888", fontSize: 12 }}>{metric.label}</div>
            </div>
          ))}
        </div>
      </QueueCard>

      {/* Weekly Activity Chart */}
      <QueueCard title="Weekly Activity" subtitle="Jobs completed this week">
        <div className="two-col-workflow" style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150 }}>
            {weeklyJobs.map(day => (
              <div key={day.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: "100%",
                    height: `${(day.jobs / maxJobs) * 120}px`,
                    background: day.jobs > 0 ? "linear-gradient(180deg, #00b4ff, #00cc66)" : "rgba(255,255,255,0.1)",
                    borderRadius: "4px 4px 0 0",
                    minHeight: 4,
                  }}
                />
                <div style={{ color: "#888", fontSize: 11 }}>{day.day}</div>
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Total This Week</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 32, color: "#00b4ff" }}>
              {weeklyJobs.reduce((sum, d) => sum + d.jobs, 0)}
            </div>
            <div style={{ color: "#666", fontSize: 11 }}>jobs completed</div>
          </div>
        </div>
      </QueueCard>

      {/* Service Breakdown */}
      <QueueCard title="Service Breakdown" subtitle="Work distribution by type">
        <div className="two-col-workflow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {serviceBreakdown.map(service => (
              <div key={service.type} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#ccc", fontSize: 13 }}>{service.type}</span>
                  <span style={{ color: "white", fontSize: 13 }}>{service.count}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(service.count / totalServices) * 100}%`,
                      height: "100%",
                      background: service.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Top Performance</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Award size={24} color="#ffd700" />
              <div>
                <div style={{ color: "white", fontWeight: 500 }}>Customer Satisfaction</div>
                <div style={{ color: "#00cc66", fontFamily: "'Orbitron', sans-serif", fontSize: 20 }}>
                  {staff.performance.rating}/5.0
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={20}
                  fill={star <= Math.round(staff.performance.rating) ? "#ffd700" : "none"}
                  color="#ffd700"
                />
              ))}
            </div>
          </div>
        </div>
      </QueueCard>

      {/* Goals */}
      <QueueCard title="Goals & Targets" subtitle="Monthly targets">
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { label: "Monthly Jobs", current: 45, target: 60, color: "#00cc66" },
            { label: "Customer Rating", current: staff.performance.rating, target: 5, color: "#ffd700", suffix: "★" },
            { label: "Attendance", current: staff.performance.attendancePct, target: 100, color: "#00b4ff", suffix: "%" },
          ].map(goal => (
            <div key={goal.label} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#ccc" }}>{goal.label}</span>
                <span style={{ color: "white", fontFamily: "'Orbitron', sans-serif" }}>
                  {goal.current}{goal.suffix || ""} / {goal.target}{goal.suffix || ""}
                </span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                    height: "100%",
                    background: goal.color,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </QueueCard>
    </div>
  );
}

// ─── Staff Profile ──────────────────────────────────────────────────────────

export function StaffProfile({ user, staff }: { user: AuthUser; staff: StaffMember }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || "",
    department: staff.department,
  });

  const handleSave = () => {
    // In a real app, this would update the user profile via API
    toast.success("Profile updated successfully!");
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ name: user.name, phone: user.phone || "", department: staff.department });
    setEditing(false);
  };

  const infoFields = [
    { icon: <User size={18} />, label: "Full Name", value: user.name, field: "name" },
    { icon: <Mail size={18} />, label: "Email", value: user.email },
    { icon: <Phone size={18} />, label: "Phone", value: user.phone || "Not set", field: "phone" },
    { icon: <Building2 size={18} />, label: "Department", value: staff.department, field: "department" },
    { icon: <Briefcase size={18} />, label: "Role", value: staff.role.charAt(0).toUpperCase() + staff.role.slice(1) },
    { icon: <Calendar size={18} />, label: "Joined", value: formatDate(staff.joinedAt) },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Profile Header */}
      <QueueCard title="My Profile" subtitle="Manage your personal information" action={
        editing ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={handleCancel}>
              <X size={14} style={{ marginRight: 4 }} /> Cancel
            </button>
            <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={handleSave}>
              <Save size={14} style={{ marginRight: 4 }} /> Save
            </button>
          </div>
        ) : (
          <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )
      }>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF1F45, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 36,
              color: "white",
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#00cc66",
              border: "3px solid #0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <CheckCircle size={16} color="white" />
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gap: 16 }}>
            {infoFields.map(field => (
              <div key={field.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: "#666", width: 24 }}>{field.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#888", fontSize: 11, marginBottom: 2 }}>{field.label}</div>
                  {editing && field.field ? (
                    <input
                      type="text"
                      value={form[field.field as keyof typeof form] || ""}
                      onChange={e => setForm(f => ({ ...f, [field.field!]: e.target.value }))}
                      className="glass-input"
                      style={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        padding: "8px 12px",
                        color: "white",
                        fontSize: 14,
                        width: "100%",
                      }}
                    />
                  ) : (
                    <div style={{ color: "white", fontSize: 14 }}>{field.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </QueueCard>

      {/* Quick Links */}
      <QueueCard title="Quick Actions" subtitle="Frequently used features">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          {[
            { icon: <Bell size={20} />, label: "Notifications", color: "#FF1F45" },
            { icon: <Calendar size={20} />, label: "Attendance", color: "#00b4ff" },
            { icon: <TrendingUp size={20} />, label: "Performance", color: "#00cc66" },
            { icon: <Activity size={20} />, label: "My Tasks", color: "#a855f7" },
          ].map(action => (
            <button
              key={action.label}
              className="glass-card"
              style={{
                padding: 16,
                textAlign: "center",
                cursor: "pointer",
                borderTop: `3px solid ${action.color}`,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            >
              <div style={{ color: action.color, marginBottom: 8 }}>{action.icon}</div>
              <div style={{ color: "#ccc", fontSize: 13 }}>{action.label}</div>
            </button>
          ))}
        </div>
      </QueueCard>

      {/* Account Security */}
      <QueueCard title="Account Security" subtitle="Manage your login credentials">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="glass-card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "white", marginBottom: 4 }}>Password</div>
              <div style={{ color: "#888", fontSize: 12 }}>Last changed: Never (demo mode)</div>
            </div>
            <button className="glass-pill glass-pill-sm glass-pill-outline">Change</button>
          </div>
          <div className="glass-card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "white", marginBottom: 4 }}>Two-Factor Authentication</div>
              <div style={{ color: "#888", fontSize: 12 }}>Not enabled</div>
            </div>
            <button className="glass-pill glass-pill-sm glass-pill-primary">Enable</button>
          </div>
        </div>
      </QueueCard>
    </div>
  );
}

// ─── Helper Components & Exports ───────────────────────────────────────────

function StaffRepairStatusControl({ repair, patchRepair }: { repair: Repair; patchRepair: (id: string, patch: Partial<Repair>) => void }) {
  const done = (repair.timeline || []).filter(s => s.done).length;
  const total = (repair.timeline || []).length || 1;
  const percent = Math.round((done / total) * 100);
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
      <select
        value={repair.status}
        onChange={e => {
          patchRepair(repair.id, { status: e.target.value as Repair["status"], technicianLastStatusAt: Date.now() });
          toast.success(`Status updated to ${e.target.options[e.target.selectedIndex].text}`);
        }}
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
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMine = store.repairs.filter(repair => staffOwns(staff, repair.technicianId));
  const active = allMine.filter(r => !["completed", "delivered", "closed", "ready"].includes(r.status));
  const completed = allMine.filter(r => ["completed", "delivered", "closed", "ready"].includes(r.status));

  const filtered = filter === "all" ? allMine : filter === "active" ? active : completed;

  const FILTERS = ["all", "active", "completed"] as const;

  return (
    <QueueCard
      title="Assigned Repairs"
      subtitle={`${allMine.length} repair job${allMine.length === 1 ? "" : "s"} · ${active.length} active`}
      action={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize", fontSize: 11 }}
            >
              {f}{filter === f ? ` (${filter === "all" ? allMine.length : filter === "active" ? active.length : completed.length})` : ""}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState title={filter === "completed" ? "No completed repairs" : "No assigned repairs"} />
      ) : (
        <DataTable
          rowKey={(r: Repair) => r.id}
          data={filtered}
          columns={[
            {
              key: "device",
              label: "Device",
              render: r => (
                <div>
                  <div style={{ color: "white", fontWeight: 500, marginBottom: 2 }}>{r.device || `${r.brand || ""} ${r.model || ""}`}</div>
                  <div style={{ color: "#888", fontSize: 11 }}>Serial: {r.serialNumber || "N/A"}</div>
                </div>
              ),
            },
            {
              key: "customer",
              label: "Customer",
              render: r => (
                <div>
                  <div style={{ color: "#ccc", fontSize: 13 }}>{r.customerName || "Walk-in"}</div>
                  {r.contactPhone && <div style={{ color: "#666", fontSize: 11 }}>{r.contactPhone}</div>}
                </div>
              ),
            },
            { key: "issue", label: "Issue", render: r => <span style={{ color: "#ddd", fontSize: 12 }}>{r.issue?.slice(0, 40) || "N/A"}{r.issue && r.issue.length > 40 ? "..." : ""}</span> },
            { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
            { key: "updated", label: "Updated", render: r => <span style={{ color: "#888", fontSize: 12 }}>{formatDate(r.technicianLastStatusAt || r.updatedAt)}</span> },
            {
              key: "progress",
              label: "Update Status",
              render: r => <StaffRepairStatusControl repair={r} patchRepair={patchRepair} />,
            },
            {
              key: "expand",
              label: "",
              render: r => (
                <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={{ padding: "4px 8px" }}>
                  {expandedId === r.id ? "Hide" : "Details"}
                </button>
              ),
            },
          ]}
        />
      )}

      {expandedId && (() => {
        const r = filtered.find(x => x.id === expandedId);
        if (!r) return null;
        const pendingChecks = (r.qualityChecks || []).filter(c => !c.done);
        return (
          <div className="glass-card" style={{ marginTop: 16, padding: 20, border: "1px solid rgba(255,31,69,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h3 style={{ color: "#FF1F45", margin: 0, marginBottom: 8 }}>{r.device}</h3>
                <div style={{ color: "#ccc", fontSize: 13 }}>
                  <span>{r.brand} {r.model}</span> · <span>{r.deviceType}</span>
                </div>
              </div>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(null)} style={{ padding: "4px 8px" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>CUSTOMER</div>
                <div style={{ color: "white", fontWeight: 500 }}>{r.customerName || "Walk-in"}</div>
                {r.contactPhone && <div style={{ color: "#888", fontSize: 12 }}>{r.contactPhone}</div>}
                {r.contactEmail && <div style={{ color: "#666", fontSize: 11 }}>{r.contactEmail}</div>}
              </div>
              <div>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>SERVICE TYPE</div>
                <div style={{ color: "#00b4ff", fontWeight: 500 }}>{r.serviceType || "Shop Visit"}</div>
                {r.preferredSlot && <div style={{ color: "#888", fontSize: 12 }}>{r.preferredSlot}</div>}
              </div>
              <div>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>ESTIMATED CHARGE</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 16 }}>{r.quotation ? `₹${r.quotation.toLocaleString()}` : r.estimatedCharge ? `₹${r.estimatedCharge}` : "Pending"}</div>
                {r.advancePaid && <div style={{ color: "#00cc66", fontSize: 11 }}>Advance: ₹{r.advancePaid.toLocaleString()}</div>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>ISSUE DESCRIPTION</div>
              <div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.4, background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 6 }}>
                {r.issue || "No description provided"}
              </div>
            </div>

            {r.diagnosisReport && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>DIAGNOSIS REPORT</div>
                <div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.4, background: "rgba(0,180,255,0.08)", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(0,180,255,0.2)" }}>
                  {r.diagnosisReport}
                </div>
              </div>
            )}

            {r.partsRequired && r.partsRequired.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>PARTS REQUIRED</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {r.partsRequired.map((part, i) => (
                    <div key={i} className="glass-card" style={{ padding: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#ccc" }}>{part.name}</span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", color: "white" }}>₹{part.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {r.qualityChecks && r.qualityChecks.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ color: pendingChecks.length > 0 ? "#ff6b00" : "#00cc66", fontSize: 10, fontWeight: 600 }}>QUALITY CHECKS ({r.qualityChecks.length - pendingChecks.length}/{r.qualityChecks.length} COMPLETED)</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{Math.round(((r.qualityChecks.length - pendingChecks.length) / Math.max(1, r.qualityChecks.length)) * 100)}%</div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {r.qualityChecks.map((check, i) => (
                    <label key={i} className="glass-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, border: check.done ? "1px solid rgba(0,204,102,0.2)" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={check.done} 
                        onChange={e => {
                          const updatedChecks = [...r.qualityChecks!];
                          updatedChecks[i].done = e.target.checked;
                          patchRepair(r.id, { qualityChecks: updatedChecks });
                          toast.success("Checklist synced");
                        }} 
                      />
                      <span style={{ color: check.done ? "#00cc66" : "#ccc", fontSize: 12, textDecoration: check.done ? "line-through" : "none" }}>{check.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>TECHNICIAN NOTES (SYNCED TO ADMIN)</div>
              <textarea 
                value={r.technicianNotes || ""} 
                onChange={e => patchRepair(r.id, { technicianNotes: e.target.value })}
                placeholder="Add internal notes about this repair..."
                style={{ width: "100%", height: 80, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px", color: "white", fontSize: 12, resize: "vertical", fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>

            <div>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>TIMELINE PROGRESS</div>
              <ProgressBar done={(r.timeline || []).filter(t => t.done).length} total={(r.timeline || []).length} />
            </div>
          </div>
        );
      })()}
    </QueueCard>
  );
}

function StaffServiceStatusControl({ request, patchServiceRequest }: { request: ServiceRequest; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const options = STAFF_SERVICE_STATUS_OPTIONS[request.kind] || [];
  const done = (request.timeline || []).filter(s => s.done).length;
  const total = (request.timeline || []).length || 1;
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 200 }}>
      <select
        value={request.status}
        onChange={e => {
          patchServiceRequest(request.id, { status: e.target.value as ServiceRequest["status"], technicianLastStatusAt: Date.now() });
          toast.success(`Status updated to ${e.target.options[e.target.selectedIndex].text}`);
        }}
        style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 8px", color: "white", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {!options.some(([v]) => v === request.status) && <option value={request.status}>{request.status}</option>}
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <ProgressBar done={done} total={total} />
    </div>
  );
}

function StaffServiceQueue({ title, kind, staff, store, patchServiceRequest }: { title: string; kind: ServiceRequest["kind"]; staff: StaffMember; store: DashboardStore; patchServiceRequest: (id: string, patch: Partial<ServiceRequest>) => void }) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMine = store.serviceRequests.filter(request => request.kind === kind && staffOwns(staff, request.technicianId));
  const active = allMine.filter(r => !["completed", "delivered", "closed", "ready"].includes(r.status));
  const completed = allMine.filter(r => ["completed", "delivered", "closed", "ready"].includes(r.status));
  const filtered = filter === "all" ? allMine : filter === "active" ? active : completed;

  const FILTERS = ["all", "active", "completed"] as const;

  return (
    <QueueCard
      title={title}
      subtitle={`${allMine.length} assigned · ${active.length} active`}
      action={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`} onClick={() => setFilter(f)} style={{ textTransform: "capitalize", fontSize: 11 }}>
              {f}{filter === f ? ` (${filter === "all" ? allMine.length : filter === "active" ? active.length : completed.length})` : ""}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? <EmptyState title={filter === "completed" ? `No completed ${title.toLowerCase()}` : `No assigned ${title.toLowerCase()}`} /> : (
        <DataTable
          rowKey={(r: ServiceRequest) => r.id}
          data={filtered}
          columns={[
            { key: "title", label: "Request", render: r => <div><div style={{ color: "white", fontWeight: 500 }}>{r.title}</div>{r.category && <div style={{ color: "#666", fontSize: 11 }}>{r.category}</div>}</div> },
            { key: "customer", label: "Customer", render: r => <div><div style={{ color: "#ccc", fontSize: 13 }}>{r.customerName || "Walk-in"}</div>{r.contactPhone && <div style={{ color: "#666", fontSize: 11 }}>{r.contactPhone}</div>}</div> },
            { key: "method", label: "Method", render: r => <span style={{ color: "#888", fontSize: 12 }}>{r.serviceMethod}</span> },
            { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
            { key: "updated", label: "Updated", render: r => <span style={{ color: "#888", fontSize: 12 }}>{formatDate(r.technicianLastStatusAt || r.updatedAt)}</span> },
            { key: "progress", label: "Update Status", render: r => <StaffServiceStatusControl request={r} patchServiceRequest={patchServiceRequest} /> },
            { key: "expand", label: "", render: r => <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={{ padding: "4px 8px" }}>{expandedId === r.id ? "Hide" : "Details"}</button> },
          ]}
        />
      )}

      {expandedId && (() => {
        const r = filtered.find(x => x.id === expandedId);
        if (!r) return null;
        const doneChecks = (r.checklist || []).filter(c => c.done).length;
        const totalChecks = (r.checklist || []).length;
        const pendingChecks = totalChecks - doneChecks;
        return (
          <div className="glass-card" style={{ marginTop: 16, padding: 20, border: "1px solid rgba(168,85,247,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div><h3 style={{ color: "#a855f7", margin: 0, marginBottom: 8 }}>{r.title}</h3><div style={{ color: "#ccc", fontSize: 13 }}>{r.category || r.deviceType}</div></div>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(null)} style={{ padding: "4px 8px" }}><X size={14} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>CUSTOMER</div><div style={{ color: "white", fontWeight: 500 }}>{r.customerName || "Walk-in"}</div>{r.contactPhone && <div style={{ color: "#888", fontSize: 12 }}>{r.contactPhone}</div>}{r.contactEmail && <div style={{ color: "#666", fontSize: 11 }}>{r.contactEmail}</div>}</div>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>SERVICE METHOD</div><div style={{ color: "#00b4ff", fontWeight: 500 }}>{r.serviceMethod}</div>{r.preferredSlot && <div style={{ color: "#888", fontSize: 12 }}>{r.preferredSlot}</div>}</div>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>EXPECTED PRICE</div><div style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 16 }}>{r.expectedPrice ? `₹${r.expectedPrice.toLocaleString()}` : r.quotation ? `₹${r.quotation.toLocaleString()}` : "TBD"}</div>{r.paidAmount && <div style={{ color: "#00cc66", fontSize: 11 }}>Paid: ₹{r.paidAmount.toLocaleString()}</div>}</div>
            </div>
            {r.requirements && <div style={{ marginBottom: 16 }}><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>REQUIREMENTS</div><div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.4, background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 6 }}>{r.requirements}</div></div>}
            {r.diagnosisReport && <div style={{ marginBottom: 16 }}><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>DIAGNOSIS REPORT</div><div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.4, background: "rgba(0,180,255,0.08)", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(0,180,255,0.2)" }}>{r.diagnosisReport}</div></div>}
            
            {totalChecks > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ color: pendingChecks > 0 ? "#ff6b00" : "#00cc66", fontSize: 10, fontWeight: 600 }}>CHECKLIST ({doneChecks}/{totalChecks} COMPLETED)</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{Math.round((doneChecks / Math.max(1, totalChecks)) * 100)}%</div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {r.checklist?.map((check, i) => (
                    <label key={i} className="glass-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, border: check.done ? "1px solid rgba(0,204,102,0.2)" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={check.done} 
                        onChange={e => {
                          const updatedChecks = [...r.checklist!];
                          updatedChecks[i].done = e.target.checked;
                          patchServiceRequest(r.id, { checklist: updatedChecks });
                          toast.success("Checklist synced");
                        }} 
                      />
                      <span style={{ color: check.done ? "#00cc66" : "#ccc", fontSize: 12, textDecoration: check.done ? "line-through" : "none" }}>{check.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>TECHNICIAN NOTES (SYNCED TO ADMIN)</div>
              <textarea 
                value={r.technicianNotes || ""} 
                onChange={e => patchServiceRequest(r.id, { technicianNotes: e.target.value })}
                placeholder="Add internal notes about this request..."
                style={{ width: "100%", height: 80, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px", color: "white", fontSize: 12, resize: "vertical", fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
            
          </div>
        );
      })()}
    </QueueCard>
  );
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
        onChange={e => {
          patchPCBuild(build.id, { status: e.target.value as PCBuild["status"], technicianLastStatusAt: Date.now() });
          toast.success(`Status updated to ${e.target.options[e.target.selectedIndex].text}`);
        }}
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
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMine = store.pcBuilds.filter(build => staffOwns(staff, build.technicianId));
  const active = allMine.filter(b => !["completed", "delivered", "closed", "ready"].includes(b.status));
  const completed = allMine.filter(b => ["completed", "delivered", "closed", "ready"].includes(b.status));
  const filtered = filter === "all" ? allMine : filter === "active" ? active : completed;

  const FILTERS = ["all", "active", "completed"] as const;

  return (
    <QueueCard
      title="Custom PC Builds"
      subtitle={`${allMine.length} assigned · ${active.length} active`}
      action={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`} onClick={() => setFilter(f)} style={{ textTransform: "capitalize", fontSize: 11 }}>
              {f}{filter === f ? ` (${filter === "all" ? allMine.length : filter === "active" ? active.length : completed.length})` : ""}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? <EmptyState title={filter === "completed" ? "No completed builds" : "No assigned builds"} /> : (
        <DataTable
          rowKey={(b: PCBuild) => b.id}
          data={filtered}
          columns={[
            { key: "name", label: "Build", render: b => <div><div style={{ color: "white", fontWeight: 500 }}>{b.name}</div><div style={{ color: "#666", fontSize: 11 }}>{b.purpose || "Gaming"}</div></div> },
            { key: "customer", label: "Customer", render: b => <div><div style={{ color: "#ccc", fontSize: 13 }}>{b.customerName || "Walk-in"}</div>{b.contactPhone && <div style={{ color: "#666", fontSize: 11 }}>{b.contactPhone}</div>}</div> },
            { key: "budget", label: "Budget", render: b => <span style={{ fontFamily: "'Orbitron', sans-serif", color: "#00b4ff", fontSize: 12 }}>{b.budgetRange || "TBD"}</span> },
            { key: "status", label: "Status", render: b => <StatusBadge status={b.status} /> },
            { key: "updated", label: "Updated", render: b => <span style={{ color: "#888", fontSize: 12 }}>{formatDate(b.technicianLastStatusAt || b.updatedAt)}</span> },
            { key: "progress", label: "Update Status", render: b => <StaffPCBuildStatusControl build={b} patchPCBuild={patchPCBuild} /> },
            { key: "expand", label: "", render: b => <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)} style={{ padding: "4px 8px" }}>{expandedId === b.id ? "Hide" : "Details"}</button> },
          ]}
        />
      )}

      {expandedId && (() => {
        const b = filtered.find(x => x.id === expandedId);
        if (!b) return null;
        const doneAssemblies = (b.assemblyChecklist || []).filter(c => c.done).length;
        const doneTests = (b.testResults || []).filter(t => t.done).length;
        return (
          <div className="glass-card" style={{ marginTop: 16, padding: 20, border: "1px solid rgba(168,85,247,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div><h3 style={{ color: "#a855f7", margin: 0, marginBottom: 8 }}>{b.name}</h3><div style={{ color: "#ccc", fontSize: 13 }}>{b.purpose} · {b.performanceLevel || "Mid"} Tier</div></div>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(null)} style={{ padding: "4px 8px" }}><X size={14} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>CUSTOMER</div><div style={{ color: "white", fontWeight: 500 }}>{b.customerName || "Walk-in"}</div>{b.contactPhone && <div style={{ color: "#888", fontSize: 12 }}>{b.contactPhone}</div>}{b.contactEmail && <div style={{ color: "#666", fontSize: 11 }}>{b.contactEmail}</div>}</div>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>BUDGET</div><div style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 16 }}>{b.budgetRange || "TBD"}</div><div style={{ color: "#00b4ff", fontSize: 11 }}>{b.total ? `Total: ₹${b.total.toLocaleString()}` : ""}</div></div>
              <div><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>DELIVERY</div><div style={{ color: "#00cc66", fontWeight: 500 }}>{b.estimatedDelivery || "5-7 working days"}</div>{b.trackingNumber && <div style={{ color: "#888", fontSize: 11 }}>{b.trackingNumber}</div>}</div>
            </div>
            {b.components && b.components.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>COMPONENTS ({b.components.length})</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>{b.components.map((comp, i) => <div key={i} className="glass-card" style={{ padding: 8, fontSize: 11 }}><div style={{ color: "#a855f7", fontWeight: 500 }}>{comp.type}</div><div style={{ color: "#ccc", fontSize: 10 }}>{comp.name}</div><div style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 11 }}>₹{comp.price.toLocaleString()}</div></div>)}</div></div>}
            {b.quotation && <div style={{ marginBottom: 16 }}><div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>QUOTATION</div><div style={{ fontFamily: "'Orbitron', sans-serif", color: "white", fontSize: 20 }}>₹{b.quotation.toLocaleString()}</div>{b.quotationNote && <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{b.quotationNote}</div>}</div>}
            
            {b.assemblyChecklist && b.assemblyChecklist.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ color: (b.assemblyChecklist.length - doneAssemblies) > 0 ? "#ff6b00" : "#00cc66", fontSize: 10, fontWeight: 600 }}>ASSEMBLY ({doneAssemblies}/{b.assemblyChecklist.length} COMPLETED)</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{Math.round((doneAssemblies / Math.max(1, b.assemblyChecklist.length)) * 100)}%</div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {b.assemblyChecklist.map((check, i) => (
                    <label key={i} className="glass-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, border: check.done ? "1px solid rgba(0,204,102,0.2)" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={check.done} 
                        onChange={e => {
                          const updatedChecks = [...b.assemblyChecklist!];
                          updatedChecks[i].done = e.target.checked;
                          patchPCBuild(b.id, { assemblyChecklist: updatedChecks });
                          toast.success("Assembly checklist synced");
                        }} 
                      />
                      <span style={{ color: check.done ? "#00cc66" : "#ccc", fontSize: 12, textDecoration: check.done ? "line-through" : "none" }}>{check.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {b.testResults && b.testResults.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ color: (b.testResults.length - doneTests) > 0 ? "#ff6b00" : "#a855f7", fontSize: 10, fontWeight: 600 }}>TEST RESULTS ({doneTests}/{b.testResults.length} COMPLETED)</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{Math.round((doneTests / Math.max(1, b.testResults.length)) * 100)}%</div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {b.testResults.map((check, i) => (
                    <label key={i} className="glass-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, border: check.done ? "1px solid rgba(168,85,247,0.2)" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={check.done} 
                        onChange={e => {
                          const updatedChecks = [...b.testResults!];
                          updatedChecks[i].done = e.target.checked;
                          patchPCBuild(b.id, { testResults: updatedChecks });
                          toast.success("Test results synced");
                        }} 
                      />
                      <span style={{ color: check.done ? "#a855f7" : "#ccc", fontSize: 12, textDecoration: check.done ? "line-through" : "none" }}>{check.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>TECHNICIAN NOTES (SYNCED TO ADMIN)</div>
              <textarea 
                value={b.technicianNotes || ""} 
                onChange={e => patchPCBuild(b.id, { technicianNotes: e.target.value })}
                placeholder="Add internal notes about this build..."
                style={{ width: "100%", height: 80, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px", color: "white", fontSize: 12, resize: "vertical", fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
          </div>
        );
      })()}
    </QueueCard>
  );
}

export function StaffGamingHub({
  staff,
  store,
  patchGamingHubItem,
  approveGamingHubComment,
  rejectGamingHubComment,
}: {
  staff: StaffMember;
  store: DashboardStore;
  patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void;
  approveGamingHubComment: (itemId: string, commentId: string, actor?: string) => void;
  rejectGamingHubComment: (itemId: string, commentId: string, actor?: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "scheduled">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = (store.gamingHub || []).filter(item => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCommentsTotal = (store.gamingHub || []).reduce((sum, item) =>
    sum + (item.comments || []).filter(c => c.status === "pending").length, 0
  );

  const FILTERS = ["all", "published", "draft", "scheduled"] as const;

  return (
    <QueueCard
      title="Gaming Hub"
      subtitle={`${rows.length} items · ${pendingCommentsTotal} pending comments`}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="glass-input"
            placeholder="Search content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 12px", color: "white", fontSize: 12, width: 180 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: "capitalize", fontSize: 11 }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No content found" />
      ) : (
        <DataTable
          rowKey={(item: GamingHubItem) => item.id}
          data={rows}
          columns={[
            {
              key: "content",
              label: "Content",
              render: item => (
                <div>
                  <div style={{ color: "white", fontWeight: 500, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="glass-pill" style={{ fontSize: 10, padding: "2px 6px", background: "rgba(255,255,255,0.08)", color: "#888" }}>{item.category}</span>
                    <span style={{ color: "#666", fontSize: 11 }}>{item.author}</span>
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              label: "Type",
              render: item => (
                <span className="glass-pill" style={{ fontSize: 10, padding: "2px 8px", background: "rgba(0,180,255,0.15)", border: "1px solid rgba(0,180,255,0.3)", color: "#00b4ff" }}>
                  {item.type}
                </span>
              ),
            },
            { key: "status", label: "Status", render: item => <StatusBadge status={item.status} /> },
            {
              key: "comments",
              label: "Pending",
              render: item => {
                const pendingCount = (item.comments || []).filter(c => c.status === "pending").length;
                return pendingCount > 0 ? (
                  <button
                    className="glass-pill"
                    onClick={() => setExpandedId(item.id)}
                    style={{ fontSize: 11, padding: "4px 10px", background: "rgba(255,107,0,0.2)", border: "1px solid rgba(255,107,0,0.4)", color: "#ff6b00", cursor: "pointer" }}
                  >
                    {pendingCount} pending
                  </button>
                ) : <span style={{ color: "#444", fontSize: 11 }}>—</span>;
              },
            },
            { key: "date", label: "Date", render: item => <span style={{ color: "#888", fontSize: 12 }}>{formatDate(item.publishDate || item.createdAt)}</span> },
            {
              key: "action",
              label: "",
              render: item => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="glass-pill glass-pill-sm glass-pill-info"
                    onClick={() => { patchGamingHubItem(item.id, { updatedAt: Date.now() }); toast.success("Marked as reviewed"); }}
                  >
                    Mark Reviewed
                  </button>
                  <button
                    className="glass-pill glass-pill-sm glass-pill-outline"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    {expandedId === item.id ? "Hide" : "Details"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {expandedId && (() => {
        const item = rows.find(r => r.id === expandedId);
        if (!item) return null;
        const pendingComments = (item.comments || []).filter(c => c.status === "pending");
        return (
          <div className="glass-card" style={{ marginTop: 16, padding: 20, border: "1px solid rgba(0,180,255,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h3 style={{ color: "#00b4ff", margin: 0, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{item.shortDescription}</p>
              </div>
              <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setExpandedId(null)} style={{ padding: "4px 8px" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Views", value: item.views },
                { label: "Reads", value: item.reads },
                { label: "Shares", value: item.shares },
                { label: "CTA Clicks", value: item.ctaClicks },
              ].map((stat, i) => (
                <div key={i} className="glass-card" style={{ padding: 12, textAlign: "center" }}>
                  <Activity size={16} color="#666" style={{ marginBottom: 4 }} />
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, color: "white" }}>{stat.value}</div>
                  <div style={{ color: "#666", fontSize: 10 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {pendingComments.length > 0 ? (
              <div>
                <div style={{ color: "#ff6b00", fontSize: 12, marginBottom: 12, fontWeight: 600 }}>Pending Comments ({pendingComments.length})</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {pendingComments.map(comment => (
                    <div key={comment.id} className="glass-card" style={{ padding: 12, border: "1px solid rgba(255,107,0,0.2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <div>
                          <div style={{ color: "white", fontWeight: 500, fontSize: 13 }}>{comment.customerName}</div>
                          <div style={{ color: "#666", fontSize: 11 }}>{formatDate(comment.createdAt)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="glass-pill glass-pill-sm"
                            style={{ background: "rgba(0,204,102,0.15)", border: "1px solid rgba(0,204,102,0.4)", color: "#00cc66", fontSize: 10, padding: "4px 10px" }}
                            onClick={() => { approveGamingHubComment(item.id, comment.id, staff.id); toast.success("Comment approved"); }}
                          >
                            Approve
                          </button>
                          <button
                            className="glass-pill glass-pill-sm"
                            style={{ background: "rgba(255,31,69,0.15)", border: "1px solid rgba(255,31,69,0.4)", color: "#FF1F45", fontSize: 10, padding: "4px 10px" }}
                            onClick={() => { rejectGamingHubComment(item.id, comment.id, staff.id); toast.success("Comment rejected"); }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <div style={{ color: "#ccc", fontSize: 13, lineHeight: 1.4 }}>{comment.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: "#888", fontSize: 13, fontStyle: "italic" }}>No pending comments</div>
            )}
          </div>
        );
      })()}
    </QueueCard>
  );
}

export const StaffRemoteSupport = StaffSupportWorkflow;
export function StaffDeliveries({
  staff,
  store,
  updateDeliveryStatus,
  assignDeliveryStaff,
  updateDelivery,
}: {
  staff: StaffMember;
  store: DashboardStore;
  updateDeliveryStatus: (id: string, status: Delivery["status"], actor?: string) => void;
  assignDeliveryStaff?: (deliveryId: string, staffId: string, staffName: string, staffPhone: string, actor?: string) => void;
  updateDelivery?: (id: string, patch: Partial<Delivery>, actor?: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "ready" | "dispatched" | "delivered">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const myId = staff?.id || "stf_unknown";
  const isDeliveryStaff = staff?.role === "delivery";

  const allMine = isDeliveryStaff
    ? store.deliveries
    : store.deliveries.filter(d => d.staffId === myId);

  const filtered = filter === "all" ? allMine : allMine.filter(d => d.status === filter);

  const counts = useMemo(() => ({
    all: allMine.length,
    pending: allMine.filter(d => d.status === "pending").length,
    ready: allMine.filter(d => d.status === "ready").length,
    dispatched: allMine.filter(d => d.status === "dispatched").length,
    delivered: allMine.filter(d => d.status === "delivered").length,
    cancelled: allMine.filter(d => d.status === "cancelled").length,
  }), [allMine]);

  const FILTERS = ["all", "pending", "ready", "dispatched", "delivered"] as const;

  const DELIVERY_STEPS = ["pending", "ready", "dispatched", "delivered"] as const;
  const STATUS_COLORS: Record<Delivery["status"], string> = {
    pending: "#ffd700", ready: "#ff6b00", dispatched: "#00b4ff", delivered: "#00cc66", cancelled: "#888",
  };

  const getStepIndex = (status: Delivery["status"]) => DELIVERY_STEPS.indexOf(status);

  const getOrder = (d: Delivery) => store.orders.find(o => o.id === d.orderId);

  const handleDispatch = (id: string) => {
    updateDeliveryStatus(id, "dispatched", myId);
    toast.success("Delivery dispatched!");
  };

  const handleDelivered = (id: string) => {
    updateDeliveryStatus(id, "delivered", myId);
    toast.success("Delivery completed!");
  };

  const renderStatusBar = (status: Delivery["status"]) => {
    const currentIndex = getStepIndex(status);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {DELIVERY_STEPS.map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i <= currentIndex
                ? STATUS_COLORS[step]
                : "rgba(255,255,255,0.15)",
              border: i <= currentIndex ? "none" : "1px solid rgba(255,255,255,0.2)",
            }} />
            <span style={{ fontSize: 10, color: i <= currentIndex ? "#ccc" : "#444", textTransform: "capitalize" }}>{step}</span>
            {i < DELIVERY_STEPS.length - 1 && (
              <div style={{
                width: 24, height: 1,
                background: i < currentIndex ? "rgba(0,180,255,0.5)" : "rgba(255,255,255,0.1)",
              }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Card view — shows full order details
  const renderCard = (delivery: Delivery) => {
    const order = getOrder(delivery);
    return (
      <div
        key={delivery.id}
        className="glass-card"
        style={{ padding: 20, borderTop: `3px solid ${STATUS_COLORS[delivery.status]}` }}
      >
        {/* Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
          <div>
            <div style={{ color: "#888", fontSize: 9, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1, marginBottom: 2 }}>DELIVERY ID</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", color: "#00b4ff", fontSize: 13, fontWeight: 700 }}>{delivery.id.slice(-8).toUpperCase()}</div>
            <div style={{ color: "#555", fontSize: 10, marginTop: 2 }}>Order: {delivery.orderId.slice(-8).toUpperCase()}</div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${STATUS_COLORS[delivery.status]}22`, border: `1px solid ${STATUS_COLORS[delivery.status]}55`, fontSize: 11, color: STATUS_COLORS[delivery.status], fontWeight: 600, textTransform: "capitalize" }}>
            {delivery.status}
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "#888", fontSize: 9, marginBottom: 2, fontFamily: "'Orbitron', sans-serif", letterSpacing: 0.5 }}>CUSTOMER</div>
          <div style={{ color: "white", fontWeight: 600 }}>{delivery.customerName}</div>
          <div style={{ color: "#777", fontSize: 12 }}>{delivery.customerPhone}</div>
        </div>

        {/* Address */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
          <MapPin size={14} color="#666" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.4 }}>{delivery.address}</div>
            <div style={{ color: "#666", fontSize: 11 }}>{delivery.city}, {delivery.state} {delivery.pincode}</div>
            {delivery.deliveryNotes && <div style={{ color: "#888", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>Note: {delivery.deliveryNotes}</div>}
          </div>
        </div>

        {/* Order Items */}
        {order && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#888", fontSize: 9, marginBottom: 6, fontFamily: "'Orbitron', sans-serif", letterSpacing: 0.5 }}>ORDER ITEMS ({order.items.length})</div>
            {order.items.map(item => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {item.img && <img src={item.img} alt={item.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} />}
                  <div>
                    <div style={{ color: "#ddd", fontSize: 12 }}>{item.name}</div>
                    <div style={{ color: "#666", fontSize: 10 }}>× {item.qty}</div>
                  </div>
                </div>
                <span style={{ color: "white", fontSize: 12 }}>{inr(item.price * item.qty)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ color: "#888", fontSize: 12 }}>Order Total</span>
              <span style={{ color: "#FF1F45", fontWeight: 700, fontSize: 14 }}>{inr(order.total)}</span>
            </div>
          </div>
        )}

        {/* Delivery Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#888", fontSize: 9, marginBottom: 8, fontFamily: "'Orbitron', sans-serif", letterSpacing: 0.5 }}>DELIVERY PROGRESS</div>
          {renderStatusBar(delivery.status)}
        </div>

        {/* Assigned Staff Info */}
        {delivery.staffName && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(255,31,69,0.06)", borderRadius: 8, border: "1px solid rgba(255,31,69,0.15)" }}>
            <div style={{ color: "#888", fontSize: 9, marginBottom: 2, fontFamily: "'Orbitron', sans-serif", letterSpacing: 0.5 }}>ASSIGNED STAFF</div>
            <div style={{ color: "white", fontSize: 12 }}>{delivery.staffName}</div>
            {delivery.staffPhone && <div style={{ color: "#777", fontSize: 11 }}>{delivery.staffPhone}</div>}
          </div>
        )}

        {/* Timestamps */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, fontSize: 10, color: "#555" }}>
          <span>Created: {formatDate(delivery.createdAt)}</span>
          {delivery.dispatchedAt && <span>Dispatched: {formatDate(delivery.dispatchedAt)}</span>}
          {delivery.deliveredAt && <span>Delivered: {formatDate(delivery.deliveredAt)}</span>}
        </div>

        {/* Actions */}
        <div>
          {delivery.status === "ready" && (
            <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => handleDispatch(delivery.id)} style={{ width: "100%", padding: "10px" }}>
              <Truck size={14} style={{ marginRight: 6 }} /> Dispatch Now
            </button>
          )}
          {delivery.status === "dispatched" && (
            <button className="glass-pill glass-pill-sm" style={{ width: "100%", padding: "10px", background: "rgba(0,204,102,0.15)", border: "1px solid rgba(0,204,102,0.4)", color: "#00cc66" }} onClick={() => handleDelivered(delivery.id)}>
              <CheckCircle size={14} style={{ marginRight: 6 }} /> Mark as Delivered
            </button>
          )}
          {delivery.status === "delivered" && (
            <div className="glass-pill" style={{ width: "100%", padding: "10px", background: "rgba(0,204,102,0.1)", border: "1px solid rgba(0,204,102,0.3)", color: "#00cc66", textAlign: "center", fontSize: 12 }}>
              <CheckCircle size={14} style={{ marginRight: 6 }} /> Completed
            </div>
          )}
          {delivery.status === "pending" && (
            <div className="glass-pill" style={{ width: "100%", padding: "10px", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700", textAlign: "center", fontSize: 12 }}>
              <Clock size={14} style={{ marginRight: 6 }} /> Awaiting Assignment
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <QueueCard
      title="Deliveries"
      subtitle={`${counts.all} total · ${counts.ready} ready, ${counts.dispatched} in transit, ${counts.pending} awaiting assignment`}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: "capitalize", fontSize: 11 }}
              >
                {f}{counts[f as keyof typeof counts] > 0 ? ` (${counts[f as keyof typeof counts]})` : ""}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`glass-pill glass-pill-sm ${viewMode === "cards" ? "glass-pill-primary" : "glass-pill-outline"}`}
              onClick={() => setViewMode("cards")}
              style={{ padding: "6px 10px" }}
            >
              Cards
            </button>
            <button
              className={`glass-pill glass-pill-sm ${viewMode === "table" ? "glass-pill-primary" : "glass-pill-outline"}`}
              onClick={() => setViewMode("table")}
              style={{ padding: "6px 10px" }}
            >
              Table
            </button>
          </div>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No delivery tasks" : `No ${filter} deliveries`}
          subtitle={filter === "all" ? "You're all caught up!" : undefined}
        />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {filtered.map(renderCard)}
        </div>
      ) : (
        <DataTable
          rowKey={(d: Delivery) => d.id}
          data={filtered}
          columns={[
            { key: "id", label: "Delivery ID", render: d => <span style={{ fontFamily: "'Orbitron', sans-serif", color: "#00b4ff", fontSize: 11 }}>{d.id.slice(-8).toUpperCase()}</span> },
            { key: "customer", label: "Customer", render: d => (
              <div>
                <span style={{ color: "white", fontSize: 12 }}>{d.customerName}</span>
                <div style={{ color: "#666", fontSize: 11 }}>{d.customerPhone}</div>
              </div>
            )},
            { key: "address", label: "Address", render: d => <div><span style={{ color: "#aaa", fontSize: 12 }}>{d.address}</span><div style={{ color: "#555", fontSize: 11 }}>{d.city}, {d.state} {d.pincode}</div></div> },
            { key: "items", label: "Items", render: d => {
              const order = getOrder(d);
              return order ? <span style={{ color: "#ccc", fontSize: 12 }}>{order.items.length} item{order.items.length > 1 ? "s" : ""} · {inr(order.total)}</span> : <span style={{ color: "#555" }}>—</span>;
            }},
            { key: "status", label: "Status", render: d => (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: `${STATUS_COLORS[d.status]}22`, border: `1px solid ${STATUS_COLORS[d.status]}55`, fontSize: 11, color: STATUS_COLORS[d.status], fontWeight: 600, textTransform: "capitalize" }}>
                {d.status}
              </div>
            )},
            { key: "date", label: "Date", render: d => <span style={{ color: "#666", fontSize: 12 }}>{formatDate(d.createdAt)}</span> },
            {
              key: "action",
              label: "Action",
              render: d => (
                d.status === "ready" ? (
                  <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => handleDispatch(d.id)}><Truck size={12} style={{ marginRight: 4 }} /> Dispatch</button>
                ) : d.status === "dispatched" ? (
                  <button className="glass-pill glass-pill-sm" style={{ background: "rgba(0,204,102,0.15)", border: "1px solid rgba(0,204,102,0.4)", color: "#00cc66" }} onClick={() => handleDelivered(d.id)}>
                    <CheckCircle size={12} style={{ marginRight: 4 }} /> Delivered
                  </button>
                ) : (
                  <span style={{ color: "#00cc66", fontSize: 11 }}>✓ Done</span>
                )
              ),
            },
          ]}
        />
      )}
    </QueueCard>
  );
}

// ─── Staff Orders ───────────────────────────────────────────────────────────

export function StaffOrders({ staff, store }: { staff: StaffMember; store: DashboardStore }) {
  const STATUS_OPTIONS: Order["status"][] = ["placed", "verified", "packing", "shipped", "delivered", "cancelled"];
  const STATUS_COLORS: Record<Order["status"], string> = {
    placed: "#ffd700", verified: "#00b4ff", packing: "#ff6b00", shipped: "#a855f7", delivered: "#00cc66", cancelled: "#888",
  };

  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const [open, setOpen] = useState<Order | null>(null);

  const orders = [...store.orders].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const active = open ? store.orders.find(o => o.id === open.id) || open : null;

  const customerName = (o: Order) => o.customerName || "Customer";
  const customerContact = (o: Order) => o.customerPhone || o.customerEmail || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
        <KPICard label="Total Orders" value={orders.length} icon={<ShoppingBag size={14} />} color="#00b4ff" />
        <KPICard label="Pending" value={orders.filter(o => ["placed", "verified"].includes(o.status)).length} icon={<Clock size={14} />} color="#ffd700" />
        <KPICard label="Processing" value={orders.filter(o => ["packing", "shipped"].includes(o.status)).length} icon={<Zap size={14} />} color="#ff6b00" />
        <KPICard label="Delivered" value={orders.filter(o => o.status === "delivered").length} icon={<CheckCircle size={14} />} color="#00cc66" />
        <KPICard label="Revenue" value={inr(orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0))} icon={<TrendingUp size={14} />} color="#FF1F45" />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["all", ...STATUS_OPTIONS] as const).map(status => (
          <button key={status} className={`glass-pill ${filter === status ? "glass-pill-primary" : "glass-pill-outline"} glass-pill-sm`} onClick={() => setFilter(status)}>
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && ` (${orders.filter(o => o.status === status).length})`}
          </button>
        ))}
      </div>

      <SectionCard title="All Orders" subtitle={`${filtered.length} shown · ${orders.length} total`}>
        <DataTable
          rowKey={o => o.id}
          data={filtered}
          onRowClick={o => setOpen(o)}
          columns={[
            {
              key: "id", label: "Order ID", render: o => (
                <div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "#00b4ff" }}>{o.id.slice(-8).toUpperCase()}</span>
                  {o.invoiceId && <div style={{ fontSize: 9, color: "#555" }}>INV: {o.invoiceId.slice(-6)}</div>}
                </div>
              ),
            },
            { key: "customer", label: "Customer", render: o => <div><strong style={{ color: "white" }}>{customerName(o)}</strong><br /><span style={{ color: "#777", fontSize: 11 }}>{customerContact(o)}</span></div> },
            {
              key: "items", label: "Items", render: o => (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: "#ddd" }}>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</span>
                  {o.items[0]?.img && <img src={o.items[0].img} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />}
                </div>
              ),
            },
            {
              key: "fulfillment", label: "Delivery", render: o => (
                <div>
                  <span style={{ color: o.deliveryMethod === "pickup" ? "#ffd700" : "#00b4ff", fontSize: 12 }}>
                    {o.deliveryMethod === "pickup" ? "📦 Store Pickup" : "🚚 Home Delivery"}
                  </span>
                  {o.deliveryMethod === "ship" && o.deliveryStatus && (
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Status: {o.deliveryStatus}</div>
                  )}
                </div>
              ),
            },
            { key: "total", label: "Total", align: "right", render: o => <span style={{ color: "#FF1F45", fontWeight: 700 }}>{inr(o.total)}</span> },
            {
              key: "status", label: "Status", render: o => (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: `${STATUS_COLORS[o.status]}22`, border: `1px solid ${STATUS_COLORS[o.status]}55`, fontSize: 11, color: STATUS_COLORS[o.status], fontWeight: 600, textTransform: "capitalize" }}>
                  {o.status}
                </div>
              ),
            },
            { key: "date", label: "Date", render: o => <span style={{ color: "#666", fontSize: 12 }}>{formatDate(o.createdAt)}</span> },
            {
              key: "payment", label: "Payment", render: o => (
                <span style={{ color: o.paymentStatus === "paid" ? "#00cc66" : o.paymentStatus === "cod" ? "#ffd700" : "#888", fontSize: 12 }}>
                  {o.paymentStatus?.toUpperCase() || "—"}
                </span>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* Order Detail Modal */}
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>STATUS</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${STATUS_COLORS[active.status]}22`, border: `1px solid ${STATUS_COLORS[active.status]}55`, fontSize: 12, color: STATUS_COLORS[active.status], fontWeight: 600, textTransform: "capitalize" }}>
                  {active.status}
                </div>
              </div>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>PAYMENT</div>
                <div style={{ color: active.paymentStatus === "paid" ? "#00cc66" : active.paymentStatus === "cod" ? "#ffd700" : "#888", fontWeight: 600 }}>
                  {active.paymentStatus?.toUpperCase() || "PENDING"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>FULFILLMENT</div>
                <div style={{ color: "#ddd", fontSize: 12 }}>
                  {active.deliveryMethod === "pickup" ? "📦 Store Pickup" : "🚚 Home Delivery"}
                  {active.deliveryMethod === "ship" && active.deliveryStatus && <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>Delivery: {active.deliveryStatus}</div>}
                </div>
              </div>
              <div className="glass" style={{ borderRadius: 10, padding: 12 }}>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#777", marginBottom: 6 }}>TOTAL</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, color: "#FF1F45", fontWeight: 700 }}>{inr(active.total)}</div>
              </div>
            </div>

            <SectionCard title="Items" padded={false}>
              <div style={{ padding: 14 }}>
                {active.items.map(item => (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {item.img && <img src={item.img} alt={item.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />}
                      <div>
                        <div style={{ color: "#ddd" }}>{item.name} × {item.qty}</div>
                        <div style={{ color: "#666", fontSize: 11 }}>{item.productId?.slice(-6)}</div>
                      </div>
                    </div>
                    <span style={{ color: "white" }}>{inr(item.price * item.qty)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontFamily: "'Rajdhani', sans-serif", fontSize: 16, color: "white" }}>
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span style={{ color: "#FF1F45", fontWeight: 700 }}>{inr(active.total)}</span>
                </div>
              </div>
            </SectionCard>

            {active.deliveryMethod !== "pickup" && active.shippingAddress && (
              <SectionCard title="Shipping Address" padded={false}>
                <div style={{ padding: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.8 }}>
                  {active.shippingAddress.name}<br />
                  {active.shippingAddress.line1}{active.shippingAddress.line2 ? `, ${active.shippingAddress.line2}` : ""}<br />
                  {active.shippingAddress.city}, {active.shippingAddress.state} {active.shippingAddress.pincode}
                  {active.shippingAddress.phone && <><br />{active.shippingAddress.phone}</>}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Timeline" padded={false}>
              <div className="dash-timeline" style={{ padding: 14 }}>
                {active.trackingSteps.map(step => (
                  <div key={step.label} className={`dash-timeline-step ${step.done ? "done" : ""}`}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: step.done ? "white" : "#888" }}>{step.label}</div>
                    {step.done && <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#666" }}>{formatDate(step.at)}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>

            {active.deliveryNotes && (
              <SectionCard title="Delivery Notes" padded={false}>
                <div style={{ padding: 14, color: "#aaa", fontSize: 13, fontStyle: "italic" }}>{active.deliveryNotes}</div>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffInventoryRequests({
  staff,
  store,
  submitInventoryRequest,
  approveInventoryRequest,
  rejectInventoryRequest,
  markInventoryReceived,
}: {
  staff: StaffMember;
  store: DashboardStore;
  submitInventoryRequest: (req: Omit<InventoryRequest, "id" | "createdAt" | "status">) => void;
  approveInventoryRequest: (id: string, actor?: string) => void;
  rejectInventoryRequest: (id: string, actor?: string) => void;
  markInventoryReceived: (id: string, actor?: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "received">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ component: "", qty: "1", reason: "" });

  const myId = staff?.id || "stf_unknown";
  const allMine = store.inventoryRequests.filter(r => r.staffId === myId);
  const filtered = filter === "all" ? allMine : allMine.filter(r => r.status === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.component.trim() || !form.qty) return;
    submitInventoryRequest({ staffId: myId, component: form.component.trim(), qty: Number(form.qty), reason: form.reason.trim() });
    toast.success("Inventory request submitted!");
    setForm({ component: "", qty: "1", reason: "" });
    setShowForm(false);
  };

  const counts = useMemo(() => ({
    all: allMine.length,
    pending: allMine.filter(r => r.status === "pending").length,
    approved: allMine.filter(r => r.status === "approved").length,
    rejected: allMine.filter(r => r.status === "rejected").length,
    received: allMine.filter(r => r.status === "received").length,
  }), [allMine]);

  const FILTERS = ["all", "pending", "approved", "rejected", "received"] as const;

  return (
    <QueueCard
      title="Inventory Requests"
      subtitle={`${counts.all} total requests`}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`glass-pill glass-pill-sm ${filter === f ? "glass-pill-primary" : "glass-pill-outline"}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: "capitalize", fontSize: 11 }}
              >
                {f}{counts[f as keyof typeof counts] > 0 ? ` (${counts[f as keyof typeof counts]})` : ""}
              </button>
            ))}
          </div>
          <button className="glass-pill glass-pill-sm glass-pill-primary" onClick={() => setShowForm(true)}>
            + New Request
          </button>
        </div>
      }
    >
      {showForm && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 16, border: "1px solid rgba(255,31,69,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>New Inventory Request</span>
            <button className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setShowForm(false)} style={{ padding: "4px 8px" }}>
              <X size={12} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
              <div>
                <label style={{ color: "#888", fontSize: 11, display: "block", marginBottom: 4 }}>Component Name *</label>
                <input
                  className="glass-input"
                  value={form.component}
                  onChange={e => setForm(f => ({ ...f, component: e.target.value }))}
                  placeholder="e.g. Thermal paste, RTX 5090, DDR5 RAM"
                  style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 13, width: "100%" }}
                  required
                />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: 11, display: "block", marginBottom: 4 }}>Quantity *</label>
                <input
                  className="glass-input"
                  type="number"
                  min="1"
                  value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                  style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 13, width: "100%" }}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ color: "#888", fontSize: 11, display: "block", marginBottom: 4 }}>Reason / Notes</label>
              <input
                className="glass-input"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Restock for assembly queue, replacing defective unit"
                style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 12px", color: "white", fontSize: 13, width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="glass-pill glass-pill-sm glass-pill-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="glass-pill glass-pill-sm glass-pill-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No inventory requests yet" : `No ${filter} requests`}
          subtitle={filter === "all" ? "Click 'New Request' to request components from inventory" : undefined}
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(req => (
            <div
              key={req.id}
              className="glass-card"
              style={{ padding: 16, display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 16, alignItems: "center", borderLeft: `3px solid ${req.status === "approved" ? "#00cc66" : req.status === "rejected" ? "#FF1F45" : req.status === "received" ? "#00b4ff" : "#ff6b00"}` }}
            >
              <div style={{ color: "#888", fontSize: 11, fontFamily: "'Orbitron', sans-serif" }}>×{req.qty}</div>
              <div>
                <div style={{ color: "white", fontWeight: 500, marginBottom: 2 }}>{req.component}</div>
                {req.reason && <div style={{ color: "#666", fontSize: 12 }}>{req.reason}</div>}
              </div>
              <StatusBadge status={req.status} />
              <div style={{ color: "#666", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(req.createdAt)}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {req.status === "approved" && (
                  <button
                    className="glass-pill glass-pill-sm glass-pill-primary"
                    onClick={() => { markInventoryReceived(req.id, myId); toast.success("Marked as received!"); }}
                  >
                    Mark Received
                  </button>
                )}
                {req.status === "pending" && (
                  <>
                    <button
                      className="glass-pill glass-pill-sm"
                      style={{ background: "rgba(0,204,102,0.15)", border: "1px solid rgba(0,204,102,0.4)", color: "#00cc66", fontSize: 10, padding: "4px 8px" }}
                      onClick={() => { approveInventoryRequest(req.id, myId); toast.success("Approved"); }}
                    >
                      Approve
                    </button>
                    <button
                      className="glass-pill glass-pill-sm"
                      style={{ background: "rgba(255,31,69,0.15)", border: "1px solid rgba(255,31,69,0.4)", color: "#FF1F45", fontSize: 10, padding: "4px 8px" }}
                      onClick={() => { rejectInventoryRequest(req.id, myId); toast.success("Rejected"); }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </QueueCard>
  );
}
