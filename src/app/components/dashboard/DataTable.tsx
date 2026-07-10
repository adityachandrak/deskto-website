import { type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  mobileCardBreakpoint?: boolean;
}

export function DataTable<T>({ columns, data, onRowClick, emptyMessage = "No records yet.", rowKey, mobileCardBreakpoint = true }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#666", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
        {emptyMessage}
      </div>
    );
  }
  return (
    <>
    <div className={mobileCardBreakpoint ? "data-table-scroll data-table-desktop" : "data-table-scroll"} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {columns.map(c => (
              <th
                key={c.key}
                style={{
                  padding: "10px 14px",
                  textAlign: c.align || "left",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 9,
                  color: "#888",
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? (e) => {
                // Don't trigger row click if clicking on a button or link
                const target = e.target as HTMLElement;
                if (target.tagName === "BUTTON" || target.tagName === "A" || target.closest("button") || target.closest("a")) {
                  return;
                }
                onRowClick(row);
              } : undefined}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = "rgba(255,31,69,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding: "12px 14px", color: "#ddd", textAlign: c.align || "left" }}>
                  {c.render ? c.render(row, i) : String((row as any)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {mobileCardBreakpoint && (
      <div className="data-table-mobile-cards">
        {data.map((row, i) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className="data-table-mobile-card"
            style={{
              width: "100%",
              textAlign: "left",
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.035)",
              borderRadius: 10,
              padding: 12,
              color: "#ddd",
              display: "grid",
              gap: 9,
              cursor: onRowClick ? "pointer" : "default",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {columns.map(c => {
              const content = c.render ? c.render(row, i) : String((row as any)[c.key] ?? "");
              return (
                <div key={c.key} style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  {c.label && (
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#777", letterSpacing: 1.2, textTransform: "uppercase" }}>
                      {c.label}
                    </div>
                  )}
                  <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{content}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    )}
    </>
  );
}
