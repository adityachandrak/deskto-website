import { useState } from "react";
import { toast } from "sonner";
import { Gamepad2, Eye, MessageSquare, BarChart3 } from "lucide-react";
import { DataTable } from "./components/dashboard/DataTable";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { SectionCard } from "./components/dashboard/SectionCard";
import { EmptyState } from "./components/dashboard/EmptyState";
import { KPICard } from "./components/dashboard/KPICard";
import type { DashboardStore } from "./lib/dashboardData";

export type GamingHubContentType = "news" | "review" | "guide" | "offer" | "build";
export type GamingHubStatus = "draft" | "published" | "archived";

export interface GamingHubItem {
  id: string;
  title: string;
  type: GamingHubContentType;
  category: string;
  status: GamingHubStatus;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  thumbnailImage: string;
  gallery: string[];
  featured: boolean;
  trending: boolean;
  showInExclusiveOffers: boolean;
  showInSignatureMachines: boolean;
  publishDate: number;
  views: number;
  reads: number;
  shares: number;
  whatsappClicks: number;
  callClicks: number;
  offerClicks: number;
  ctaClicks: number;
  comments: Array<{
    id: string;
    customerName: string;
    text: string;
    status: "pending" | "approved" | "rejected";
    at: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

const GAMING_TYPES: { value: GamingHubContentType; label: string }[] = [
  ["news", "News"],
  ["review", "Review"],
  ["guide", "Guide"],
  ["offer", "Offer"],
  ["build", "Build"],
];

export function StaffGamingHub({ staff, store, patchGamingHubItem }: {
  staff: any;
  store: DashboardStore;
  patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void;
}) {
  const [search, setSearch] = useState("");
  const items = store.gamingHub || [];
  const filtered = items.filter(item =>
    `${item.title} ${item.category} ${item.status}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const pendingComments = items.reduce((sum, item) =>
    sum + (item.comments || []).filter(comment => comment.status === "pending").length, 0
  );

  const moderateComment = (item: GamingHubItem, commentId: string, status: "approved" | "rejected") => {
    patchGamingHubItem(item.id, {
      comments: item.comments.map(comment =>
        comment.id === commentId ? { ...comment, status } : comment
      )
    });
    toast.success(`Comment ${status}`);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="glass-card" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Gamepad2 size={20} style={{ color: "#FF1F45" }} />
          <h3 style={{ fontFamily: "Orbitron, sans-serif", color: "white", margin: 0, fontSize: 18 }}>
            Gaming Hub Management - Staff View
          </h3>
        </div>
        <p style={{ fontFamily: "Space Grotesk, sans-serif", color: "#888", fontSize: 14 }}>
          As staff, you can view published gaming hub content, monitor performance, and moderate customer comments.
          Full content creation is available in Admin dashboard.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 20 }}>
          <KPICard label="Total Published" value={items.filter(i => i.status !== "draft").length} icon={Eye} color="#00cc66" />
          <KPICard label="Total Views" value={totalViews} icon={BarChart3} color="#00b4ff" />
          <KPICard label="Pending Comments" value={pendingComments} icon={MessageSquare} color="#a855f7" />
        </div>
      </div>

      <SectionCard
        title="Published Gaming Content"
        subtitle={`${items.filter(i => i.status !== "draft").length} published posts`}
        action={
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search content..."
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "white",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 12,
              outline: "none",
              width: 200
            }}
          />
        }
      >
        <DataTable
          rowKey={item => item.id}
          data={filtered}
          columns={[
            {
              key: "content",
              label: "Content",
              render: item => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {item.thumbnailImage || item.coverImage ? (
                    <img
                      src={item.thumbnailImage || item.coverImage}
                      alt={item.title}
                      style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 8 }}
                    />
                  ) : null}
                  <div>
                    <b style={{ color: "white" }}>{item.title}</b>
                    <br />
                    <span style={{ color: "#888", fontSize: 11 }}>{item.category}</span>
                  </div>
                </div>
              )
            },
            {
              key: "type",
              label: "Type",
              render: item => GAMING_TYPES.find(t => t.value === item.type)?.label || item.type
            },
            {
              key: "status",
              label: "Status",
              render: item => <StatusBadge status={item.status} />
            },
            {
              key: "visibility",
              label: "Features",
              render: item => [
                item.featured ? "Featured" : "",
                item.trending ? "Trending" : "",
                item.showInExclusiveOffers ? "Offer" : "",
                item.showInSignatureMachines ? "Build" : "",
              ].filter(Boolean).join(" • ") || "Standard"
            },
            {
              key: "analytics",
              label: "Performance",
              render: item => (
                <span style={{ color: "#ccc" }}>
                  {item.views} views · {item.reads} reads · {item.shares} shares
                </span>
              )
            },
            {
              key: "actions",
              label: "",
              render: item => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <a
                    href={`/services/gaming-hub/${item.slug}`}
                    className="glass-pill glass-pill-sm glass-pill-outline"
                    style={{ textDecoration: "none" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preview
                  </a>
                  <button
                    className="glass-pill glass-pill-sm glass-pill-info"
                    onClick={() => {
                      const newStatus = item.status === "published" ? "archived" : "published";
                      patchGamingHubItem(item.id, { status: newStatus });
                      toast.success(`Content ${newStatus === "published" ? "restored" : "archived"}`);
                    }}
                  >
                    {item.status === "published" ? "Archive" : "Restore"}
                  </button>
                </div>
              )
            },
          ]}
        />

        {filtered.length === 0 && (
          <EmptyState
            icon={<Gamepad2 size={24} />}
            title="No published content"
            subtitle="Published gaming content will appear here."
          />
        )}
      </SectionCard>

      <SectionCard title="Customer Comment Moderation" subtitle={`${pendingComments} comments awaiting approval`}>
        <div style={{ display: "grid", gap: 12 }}>
          {items.flatMap(item =>
            (item.comments || []).filter(comment => comment.status === "pending").map(comment => ({ item, comment }))
          ).map(({ item, comment }) => (
            <div key={comment.id} className="glass-card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontSize: 14 }}>{comment.customerName.charAt(0)}</span>
                  </div>
                  <div>
                    <b style={{ color: "white" }}>{comment.customerName}</b>
                    <span style={{ color: "#666", fontSize: 12, marginLeft: 8 }}>On: {item.title}</span>
                  </div>
                </div>
                <p style={{ margin: "8px 0", color: "#ccc", fontFamily: "Space Grotesk, sans-serif", fontSize: 13, lineHeight: 1.5 }}>
                  {comment.text}
                </p>
                <span style={{ color: "#666", fontSize: 11 }}>Submitted {new Date(comment.at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  className="glass-pill glass-pill-sm glass-pill-success"
                  onClick={() => moderateComment(item, comment.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="glass-pill glass-pill-sm glass-pill-red"
                  onClick={() => moderateComment(item, comment.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pendingComments === 0 && (
            <EmptyState
              icon={<MessageSquare size={24} />}
              title="No pending comments"
              subtitle="Customer comments will appear here when pending approval."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
