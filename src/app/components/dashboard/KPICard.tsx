import { type ReactNode } from "react";

export interface KPICardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  delta?: { value: number; positive: boolean };
  hint?: string;
}

export function KPICard({ label, value, icon, color = "#FF1F45", delta, hint }: KPICardProps) {
  return (
    <div className="glass-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#888", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</span>
        <div
          className="glass-icon-circle"
          style={{ width: 32, height: 32, borderColor: `${color}55`, background: `${color}10`, color }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, color: "white", fontWeight: 800, lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11 }}>
        {delta && (
          <span style={{ color: delta.positive ? "#00cc66" : "#FF1F45" }}>
            {delta.positive ? "▲" : "▼"} {Math.abs(delta.value)}%
          </span>
        )}
        {hint && <span style={{ color: "#666" }}>{hint}</span>}
      </div>
    </div>
  );
}
