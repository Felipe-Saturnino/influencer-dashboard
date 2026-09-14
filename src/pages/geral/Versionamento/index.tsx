import { useMemo, useState } from "react";
import { ChevronRight, GitCommitHorizontal, LayoutGrid } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { PageHeader } from "../../../components/PageHeader";
import { PAGE_HEADER_ICON_PROPS } from "../../../lib/pageHeaderStyles";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import {
  FiltroBarCampoSelect,
  FiltroSemanticoTabPill,
  FiltroStatusSemanticoPill,
  SectionTitle,
} from "../../../components/dashboard";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { AppPageLink } from "../../../components/AppPageLink";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { FILTRO_BAR_ICON_PROPS } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import {
  VERSIONAMENTO_TIPO_COR,
  VERSIONAMENTO_TIPO_LABEL,
  VERSIONAMENTO_TIPOS,
  MSG_VERSIONAMENTO_VAZIO,
  MSG_VERSIONAMENTO_FILTRO,
  chipPaginaVersionamento,
  contarTiposVisiveis,
  itensVisiveisRelease,
  pageKeyLinkVersionamento,
  releaseMaisRecente,
  releaseTemItensVisiveis,
  releasesHistorico,
  secoesPresentesCatalogo,
  tituloHistoricoRelease,
  type FiltroVersionamento,
  type VersionamentoItem,
  type VersionamentoRelease,
  type VersionamentoTipo,
} from "../../../lib/versionamento";
import { VERSIONAMENTO_RELEASES } from "./releases";

function rotuloContagem(n: number, tipo: VersionamentoTipo): string | null {
  if (n <= 0) return null;
  return `${n} ${VERSIONAMENTO_TIPO_LABEL[tipo].toLowerCase()}`;
}

function CardMudanca({ item }: { item: VersionamentoItem }) {
  const { theme: t } = useApp();
  const cor = VERSIONAMENTO_TIPO_COR[item.tipo];
  const pageLink = pageKeyLinkVersionamento(item);

  return (
    <div
      className="app-versionamento-change"
      style={{
        padding: "12px 14px",
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        background: t.inputBg,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: "4px 8px",
          borderRadius: 20,
          marginTop: 2,
          width: "fit-content",
          background: `${cor}22`,
          color: cor,
          border: `1px solid ${cor}44`,
          fontFamily: FONT.body,
        }}
      >
        {VERSIONAMENTO_TIPO_LABEL[item.tipo]}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: t.text, fontFamily: FONT.body }}>
          {item.titulo}
        </div>
        <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, margin: 0, fontFamily: FONT.body }}>
          {item.descricao}
          {pageLink ? (
            <>
              {" "}
              <AppPageLink pageKey={pageLink} style={{ fontSize: 12, fontWeight: 700 }}>
                Acesse a página AQUI
              </AppPageLink>
            </>
          ) : null}
        </p>
        <span
          style={{
            display: "inline-flex",
            marginTop: 8,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 20,
            background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
            color: "var(--brand-primary, #7c3aed)",
            border: "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 22%, transparent)",
            fontFamily: FONT.body,
          }}
        >
          {chipPaginaVersionamento(item)}
        </span>
      </div>
    </div>
  );
}

function ListaCards({ itens }: { itens: VersionamentoItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {itens.map((item) => (
        <CardMudanca key={`${item.tipo}-${item.titulo}`} item={item} />
      ))}
    </div>
  );
}

