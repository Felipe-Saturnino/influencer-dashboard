import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import type { Role } from "../../../../types";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { CorpoHtmlInformativo } from "../../../../components/conteudo/CorpoHtmlInformativo";
import { getHomeStaffFeedNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeInformativos } from "../hooks/useHomeInformativos";
import { useHomeStaffLidoCollapse } from "../hooks/useHomeStaffLidoCollapse";
import { HomeStaffFeedCard } from "./HomeStaffFeedCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "./homeSharedUi";

function rodapeAutorData(autorNome: string, dataIso: string | null) {
  const dataFmt = dataIso ? fmtDataColunaGerenciamento(dataIso) : "—";
  return autorNome ? `${autorNome} · ${dataFmt}` : dataFmt;
}

export function InformacoesStaffHome({
  perfil,
  sectionIdPrefix,
}: {
  perfil: Role;
  sectionIdPrefix: string;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const publicadoDesdeIso = useMemo(() => getHomeStaffFeedNovidadeDesdeIso(), []);
  const { loading, erro, lista } = useHomeInformativos(perfil, { publicadoDesdeIso });
  const { isRecolhido, marcarLido, expandir } = useHomeStaffLidoCollapse(user?.id, "informativo");
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-info-title`;

  if (!loading && !erro && lista.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Informações
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) => (
            <li key={item.id}>
              <HomeStaffFeedCard
                title={item.assunto}
                recolhido={isRecolhido(item.id)}
                onExpandir={() => expandir(item.id)}
                onLiEOcultar={() => marcarLido(item.id)}
                rodape={rodapeAutorData(item.autorNome, item.published_at)}
              >
                <CorpoHtmlInformativo html={item.descricao} color={t.text} />
              </HomeStaffFeedCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
