import type { AcademyPortalAnexoRef } from "../../../lib/academyPortalPostagemFiles";
import { PortalAcademyAssetLink } from "./PortalAcademyAssetLink";
import { FONT } from "../../../constants/theme";

export function PortalAcademyAnexosLista({
  anexos,
  color,
}: {
  anexos: AcademyPortalAnexoRef[];
  color: string;
}) {
  if (!anexos.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, fontFamily: FONT.body }}>
      {anexos.map((anexo) => (
        <p key={anexo.path} style={{ margin: 0, fontSize: 13 }}>
          <PortalAcademyAssetLink
            storagePath={anexo.path}
            label={`Ver anexo (${anexo.nome})`}
            color={color}
          />
        </p>
      ))}
    </div>
  );
}
