import { type ReactNode, useState, useEffect, useMemo } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { DashboardSidebar, type NavGroup } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import type { AuthUser } from "../../lib/currentUser";

interface DashboardLayoutProps {
  user: AuthUser;
  groups: NavGroup[];
  active: string;
  onTabChange: (key: string) => void;
  title: string;
  pageTitle: string;
  children: ReactNode;
  unreadCount: number;
  searchQuery?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  badgeCounts?: Partial<Record<string, number>>;
}

function getInitialHash(): string {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace("#", "");
  return h || "overview";
}

function setHash(key: string) {
  if (typeof window === "undefined") return;
  const url = window.location.pathname + window.location.search + "#" + key;
  window.history.replaceState(null, "", url);
}

export function DashboardLayout({
  user, groups, active, onTabChange, title, pageTitle, children, unreadCount,
  searchQuery, onSearch, searchPlaceholder, badgeCounts,
}: DashboardLayoutProps) {
  // Hash sync
  useEffect(() => {
    const onHash = () => {
      const h = getInitialHash();
      onTabChange(h);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (key: string) => {
    setHash(key);
    onTabChange(key);
  };

  // Inject badge counts
  const groupsWithBadges = useMemo<NavGroup[]>(() => {
    if (!badgeCounts) return groups;
    return groups.map(g => ({
      ...g,
      items: g.items.map(it => ({ ...it, badge: badgeCounts[it.key] })),
    }));
  }, [groups, badgeCounts]);

  return (
    <div className="dash-shell">
      <DashboardSidebar
        groups={groupsWithBadges}
        active={active}
        onSelect={handleSelect}
        brandLabel="DESKTO"
        brandColor="#FF1F45"
        roleLabel={title}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <DashboardTopbar
          user={user}
          unreadCount={unreadCount}
          accentColor="#FF1F45"
          pageTitle={pageTitle}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
        />
        <div className="dash-main">
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }}
              className="glass-pill glass-pill-outline glass-pill-sm"
              style={{ textDecoration: "none" }}
            >
              <ArrowLeft size={11} /> <Home size={11} /> Back to site
            </a>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888" }}>
              Signed in as <span style={{ color: "white" }}>{user.name}</span> · {user.email}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
