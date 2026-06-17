import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Building2, LayoutGrid, Shield } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { GestaoUsuariosLoading } from "../GestaoUsuarios/gestaoUsuariosUi";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import {
  FILTRO_BAR_TAB_ICON_SIZE,
  getFilterBarRowStyle,
  getFiltroBarTabButtonStyle,
  handleFiltroBarTabsArrowKeyDown,
} from "../../../lib/filterBarStyles";
import { FiltroBarTabButton } from "../../../components/dashboard/FiltroBarTabButton";
import {
  OPERADORA_FILTRO_TODAS_LABEL,
  OPERADORA_FILTRO_TODAS_VALUE,
} from "../../../components/FiltroOperadoraSelect";
import { nomeOperadoraJoin, type EstudioSpinRow, type MesaSpinCadastroRow } from "./gestaoMesasUi";
import { AbaEstudios } from "./AbaEstudios";
import { AbaMesas } from "./AbaMesas";

const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";

type AbaGestaoEstudios = "estudios" | "mesas";

const TAB_IDS: AbaGestaoEstudios[] = ["estudios", "mesas"];

export default function GestaoMesas() {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("gestao_mesas");
  const [aba, setAba] = useState<AbaGestaoEstudios>("estudios");
  const [rows, setRows] = useState<MesaSpinCadastroRow[]>([]);
  const [estudios, setEstudios] = useState<EstudioSpinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroOperadora, setFiltroOperadora] = useState<string>(OPERADORA_FILTRO_TODAS_VALUE);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [mesasRes, estudiosRes] = await Promise.all([
      supabase
        .from("mesas_spin_cadastro")
        .select(
          "id, operadora_slug, estudio_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, operadoras(nome), estudios_spin(nome)",
        )
        .order("nome_mesa", { ascending: true }),
      supabase
        .from("estudios_spin")
        .select(
          "id, slug, nome, tipo, ativo, created_at, updated_at, estudios_spin_operadoras(operadora_slug, operadoras(nome))",
        )
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (mesasRes.error) {
      console.error(mesasRes.error);
      setRows([]);
    } else {
      setRows((mesasRes.data ?? []) as unknown as MesaSpinCadastroRow[]);
    }

    if (estudiosRes.error) {
      console.error(estudiosRes.error);
      setEstudios([]);
    } else {
      setEstudios((estudiosRes.data ?? []) as unknown as EstudioSpinRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const operadorasOpcoes = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const nome = nomeOperadoraJoin(r) ?? r.operadora_slug;
      m.set(r.operadora_slug, nome);
    }
    for (const e of estudios) {
      for (const j of e.estudios_spin_operadoras ?? []) {
        const o = j.operadoras;
        const nome = o == null ? j.operadora_slug : Array.isArray(o) ? (o[0]?.nome ?? j.operadora_slug) : o.nome;
        m.set(j.operadora_slug, nome);
      }
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [rows, estudios]);

  const operadorasCarrossel = useMemo(
    () => [
      { slug: OPERADORA_FILTRO_TODAS_VALUE, nome: OPERADORA_FILTRO_TODAS_LABEL },
      ...operadorasOpcoes.map(([slug, nome]) => ({ slug, nome })),
    ],
    [operadorasOpcoes],
  );

  const indiceCarrosselOperadora = useMemo(() => {
    const idx = operadorasCarrossel.findIndex((o) => o.slug === filtroOperadora);
    return idx >= 0 ? idx : 0;
  }, [filtroOperadora, operadorasCarrossel]);

  useEffect(() => {
    if (!operadorasCarrossel.some((o) => o.slug === filtroOperadora)) {
      setFiltroOperadora(OPERADORA_FILTRO_TODAS_VALUE);
    }
  }, [operadorasCarrossel, filtroOperadora]);

  const avancarOperadoraCarrossel = useCallback(() => {
    if (operadorasCarrossel.length <= 1) return;
    const next = operadorasCarrossel[(indiceCarrosselOperadora + 1) % operadorasCarrossel.length]!;
    setFiltroOperadora(next.slug);
  }, [indiceCarrosselOperadora, operadorasCarrossel]);

  const retrocederOperadoraCarrossel = useCallback(() => {
    if (operadorasCarrossel.length <= 1) return;
    const prev =
      operadorasCarrossel[
        (indiceCarrosselOperadora - 1 + operadorasCarrossel.length) % operadorasCarrossel.length
      ]!;
    setFiltroOperadora(prev.slug);
  }, [indiceCarrosselOperadora, operadorasCarrossel]);

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <GestaoUsuariosLoading />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body, color: t.textMuted, textAlign: "center", padding: 24 }}>
        {MSG_SEM_PERMISSAO}
      </div>
    );
  }

  const todasOperadorasAtivo = filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE;
  const carrosselOperadoraDesabilitado = operadorasCarrossel.length <= 1;
  const labelCarrosselOperadora =
    operadorasCarrossel.find((o) => o.slug === filtroOperadora)?.nome ?? OPERADORA_FILTRO_TODAS_LABEL;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_mesas" />}
        title={getPageMenuLabel("gestao_mesas")}
        subtitle="Cadastre estúdios e mesas, vincule operadoras e gerencie identificadores por parceiro."
      />

      <div style={getPageFilterBoxStyle(dashBrand, t)}>
        <div style={getFilterBarRowStyle({ width: "100%" })}>
          <button
            type="button"
            aria-label="Operadora anterior"
            disabled={carrosselOperadoraDesabilitado}
            onClick={retrocederOperadoraCarrossel}
            style={getCarouselBtnNavStyle(t, carrosselOperadoraDesabilitado)}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span style={getCarouselPeriodLabelStyle(t, { minWidth: 160 })}>{labelCarrosselOperadora}</span>
          <button
            type="button"
            aria-label="Próxima operadora"
            disabled={carrosselOperadoraDesabilitado}
            onClick={avancarOperadoraCarrossel}
            style={getCarouselBtnNavStyle(t, carrosselOperadoraDesabilitado)}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={todasOperadorasAtivo}
            onClick={() => setFiltroOperadora(OPERADORA_FILTRO_TODAS_VALUE)}
            style={{
              ...getFiltroBarTabButtonStyle(t, dashBrand, todasOperadorasAtivo),
              fontFamily: FONT.body,
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Shield size={16} strokeWidth={2} aria-hidden="true" />
            {OPERADORA_FILTRO_TODAS_LABEL}
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Estúdios ou Mesas"
          onKeyDown={(e) => handleFiltroBarTabsArrowKeyDown(e, TAB_IDS, aba, setAba, "tab-gestao-estudios-")}
          style={{
            ...getFilterBarRowStyle({ width: "100%" }),
            paddingTop: 12,
            marginTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
          }}
        >
          <FiltroBarTabButton
            id="tab-gestao-estudios-estudios"
            active={aba === "estudios"}
            aria-controls="panel-gestao-estudios-estudios"
            onClick={() => setAba("estudios")}
            icon={<Building2 size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
          >
            Estúdios
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-gestao-estudios-mesas"
            active={aba === "mesas"}
            aria-controls="panel-gestao-estudios-mesas"
            onClick={() => setAba("mesas")}
            icon={<LayoutGrid size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
          >
            Mesas
          </FiltroBarTabButton>
        </div>
      </div>

      {aba === "estudios" ? (
        <div id="panel-gestao-estudios-estudios" role="tabpanel" aria-labelledby="tab-gestao-estudios-estudios">
          <AbaEstudios
            filtroOperadora={filtroOperadora}
            estudios={estudios}
            mesas={rows}
            loading={loading}
            perm={perm}
            onRecarregar={() => void carregar()}
          />
        </div>
      ) : (
        <div id="panel-gestao-estudios-mesas" role="tabpanel" aria-labelledby="tab-gestao-estudios-mesas">
          <AbaMesas
            filtroOperadora={filtroOperadora}
            rows={rows}
            estudios={estudios}
            loading={loading}
            perm={perm}
            onRecarregar={() => void carregar()}
          />
        </div>
      )}
    </div>
  );
}
