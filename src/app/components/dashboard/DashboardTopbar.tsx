import { useState, useRef, useEffect } from "react";
import { Bell, LogOut, Search, User, ChevronDown } from "lucide-react";
import type { AuthUser } from "../../lib/currentUser";
import { logout } from "../../lib/currentUser";

interface TopbarProps {
  user: AuthUser;
  unreadCount: number;
  accentColor: string;
  pageTitle: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
}

export function DashboardTopbar({ user, unreadCount, accentColor, pageTitle, onSearch, searchPlaceholder }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const initials = user.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dash-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "white", margin: 0, fontWeight: 700, letterSpacing: 1 }}>
          {pageTitle}
        </h1>
      </div>

      {onSearch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "8px 14px", minWidth: 260, marginRight: 14 }}>
          <Search size={14} color="#888" />
          <input
            type="text"
            placeholder={searchPlaceholder || "Search..."}
            onChange={e => onSearch(e.target.value)}
            style={{
              background: "transparent", border: "none", outline: "none", color: "white", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, width: "100%",
            }}
          />
        </div>
      )}

      <div style={{ position: "relative" }}>
        <button className="glass-pill glass-pill-icon" aria-label="Notifications" style={{ width: 36, height: 36, position: "relative" }}>
          <Bell size={15} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4, background: accentColor, color: "white",
              fontSize: 8, fontFamily: "'Orbitron', sans-serif", fontWeight: 800, borderRadius: 999,
              minWidth: 14, height: 14, padding: "0 3px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div ref={ref} style={{ position: "relative", marginLeft: 14 }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="glass-pill"
          style={{ padding: "6px 10px 6px 6px", display: "flex", alignItems: "center", gap: 8 }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `linear-gradient(135deg, ${accentColor}, #5a0008)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "white", fontWeight: 800,
          }}>
            {initials}
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "white" }}>{user.name.split(" ")[0]}</span>
          <ChevronDown size={12} color="#888" />
        </button>
        {open && (
          <div className="glass-card" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 200, padding: 8, zIndex: 100 }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 6 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "white" }}>{user.name}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888" }}>{user.email}</div>
            </div>
            <div
              className="dash-sidebar-link"
              onClick={() => { setOpen(false); window.history.pushState(null, "", "/dashboard/" + user.role); window.dispatchEvent(new PopStateEvent("popstate")); }}
            >
              <User size={14} /> <span>Profile</span>
            </div>
            <div
              className="dash-sidebar-link"
              onClick={() => { setOpen(false); logout(); }}
              style={{ color: "#FF1F45" }}
            >
              <LogOut size={14} /> <span>Logout</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}