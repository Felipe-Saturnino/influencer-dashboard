import { FileText, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { CorpoHtmlInformativo } from "../../../../components/conteudo/CorpoHtmlInformativo";
import { BarraReacaoConteudoLigada } from "../../../../components/conteudo/BarraReacaoConteudo";
import { getHomeStaffFeedNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useConteudoReacoes } from "../../../../hooks/useConteudoReacoes";
import { useHomeInformativos } from "../hooks/useHomeInformativos";
import { useHomeStaffLidoCollapse } from "../hooks/useHomeStaffLidoCollapse";
import { HomeStaffFeedCard } from "../shared/HomeStaffFeedCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "../shared/homeSharedUi";

const ICON_PROPS = { size: 16, strokeWidth: 2, "aria-hidden": true as const };

/** Informativos do perfil afiliado — janela 10 dias + «Li e Ocultar». */
export function InformacoesAfiliadoHome({ sectionIdPrefix = "home-afiliado" }: { sectionIdPrefix?: string }) {
  const { theme: t } = useApp();
  const { userId: userIdEfetivo } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const publicadoDesdeIso = useMemo(() => getHomeStaffFeedNovidadeDesdeIso(), []);
  const info = useHomeInformativos("afiliado", { publicadoDesdeIso });
  const { isRecolhido, marcarLido, expandir } = useHomeStaffLidoCollapse(
    userIdEfetivo ?? undefined,
    "informativo",
  );
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-info-title`;

  const chavesReacao = useMemo(
    () => info.lista.map((item) => ({ origem: "informativo" as const, contentId: item.id })),
    [info.lista],
  );
  const reacoes = useConteudoReacoes(chavesReacao);

  if (!info.loading && !info.erro && info.lista.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Informações
      </h2>

      {info.loading && info.lista.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : info.erro && info.lista.length === 0 ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {info.lista.map((item) => (
            <li key={item.id}>
              <HomeStaffFeedCard
                title={item.assunto}
                titleIcon={<FileText {...ICON_PROPS} />}
                recolhido={isRecolhido(item.id)}
                onExpandir={() => expandir(item.id)}
                onLiEOcultar={() => marcarLido(item.id)}
                rodape={
                  item.autorNome
                    ? `${item.autorNome} · ${item.published_at ? fmtDataColunaGerenciamento(item.published_at) : "—"}`
                    : item.published_at
                      ? fmtDataColunaGerenciamento(item.published_at)
                      : "—"
                }
                reacoes={
                  <BarraReacaoConteudoLigada origem="informativo" contentId={item.id} api={reacoes} />
                }
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
