import { useState } from "react";
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

  if (err || !src) {
    return (
      <span style={{ fontSize: size * 0.65, color: PLAT_COLOR[plataforma] ?? "#fff" }}>
        ●
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={plataforma}
      width={size}
      height={size}
      onError={() => setErr(true)}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
