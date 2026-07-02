import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/app/components/BrandMark";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  active: string;
  onSelect: (key: string) => void;
  brandLabel: string;
  brandColor: string;
  roleLabel: string;
}

export function DashboardSidebar({ groups, active, onSelect, brandLabel, brandColor, roleLabel }: SidebarProps) {
  const goHome = () => {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <aside className="dash-sidebar">
      <button
        type="button"
        onClick={goHome}
        aria-label="Go to DESKTO home"
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "0 6px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
      >
        <div style={{ filter: `drop-shadow(0 0 10px ${brandColor}55)`, flexShrink: 0 }}>
          <BrandMark size={36} />
        </div>
        <div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", fontWeight: 800, letterSpacing: 1 }}>{brandLabel}</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>{roleLabel}</div>
        </div>
      </button>

      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 96px)" }}>
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{ padding: "0 8px 6px", fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "#555", letterSpacing: 1.6, textTransform: "uppercase" }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <div
                  key={item.key}
                  className={`dash-sidebar-link${isActive ? " active" : ""}`}
                  onClick={() => onSelect(item.key)}
                  style={{ justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 8,
                      background: brandColor,
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: 999,
                      minWidth: 18,
                      textAlign: "center",
                    }}>
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
