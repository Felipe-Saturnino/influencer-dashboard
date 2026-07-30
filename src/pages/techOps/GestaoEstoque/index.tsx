import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Cpu, Dices, Loader2, Package, Tags, Truck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { FILTRO_BAR_ICON_PROPS } from "../../../lib/filterBarIconCatalog";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import {
  FiltroBarTabButton,
  FiltroBarCampoSelect,
  FiltroEstudioSelect,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  type EstudioFiltroOption,
} from "../../../components/dashboard";
import {
  fetchEstoqueEquipamentos,
  fetchEstoqueFornecedores,
  fetchEstoqueItens,
  fetchEstoqueJogoLotes,
  ESTOQUE_EQUIP_CATEGORIAS,
  ESTOQUE_EQUIP_CATEGORIA_LABEL,
  ESTOQUE_ITEM_CATEGORIAS,
  ESTOQUE_ITEM_CATEGORIA_LABEL,
  ESTOQUE_JOGO_CATEGORIAS,
  ESTOQUE_JOGO_CATEGORIA_LABEL,
  type EstoqueEquipamentoRow,
  type EstoqueFornecedorRow,
  type EstoqueItemRow,
  type EstoqueJogoLoteRow,
} from "../../../lib/techOpsEstoque";
import { AbaItens } from "./AbaItens";
import { AbaEquipamentos } from "./AbaEquipamentos";
import { AbaJogo } from "./AbaJogo";
import { AbaFornecedores } from "./AbaFornecedores";

type AbaEstoque = "itens" | "equipamentos" | "jogo" | "fornecedores";

const ABAS: readonly AbaEstoque[] = ["itens", "equipamentos", "jogo", "fornecedores"];

const ERRO_CARREGAR =
  "Não foi possível carregar o estoque. Se o problema persistir, entre em contato com o suporte.";

const BUSCA_PLACEHOLDER: Record<AbaEstoque, string> = {
  itens: "Pesquisar por código, nome, marca ou modelo...",
  equipamentos: "Pesquisar por código, nome, série, marca ou modelo...",
  jogo: "Pesquisar por código ou nome do lote...",
  fornecedores: "Pesquisar por empresa, CNPJ, tipo ou contato...",
};

