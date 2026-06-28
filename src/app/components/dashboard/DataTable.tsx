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
}

export function DataTable<T>({ columns, data, onRowClick, emptyMessage = "No records yet.", rowKey }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#666", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
        {emptyMessage}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
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
              onClick={onRowClick ? () => onRowClick(row) : undefined}
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
  );
}