export default function Versionamento() {
  const { theme: t, permissions } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("versionamento");
  const [tipo, setTipo] = useState<"todos" | VersionamentoTipo>("todos");
  const [secao, setSecao] = useState("");
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Set<number>>(() => new Set());

  const filtro: FiltroVersionamento = useMemo(
    () => ({ tipo, secao, busca }),
    [tipo, secao, busca],
  );

  const recente = useMemo(() => releaseMaisRecente(VERSIONAMENTO_RELEASES), []);
  const historico = useMemo(() => releasesHistorico(VERSIONAMENTO_RELEASES, recente), [recente]);
  const secoes = useMemo(
    () => secoesPresentesCatalogo(VERSIONAMENTO_RELEASES, permissions),
    [permissions],
  );

  const itensRecente = recente ? itensVisiveisRelease(recente, filtro, permissions) : [];
  const recenteVisivel = recente != null && itensRecente.length > 0;

  const historicoVisivel = useMemo(
    () =>
      historico
        .filter((r) => releaseTemItensVisiveis(r, filtro, permissions))
        .map((r) => ({ release: r, itens: itensVisiveisRelease(r, filtro, permissions) })),
    [historico, filtro, permissions],
  );

  const buscaAtiva = busca.trim().length > 0;
  const catalogoVazio = VERSIONAMENTO_RELEASES.length === 0;
  const semResultado = !catalogoVazio && !recenteVisivel && historicoVisivel.length === 0;

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  function toggleTipo(next: VersionamentoTipo) {
    setTipo((atual) => (atual === next ? "todos" : next));
  }

  function toggleHistorico(numero: number) {
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero);
      else next.add(numero);
      return next;
    });
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<GitCommitHorizontal {...PAGE_HEADER_ICON_PROPS} />}
        title={getPageMenuLabel("versionamento")}
        subtitle={getPageCanonicalSubtitle("versionamento")}
      />

      <div style={filterBox}>
        <div style={getFilterBarRowStyle()} role="group" aria-label="Tipo de mudança">
          <FiltroSemanticoTabPill
            label="Todos"
            semanticColor={brand.primary}
            active={tipo === "todos"}
            onClick={() => setTipo("todos")}
            aria-label="Mostrar todos os tipos"
          />
          {VERSIONAMENTO_TIPOS.map((tp) => (
            <FiltroStatusSemanticoPill
              key={tp}
              label={VERSIONAMENTO_TIPO_LABEL[tp]}
              semanticColor={VERSIONAMENTO_TIPO_COR[tp]}
              active={tipo === tp}
              onClick={() => toggleTipo(tp)}
            />
          ))}
        </div>
        <div style={{ ...getFilterBarRowStyle(), marginTop: 10 }}>
          <FiltroBarCampoSelect
            value={secao}
            onChange={setSecao}
            options={secoes.map((s) => ({ value: s, label: s }))}
            icon={<LayoutGrid {...FILTRO_BAR_ICON_PROPS} />}
            ariaLabel="Seções"
            todasValue=""
            todasLabel="Todas Seções"
            minWidth={200}
          />
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={PAGE_SEARCH.versionamento}
            aria-label="Buscar por palavras-chave no título, texto e blocos"
            wrapperStyle={{ width: "min(360px, 100%)" }}
          />
        </div>
      </div>

      {catalogoVazio ? (
        <div style={pageBox}>
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            {MSG_VERSIONAMENTO_VAZIO}
          </div>
        </div>
      ) : null}

      {semResultado ? (
        <div style={pageBox}>
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            {MSG_VERSIONAMENTO_FILTRO}
          </div>
        </div>
      ) : null}

      {recenteVisivel && recente ? (
        <article
          style={{
            ...pageBox,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 20,
                background: "#22c55e22",
                color: "#22c55e",
                border: "1px solid #22c55e44",
                fontFamily: FONT.body,
              }}
            >
              Recente
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: brand.primary,
                letterSpacing: "0.04em",
                fontFamily: FONT.body,
              }}
            >
              Release #{recente.numero}
            </span>
            <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{recente.data}</span>
          </div>
          <h2
            style={{
              fontFamily: FONT_TITLE,
              fontSize: 18,
              fontWeight: 800,
              margin: "6px 0 8px",
              lineHeight: 1.3,
              color: t.text,
            }}
          >
            {recente.titulo}
          </h2>
          <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.55, margin: "0 0 16px", fontFamily: FONT.body }}>
            {recente.resumo}
          </p>
          <ListaCards itens={itensRecente} />
        </article>
      ) : null}

      {historicoVisivel.length > 0 ? (
        <div style={pageBox}>
          <SectionTitle sub="Releases anteriores, da mais recente para a mais antiga">
            Histórico de releases
          </SectionTitle>
          <div>
            {historicoVisivel.map(({ release, itens }, idx) => (
              <BlocoHistorico
                key={release.numero}
                release={release}
                itens={itens}
                aberto={buscaAtiva || abertas.has(release.numero)}
                onToggle={() => toggleHistorico(release.numero)}
                ultimo={idx === historicoVisivel.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlocoHistorico({
  release,
  itens,
  aberto,
  onToggle,
  ultimo,
}: {
  release: VersionamentoRelease;
  itens: VersionamentoItem[];
  aberto: boolean;
  onToggle: () => void;
  ultimo: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const counts = contarTiposVisiveis(itens);

  return (
    <article
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        overflow: "hidden",
        background: t.cardBg,
        marginBottom: ultimo ? 0 : 12,
      }}
    >
      <button
        type="button"
        aria-expanded={aberto}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          background: "transparent",
          border: 0,
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
          borderBottom: aberto ? `1px solid ${t.cardBorder}` : "none",
          fontFamily: FONT.body,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: brand.primary,
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 13,
            fontWeight: 700,
            flex: 1,
            lineHeight: 1.4,
            minWidth: 0,
            margin: 0,
            color: t.text,
          }}
        >
          {tituloHistoricoRelease(release)}
        </h3>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {(["novo", "melhoria", "correcao"] as const).map((tp) => {
            const label = rotuloContagem(counts[tp], tp);
            if (!label) return null;
            return (
              <span
                key={tp}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: t.inputBg,
                  color: t.textMuted,
                  border: `1px solid ${t.cardBorder}`,
                }}
              >
                {label}
              </span>
            );
          })}
        </span>
        <ChevronRight
          size={14}
          color={t.textMuted}
          aria-hidden
          style={{
            flexShrink: 0,
            transform: aberto ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {aberto ? (
        <div style={{ padding: "16px 18px 18px" }}>
          <ListaCards itens={itens} />
        </div>
      ) : null}
    </article>
  );
}
