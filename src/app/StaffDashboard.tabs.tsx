import { useState } from "react";
import { toast } from "sonner";
import { Gamepad2, Eye, MessageSquare, BarChart3 } from "lucide-react";
import { DataTable, type Column } from "./components/dashboard/DataTable";
import { StatusBadge } from "./components/dashboard/StatusBadge";
import { SectionCard } from "./components/dashboard/SectionCard";
import { EmptyState } from "./components/dashboard/EmptyState";
import { KPICard } from "./components/dashboard/KPICard";
import type { DashboardStore } from "./lib/dashboardData";

// Gaming Hub Types
export type GamingHubContentType = "news" | "review" | "guide" | "offer" | "build" | "news";
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

function gamingSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function emptyGamingDraft(): Partial<GamingHubItem> {
  return {
    id: "",
    title: "",
    type: "news",
    category: "Gaming News",
    status: "draft",
    slug: "",
    content: "",
    excerpt: "",
    coverImage: "",
    thumbnailImage: "",
    gallery: [],
    featured: false,
    trending: false,
    showInExclusiveOffers: false,
    showInSignatureMachines: false,
    publishDate: Date.now(),
    views: 0,
    reads: 0,
    shares: 0,
    whatsappClicks: 0,
    callClicks: 0,
    offerClicks: 0,
    ctaClicks: 0,
    comments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function validateGamingHubItem(item: Partial<GamingHubItem>, publish: boolean) {
  if (!item.title?.trim()) return "Title is required.";
  if (!item.content?.trim()) return "Content is required.";
  if (publish && !item.coverImage?.trim()) return "Cover image is required for publication.";
  if (!item.category?.trim()) return "Category is required.";
  return null;
}

// ─── Staff Gaming Hub Management ───────────────────────────────────────────────

export function StaffGamingHub({ staff, store, patchGamingHubItem }: { staff: any; store: DashboardStore; patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void }) {
  const [editing, setEditing] = useState<Partial<GamingHubItem> | null>(null);
  const [search, setSearch] = useState("");
  const items = store.gamingHub || [];
  const filtered = items.filter(item => `${item.title} ${item.category} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);

  // Staff can only view and moderate comments, cannot create/edit content
  const visibleItems = items.filter(item => item.status !== "draft");

  const pendingComments = items.reduce((sum, item) => sum + (item.comments || []).filter(comment => comment.status === "pending").length, 0);

  const moderateComment = (item: GamingHubItem, commentId: string, status: "approved" | "rejected") => {
    patchGamingHubItem(item.id, {
      comments: item.comments.map(comment => comment.id === commentId ? { ...comment, status } : comment)
    });
    toast.success(`Comment ${status === "approved" ? "approved" : "rejected"}`);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Staff View Only - Read Only Management */}
      <div className="glass-card" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Gamepad2 size={20} style={{ color: "#FF1F45" }} />
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", color: "white", margin: "0", fontSize: 18 }}>
            Gaming Hub Management - Staff View
          </h3>
        </div>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#888", fontSize: 14, margin: "0 0 16 0" }}>
          As staff, you can view published gaming hub content, monitor performance, and moderate customer comments.
          Full content creation is available in Admin dashboard.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
          <KPICard label="Total Published" value={visibleItems.length} icon={Eye} color="#00cc66" />
          <KPICard label="Total Views" value={totalViews} icon={BarChart3} color="#00b4ff" />
          <KPICard label="Pending Comments" value={pendingComments} icon={MessageSquare} color="#a855f7" />
        </div>
      </div>

      <SectionCard
        title="Published Gaming Content"
        subtitle={`${visibleItems.length} published posts`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                outline: "none",
                width: 200
              }}
            />
          </div>
        }
      >
        <DataTable
          rowKey={item => item.id}
          data={filtered}
          columns={[
            { key: "content", label: "Content", render: item => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {item.thumbnailImage || item.coverImage ? (
                  <img
                    src={item.thumbnailImage || item.coverImage}
                    alt={item.title}
                    style={{
                      width: 60,
                      height: 45,
                      objectFit: "cover",
                      borderRadius: 8
                    }}
                  />
                ) : null}
                <div>
                  <b style={{ color: "white" }}>{item.title}</b>
                  <br />
                  <span style={{ color: "#888", fontSize: 11 }}>{item.category}</span>
                </div>
              </div>
            ) },
            { key: "type", label: "Type", render: item => GAMING_TYPES.find(t => t.value === item.type)?.label || item.type },
            { key: "status", label: "Status", render: item => <StatusBadge status={item.status} /> },
            { key: "visibility", label: "Features", render: item => [
              item.featured ? "Featured" : "",
              item.trending ? "Trending" : "",
              item.showInExclusiveOffers ? "Offer" : "",
              item.showInSignatureMachines ? "Build" : "",
            ].filter(Boolean).join(" • ") || "Standard" },
            { key: "analytics", label: "Performance", render: item => (
              <span style={{ color: "#ccc" }}>
                {item.views} views · {item.reads} reads · {item.shares} shares
              </span>
            ) },
            { key: "actions", label: "", render: item => (
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
            ) },
          ]}
        />

        {filtered.length === 0 && (
          <EmptyState
            icon={<Gamepad2 size={24} />}
            title="No published content yet"
            subtitle="Published gaming content will appear here for you to manage and monitor."
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
                <div style={{ display: "flex", alignItems: center, gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontSize: 14 }}>{comment.customerName.charAt(0)}</span>
                  </div>
                  <div>
                    <b style={{ color: "white" }}>{comment.customerName}</b>
                    <span style={{ color: "#666", fontSize: 12, marginLeft: 8 }}>On: {item.title}</span>
                  </div>
                </div>
                <p style={{
                  margin: "8px 0",
                  color: "#ccc",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  lineHeight: 1.5
                }}>
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
              subtitle="Customer comments and reviews requiring approval will appear here."
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Supporting Components ─────────────────────────────────────────────────────

// Image Upload Component for Staff (Read-only version)
function StaffImageUpload({ images = [], onImages }: { images: string[]; onImages: (files: FileList) => void }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 11,
        color: "#888",
        letterSpacing: 1.2,
        textTransform: "uppercase"
      }}>
        Upload Images (Staff View)
        <input
          type="file"
          accept="image/*"
          multiple
          disabled
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 8,
            padding: 10,
            color: "#666",
            opacity: 0.6
          }}
        />
      </label>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
          {images.map((src, index) => (
            <div key={index} style={{
              width: 80,
              height: 80,
              background: "#1a1a1a",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24
            }}>
              🖼️
            </div>
          ))}
        </div>
      )}
      <p style={{ color: "#666", fontSize: 11, margin: "8 0 0 0" }}>
        Note: Staff cannot upload images. Contact admin for content creation.
      </p>
    </div>
  );
}
