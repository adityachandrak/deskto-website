import { type ReactNode } from "react";
import { X } from "lucide-react";
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
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function DashboardSidebar({ groups, active, onSelect, brandLabel, brandColor, roleLabel, mobileOpen, onCloseMobile }: SidebarProps) {
  const goHome = () => {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSelect = (key: string) => {
    onSelect(key);
    onCloseMobile?.();
  };

  return (
    <>
    {mobileOpen && <div className="dash-sidebar-backdrop" onClick={onCloseMobile} />}
    <aside className={`dash-sidebar${mobileOpen ? " open" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 8 }}>
        <button
          type="button"
          onClick={goHome}
          aria-label="Go to DESKTO home"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0 }}
        >
          <div style={{ filter: `drop-shadow(0 0 10px ${brandColor}55)`, flexShrink: 0 }}>
            <BrandMark size={36} />
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", fontWeight: 800, letterSpacing: 1 }}>{brandLabel}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: "#888", letterSpacing: 1.2, textTransform: "uppercase" }}>{roleLabel}</div>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close menu"
          className="dash-sidebar-close"
          style={{ display: "none", flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#aaa", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="dash-sidebar-nav" style={{ overflowY: "auto", maxHeight: "calc(100vh - 96px)" }}>
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
                  onClick={() => handleSelect(item.key)}
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
    </>
  );
}