export default function TechOpsGestaoEstoque() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("tech_ops_estoque");
  const [aba, setAba] = useRouteTab<AbaEstoque>("tech_ops_estoque", "itens", ABAS);

  const [busca, setBusca] = useState("");
  const [filtroEstudio, setFiltroEstudio] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<Record<AbaEstoque, string>>({
    itens: "",
    equipamentos: "",
    jogo: "",
    fornecedores: "",
  });

  const [estudios, setEstudios] = useState<EstudioFiltroOption[]>([]);
  const [itens, setItens] = useState<EstoqueItemRow[]>([]);
  const [equipamentos, setEquipamentos] = useState<EstoqueEquipamentoRow[]>([]);
  const [jogoLotes, setJogoLotes] = useState<EstoqueJogoLoteRow[]>([]);
  const [fornecedores, setFornecedores] = useState<EstoqueFornecedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const podeVer = perm.canView === "sim" || perm.canView === "proprios";

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [it, eq, jl, fo] = await Promise.all([
        fetchEstoqueItens(),
        fetchEstoqueEquipamentos(),
        fetchEstoqueJogoLotes(),
        fetchEstoqueFornecedores(),
      ]);
      setItens(it);
      setEquipamentos(eq);
      setJogoLotes(jl);
      setFornecedores(fo);
    } catch (e) {
      console.error("Gestão de Estoque: falha ao carregar dados", e);
      setErro(ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (perm.loading || !podeVer) return;
    void carregar();
    void supabase
      .from("estudios_spin")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Gestão de Estoque: falha ao carregar estúdios", error);
          return;
        }
        setEstudios((data ?? []).map((e: { slug: string; nome: string }) => ({ slug: e.slug, nome: e.nome })));
      });
  }, [perm.loading, podeVer, carregar]);

  const estudioNomePorSlug = useMemo(
    () => Object.fromEntries(estudios.map((e) => [e.slug, e.nome])),
    [estudios],
  );

  const categoriaOptions = useMemo(() => {
    if (aba === "itens")
      return ESTOQUE_ITEM_CATEGORIAS.map((c) => ({ value: c, label: ESTOQUE_ITEM_CATEGORIA_LABEL[c] }));
    if (aba === "equipamentos")
      return ESTOQUE_EQUIP_CATEGORIAS.map((c) => ({ value: c, label: ESTOQUE_EQUIP_CATEGORIA_LABEL[c] }));
    if (aba === "jogo")
      return ESTOQUE_JOGO_CATEGORIAS.map((c) => ({ value: c, label: ESTOQUE_JOGO_CATEGORIA_LABEL[c] }));
    return [];
  }, [aba]);

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2
              size={24}
              className="app-lucide-spin"
              color="var(--brand-primary, #7c3aed)"
              aria-hidden="true"
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
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

  const tabs: { id: AbaEstoque; label: string; icon: ReactNode }[] = [
    { id: "itens", label: "Itens", icon: <Package {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "equipamentos", label: "Equipamentos", icon: <Cpu {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "jogo", label: "Jogo", icon: <Dices {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "fornecedores", label: "Fornecedores", icon: <Truck {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  const mostrarEstudio = aba !== "fornecedores";
  const mostrarCategoria = aba !== "fornecedores";

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="tech_ops_estoque" />}
        title={getPageMenuLabel("tech_ops_estoque")}
        subtitle={getPageCanonicalSubtitle("tech_ops_estoque")}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div
          role="tablist"
          aria-label="Abas da Gestão de Estoque"
          style={getFilterBarRowStyle({ width: "100%" })}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabs.map((tb) => tb.id),
              setAba,
              (k) => `tab-estoque-${k}`,
            )
          }
        >
          {tabs.map((tb) => (
            <FiltroBarTabButton
              key={tb.id}
              id={`tab-estoque-${tb.id}`}
              active={aba === tb.id}
              aria-controls={`panel-estoque-${tb.id}`}
              onClick={() => setAba(tb.id)}
              icon={tb.icon}
            >
              {tb.label}
            </FiltroBarTabButton>
          ))}
        </div>

        <div style={getFilterBarRowStyle({ width: "100%", marginTop: 10 })}>
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={BUSCA_PLACEHOLDER[aba]}
            aria-label="Buscar no estoque"
            wrapperStyle={{ flex: "1 1 260px", maxWidth: 420 }}
          />
          {mostrarEstudio ? (
            <FiltroEstudioSelect value={filtroEstudio} onChange={setFiltroEstudio} estudios={estudios} />
          ) : null}
          {mostrarCategoria ? (
            <FiltroBarCampoSelect
              value={filtroCategoria[aba]}
              onChange={(v) => setFiltroCategoria((prev) => ({ ...prev, [aba]: v }))}
              options={categoriaOptions}
              icon={<Tags {...FILTRO_BAR_ICON_PROPS} />}
              ariaLabel="Categorias"
              todasValue=""
              todasLabel="Todas Categorias"
            />
          ) : null}
          <AjudaContextualAcoes pageKey="tech_ops_estoque" />
        </div>
      </div>

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}
        >
          {erro}
        </div>
      ) : (
        <>
          <div role="tabpanel" id="panel-estoque-itens" aria-labelledby="tab-estoque-itens" hidden={aba !== "itens"}>
            <AbaItens
              rows={itens}
              loading={loading}
              busca={busca}
              filtroEstudio={filtroEstudio}
              filtroCategoria={filtroCategoria.itens}
              perm={perm}
              onReload={() => void carregar()}
            />
          </div>
          <div
            role="tabpanel"
            id="panel-estoque-equipamentos"
            aria-labelledby="tab-estoque-equipamentos"
            hidden={aba !== "equipamentos"}
          >
            <AbaEquipamentos
              rows={equipamentos}
              loading={loading}
              busca={busca}
              filtroEstudio={filtroEstudio}
              filtroCategoria={filtroCategoria.equipamentos}
              estudioNomePorSlug={estudioNomePorSlug}
              perm={perm}
              onReload={() => void carregar()}
            />
          </div>
          <div role="tabpanel" id="panel-estoque-jogo" aria-labelledby="tab-estoque-jogo" hidden={aba !== "jogo"}>
            <AbaJogo
              rows={jogoLotes}
              loading={loading}
              busca={busca}
              filtroEstudio={filtroEstudio}
              filtroCategoria={filtroCategoria.jogo}
              setFiltroCategoria={(c) => setFiltroCategoria((prev) => ({ ...prev, jogo: c }))}
              perm={perm}
              onReload={() => void carregar()}
            />
          </div>
          <div
            role="tabpanel"
            id="panel-estoque-fornecedores"
            aria-labelledby="tab-estoque-fornecedores"
            hidden={aba !== "fornecedores"}
          >
            <AbaFornecedores
              rows={fornecedores}
              loading={loading}
              busca={busca}
              perm={perm}
              onReload={() => void carregar()}
            />
          </div>
        </>
      )}
    </div>
  );
}
