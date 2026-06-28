import { type ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}

export function SectionCard({ title, subtitle, action, children, padded = true }: SectionCardProps) {
  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            {title && (
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", letterSpacing: 1, margin: 0 }}>{title}</h3>
            )}
            {subtitle && (
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#888", margin: "4px 0 0" }}>{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 20 : 0 }}>{children}</div>
    </div>
  );
}