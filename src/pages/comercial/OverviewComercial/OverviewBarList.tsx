import { FONT } from "../../../constants/theme";

export function OverviewBarList({
  items,
  t,
  gradFallback,
}: {
  items: { key: string; label: string; count: number; color: string; muted?: boolean }[];
  t: { text: string; textMuted: string; inputBg: string };
  gradFallback?: string;
}) {
  const maxVal = Math.max(1, ...items.map((i) => i.count));
  if (items.every((i) => i.count === 0)) {
    return (
      <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        Sem dados para o período selecionado.
      </p>
    );
  }
  return (
    <>
      {items.map((item) => (
        <div
          key={item.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            fontFamily: FONT.body,
          }}
        >
          <span
            style={{
              width: 120,
              fontSize: 11,
              color: item.muted ? t.textMuted : t.textMuted,
              fontWeight: item.muted ? 500 : 600,
            }}
            title={item.label}
          >
            {item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 10,
              background: t.inputBg,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(item.count / maxVal) * 100}%`,
                borderRadius: 999,
                background: item.color || gradFallback || "#6b7280",
                opacity: 0.85,
              }}
            />
          </div>
          <span style={{ width: 28, fontSize: 11, fontWeight: 700, textAlign: "right" }}>
            {item.count}
          </span>
        </div>
      ))}
    </>
  );
}
