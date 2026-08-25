import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2, Wrench, LayoutTemplate } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SelectComIcone,
} from "../../../components/dashboard";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import {
  buildMesesItensAlocados,
  chaveEstudioOs,
  fetchEstudiosItensAlocados,
  fetchItensSetNoLocal,
  fetchLimpezasItensAlocados,
  fetchManutencoesItensAlocados,
  fetchMesasItensAlocados,
  ITENS_ALOCADOS_LOCAIS_FIXOS,
  labelMesaFiltro,
  slugFromChaveEstudioOs,
  type ItemAlocadoSetRow,
  type LimpezaRow,
  type ManutencaoRegRow,
  type MesaItensAlocadosOption,
} from "../../../lib/techOpsItensAlocados";
import { AbaSet } from "./AbaSet";
import { AbaManutencaoPainel } from "./AbaManutencao";

type AbaIa = "set" | "manutencao";

const ABAS: readonly AbaIa[] = ["set", "manutencao"];
const MESA_TODAS = "todas";

const ERRO_CARREGAR =
  "Não foi possível carregar os itens alocados. Se o problema persistir, entre em contato com o suporte.";

export default function TechOpsItensAlocados() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("tech_ops_itens_alocados");
  const [aba, setAba] = useRouteTab<AbaIa>("tech_ops_itens_alocados", "set", ABAS);

  const meses = useMemo(() => buildMesesItensAlocados(), []);
  const [mesKey, setMesKey] = useState(() => meses[0]?.key ?? "");

  const [estudios, setEstudios] = useState<{ slug: string; nome: string }[]>([]);
  const [locais, setLocais] = useState<{ chave: string; label: string; tipo: "estudio" | "fixo" }[]>([]);
  const [idxLocal, setIdxLocal] = useState(0);
  const [mesas, setMesas] = useState<MesaItensAlocadosOption[]>([]);
  const [mesaId, setMesaId] = useState(MESA_TODAS);

  const [itens, setItens] = useState<ItemAlocadoSetRow[]>([]);
  const [limpezas, setLimpezas] = useState<LimpezaRow[]>([]);
  const [manutencoes, setManutencoes] = useState<ManutencaoRegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const podeVer = perm.canView === "sim" || perm.canView === "proprios";
  const podeCriar = perm.canCriarOk;

  const estudioNomePorSlug = useMemo(
    () => Object.fromEntries(estudios.map((e) => [e.slug, e.nome])),
    [estudios],
  );

  const localAtual = locais[idxLocal] ?? null;
  const localChave = localAtual?.chave ?? "";
  const ehEstudio = localAtual?.tipo === "estudio";
  const estudioSlug = ehEstudio ? slugFromChaveEstudioOs(localChave) : null;

  const localLabel = useMemo(() => {
    if (!localAtual) return "";
    if (!ehEstudio) return localAtual.label;
    if (mesaId === MESA_TODAS) return `${localAtual.label} · Todas Mesas`;
    const m = mesas.find((x) => x.id === mesaId);
    return m
      ? `${localAtual.label} · ${labelMesaFiltro(m.nome_mesa, m.numero_mesa)}`
      : localAtual.label;
  }, [localAtual, ehEstudio, mesaId, mesas]);

  const carregarCatalogo = useCallback(async () => {
    const est = await fetchEstudiosItensAlocados();
    setEstudios(est);
    const lista = [
      ...est.map((e) => ({ chave: chaveEstudioOs(e.slug), label: e.nome, tipo: "estudio" as const })),
      ...ITENS_ALOCADOS_LOCAIS_FIXOS.map((l) => ({ chave: l.chave as string, label: l.label, tipo: "fixo" as const })),
    ];
    setLocais(lista);
    setIdxLocal(0);
  }, []);

  const carregarDados = useCallback(async () => {
    if (!localChave) return;
    setLoading(true);
    setErro(null);
    try {
      const mesaFiltro = mesaId !== MESA_TODAS ? mesaId : null;
      const [setRows, limp, manut] = await Promise.all([
        fetchItensSetNoLocal(localChave),
        fetchLimpezasItensAlocados({ localChave, mesKey, mesaId: mesaFiltro }),
        fetchManutencoesItensAlocados({ localChave, mesKey, mesaId: mesaFiltro }),
      ]);
      setItens(setRows);
      setLimpezas(limp);
      setManutencoes(manut);
    } catch (e) {
      console.error("Itens Alocados: falha ao carregar", e);
      setErro(ERRO_CARREGAR);
      setItens([]);
      setLimpezas([]);
      setManutencoes([]);
    } finally {
      setLoading(false);
    }
  }, [localChave, mesKey, mesaId]);

  useEffect(() => {
    if (perm.loading || !podeVer) return;
    void (async () => {
      try {
        await carregarCatalogo();
      } catch (e) {
        console.error("Itens Alocados: falha ao carregar estúdios", e);
        setErro(ERRO_CARREGAR);
      }
    })();
  }, [perm.loading, podeVer, carregarCatalogo]);

  useEffect(() => {
    if (!estudioSlug) {
      setMesas([]);
      setMesaId(MESA_TODAS);
      return;
    }
    let cancel = false;
    void (async () => {
      try {
        const m = await fetchMesasItensAlocados(estudioSlug);
        if (cancel) return;
        setMesas(m);
        setMesaId(MESA_TODAS);
      } catch (e) {
        console.error("Itens Alocados: falha ao carregar mesas", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [estudioSlug]);

  useEffect(() => {
    if (perm.loading || !podeVer || !localChave) return;
    void carregarDados();
  }, [perm.loading, podeVer, localChave, carregarDados]);

  if (perm.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const tabs = [
    { id: "set" as const, label: "Set", icon: <LayoutGrid {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "manutencao" as const, label: "Manutenção", icon: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader
        icon={<PageMenuIcon pageKey="tech_ops_itens_alocados" />}
        title={getPageMenuLabel("tech_ops_itens_alocados")}
        subtitle={getPageCanonicalSubtitle("tech_ops_itens_alocados")}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div className="app-marketplace-filtro-minhas">
          <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
          <div className="app-marketplace-filtro-minhas__centro" style={getFilterBarRowStyle({ width: "100%" })}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }} role="group" aria-label="Local">
              <button
                type="button"
                aria-label="Local anterior"
                disabled={idxLocal === 0}
                onClick={() => setIdxLocal((i) => Math.max(0, i - 1))}
                style={getCarouselBtnNavStyle(t, idxLocal === 0)}
              >
                <ChevronLeft size={14} aria-hidden />
              </button>
              <span style={getCarouselPeriodLabelStyle(t, { minWidth: 180 })}>
                {localAtual?.label ?? "—"}
              </span>
              <button
                type="button"
                aria-label="Próximo local"
                disabled={idxLocal >= locais.length - 1}
                onClick={() => setIdxLocal((i) => Math.min(locais.length - 1, i + 1))}
                style={getCarouselBtnNavStyle(t, idxLocal >= locais.length - 1)}
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            </div>

            {ehEstudio ? (
              <SelectComIcone
                icon={<LayoutTemplate size={15} strokeWidth={2} aria-hidden />}
                label="Mesas"
                value={mesaId}
                onChange={setMesaId}
                pill
                minWidth={200}
              >
                <option value={MESA_TODAS}>Todas Mesas</option>
                {mesas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {labelMesaFiltro(m.nome_mesa, m.numero_mesa)}
                  </option>
                ))}
              </SelectComIcone>
            ) : null}

            {aba === "manutencao" ? (
              <SelectComIcone
                icon={FilterBarIcons.historico}
                label="Mês"
                value={mesKey}
                onChange={setMesKey}
                pill
                minWidth={180}
              >
                {meses.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </SelectComIcone>
            ) : null}
          </div>
          <div className="app-marketplace-filtro-minhas__cta">
            <AjudaContextualAcoes pageKey="tech_ops_itens_alocados" />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Abas Itens Alocados"
          style={getFilterBarRowStyle({ width: "100%", marginTop: 10 })}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabs.map((tb) => tb.id),
              setAba,
              (k) => `tab-ia-${k}`,
            )
          }
        >
          {tabs.map((tb) => (
            <FiltroBarTabButton
              key={tb.id}
              id={`tab-ia-${tb.id}`}
              active={aba === tb.id}
              aria-controls={`panel-ia-${tb.id}`}
              onClick={() => setAba(tb.id)}
              icon={tb.icon}
            >
              {tb.label}
            </FiltroBarTabButton>
          ))}
        </div>
      </div>

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 14 }}>
          {erro}
        </div>
      ) : null}

      {aba === "set" ? (
        <div id="panel-ia-set" role="tabpanel" aria-labelledby="tab-ia-set">
          <AbaSet
            itens={itens}
            loading={loading}
            localLabel={localLabel}
            localChave={localChave}
            mesaId={mesaId === MESA_TODAS ? null : mesaId}
            autorNome={user?.name?.trim() || user?.email || "Usuário"}
            estudioNomePorSlug={estudioNomePorSlug}
            podeCriar={podeCriar}
            onReload={() => void carregarDados()}
          />
        </div>
      ) : (
        <div id="panel-ia-manutencao" role="tabpanel" aria-labelledby="tab-ia-manutencao">
          <AbaManutencaoPainel
            limpezas={limpezas}
            manutencoes={manutencoes}
            loading={loading}
            podeCriar={podeCriar}
          />
        </div>
      )}
    </div>
  );
}
