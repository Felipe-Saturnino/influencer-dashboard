import { useApp } from "../context/AppContext";
import { FONT, BASE_COLORS } from "../constants/theme";

interface Props {
  label?: string;
}

export default function UnderConstruction({ label }: Props) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "400px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "52px", marginBottom: "20px" }}>🚧</div>
        <p style={{ fontSize: "18px", fontWeight: 800, color: t.text, margin: 0, textTransform: "uppercase", letterSpacing: "1px", fontFamily: FONT.title }}>
          Em construção
        </p>
        {label && (
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "8px", fontFamily: FONT.body }}>
            <strong style={{ color: BASE_COLORS.purple }}>{label}</strong> será montada aqui na próxima etapa.
          </p>
        )}
      </div>
    </div>
  );
}
