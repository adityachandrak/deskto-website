import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: 0 }}>{title}</h4>
        {hint && <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#888", margin: "6px 0 0" }}>{hint}</p>}
      </div>
      {action}
    </div>
  );
}