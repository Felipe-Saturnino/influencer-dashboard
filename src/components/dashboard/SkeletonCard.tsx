import type { CSSProperties } from "react";
import { useApp } from "../../context/AppContext";

const PULSE_STYLE: CSSProperties = {
  animation: "skeleton-pulse 1.5s ease-in-out infinite",
  borderRadius: 8,
  background: "rgba(124,58,237,0.10)",
};

export function SkeletonKpiCard() {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, ...PULSE_STYLE, borderRadius: 0 }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, ...PULSE_STYLE }} />
          <div style={{ height: 10, width: 80, ...PULSE_STYLE }} />
        </div>
        <div style={{ height: 22, width: "60%", marginBottom: 6, ...PULSE_STYLE }} />
        <div style={{ height: 11, width: "80%", ...PULSE_STYLE }} />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "10px 12px" }}>
          <div style={{ height: 13, width: i === 0 ? 120 : 60, ...PULSE_STYLE }} />
        </td>
      ))}
    </tr>
  );
}
