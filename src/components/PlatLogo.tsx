import { useState, type CSSProperties } from "react";
import { PLAT_LOGO, PLAT_LOGO_DARK, PLAT_COLOR } from "../constants/platforms";

export function PlatLogo({
  plataforma,
  size = 14,
  isDark,
}: {
  plataforma: string;
  size?: number;
  isDark: boolean;
}) {
  const [err, setErr] = useState(false);
  const src = isDark ? (PLAT_LOGO_DARK[plataforma] ?? PLAT_LOGO[plataforma]) : PLAT_LOGO[plataforma];

  const wrap: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 0,
  };

  if (err || !src) {
    return (
      <span style={{ ...wrap, fontSize: size * 0.65, color: PLAT_COLOR[plataforma] ?? "#fff", lineHeight: 1 }}>
        ●
      </span>
    );
  }
  return (
    <span style={wrap}>
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setErr(true)}
        style={{ display: "block", flexShrink: 0 }}
      />
    </span>
  );
}
