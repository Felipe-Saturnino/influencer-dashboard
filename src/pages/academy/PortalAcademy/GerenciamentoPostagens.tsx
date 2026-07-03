import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Newspaper, Pencil } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { BtnArquivarLinha } from "../../../components/BtnArquivarLinha";
import { ModalConfirmArquivarPadrao } from "../../../components/OperacoesModal";
import { descricaoModalArquivarItem, tooltipArquivar } from "../../../lib/arquivarItemUi";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { FiltroBarCampoSelect, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  ACADEMY_POSTAGEM_STATUS_LABEL,
  ACADEMY_POSTAGEM_TIPO_UI_LABEL,
  fmtDataColunaGerenciamento,
  labelComunicadoFromSlug,
  labelDicaManualFromSlug,
  registrarHistoricoStatus,
  stripHtmlText,
  type AcademyPostagemContentType,
  type AcademyPostagemStatus,
  type AcademyPostagemTipoUi,
} from "../../../lib/academyPortalWorkflow";
import { carregarMetaAutoresPortalAcademy } from "../../../lib/academyPortalAutorMeta";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { ModalCriarPostagem, type PostagemEditRef } from "./ModalCriarPostagem";
import { ModalHistoricoPostagem } from "./ModalHistoricoPostagem";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalAcademyCarrossel";

type Categoria = { id: string; slug: string; label: string; scope: string };

export type PostagemGerenciamentoRow = {
  id: string;
  contentType: AcademyPostagemContentType;
  tipoUi: AcademyPostagemTipoUi;
  assunto: string;
  autorNome: string;
  tipoPostagemLabel: string;
  createdAt: string;
  status: AcademyPostagemStatus;
  publishedAt: string | null;
  textoBusca: string;
};

type PostagemSortCol = "assunto" | "autor" | "tipo" | "createdAt" | "status" | "publishedAt";

const STATUS_ORDEM: Record<AcademyPostagemStatus, number> = {
  rascunho: 0,
  publicado: 1,
  arquivado: 2,
};

function compareTexto(a: string, b: string, dir: number): number {
  return dir * a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

function compareDataIso(a: string | null, b: string | null, dir: number): number {
  const ta = a ? new Date(a).getTime() : Number.NaN;
  const tb = b ? new Date(b).getTime() : Number.NaN;
  const aVazio = Number.isNaN(ta);
  const bVazio = Number.isNaN(tb);
  if (aVazio && bVazio) return 0;
  if (aVazio) return 1;
  if (bVazio) return -1;
  return dir * (ta - tb);
}

const ERRO_CARREGAR =
  "Não foi possível carregar as postagens. Se o problema persistir, entre em contato com o suporte.";
const ERRO_ARQUIVAR =
  "Não foi possível arquivar a postagem. Se o problema persistir, entre em contato com o suporte.";

const POSTAGEM_TIPO_FILTRO_OPCOES = (["comunicado", "dica", "manual"] as const).map((value) => ({
  value,
  label: ACADEMY_POSTAGEM_TIPO_UI_LABEL[value],
}));

const POSTAGEM_STATUS_FILTRO_OPCOES = (["publicado", "rascunho", "arquivado"] as const).map((value) => ({
  value,
  label: ACADEMY_POSTAGEM_STATUS_LABEL[value],
}));

export function GerenciamentoPostagensFiltrosTipoStatus({
  filtroTipo,
  onFiltroTipoChange,
  filtroStatus,
  onFiltroStatusChange,
}: {
  filtroTipo: "todos" | AcademyPostagemTipoUi;
  onFiltroTipoChange: (v: "todos" | AcademyPostagemTipoUi) => void;
  filtroStatus: "todos" | AcademyPostagemStatus;
  onFiltroStatusChange: (v: "todos" | AcademyPostagemStatus) => void;
}) {
  return (
    <>
      <FiltroBarCampoSelect
        id="filtro-tipo-postagem-portal-academy"
        value={filtroTipo}
        onChange={(v) => onFiltroTipoChange(v as typeof filtroTipo)}
        options={POSTAGEM_TIPO_FILTRO_OPCOES}
        icon={<Newspaper size={15} strokeWidth={2} aria-hidden="true" />}
        ariaLabel="Tipos de postagem"
        todasValue="todos"
        todasLabel="Todas Postagens"
      />
      <FiltroBarCampoSelect
        id="filtro-status-postagem-portal-academy"
        value={filtroStatus}
        onChange={(v) => onFiltroStatusChange(v as typeof filtroStatus)}
        options={POSTAGEM_STATUS_FILTRO_OPCOES}
        icon={FilterBarIcons.status}
        ariaLabel="Status da postagem"
        todasValue="todos"
        todasLabel="Todos Status"
      />
    </>
  );
}

function acoesPorStatus(status: AcademyPostagemStatus): ("editar" | "arquivar" | "historico")[] {
  switch (status) {
    case "publicado":
      return ["arquivar", "historico"];
    case "rascunho":
      return ["editar", "historico"];
    case "arquivado":
      return ["historico"];
    default:
      return ["historico"];
  }
}

export function GerenciamentoPostagens({
  categoriasCom,
  categoriasDica,
  categoriasManual,
  onDadosAlterados,
  buscaDeb,
  modoHistorico,
  idxMes,
  mesesDisponiveis,
  filtroTipo,
  filtroStatus,
  onMesesCarrosselChange,
  onRegisterAbrirCriar,
}: {
  categoriasCom: Categoria[];
  categoriasDica: Categoria[];
  categoriasManual: Categoria[];
  onDadosAlterados: () => void;
  buscaDeb: string;
  modoHistorico: boolean;
  idxMes: number;
  mesesDisponiveis: MesCarrosselEntry[];
  filtroTipo: "todos" | AcademyPostagemTipoUi;
  filtroStatus: "todos" | AcademyPostagemStatus;
  onMesesCarrosselChange: (meses: MesCarrosselEntry[]) => void;
  onRegisterAbrirCriar?: (abrir: () => void) => void;
}) {
  const { theme: t, user } = useApp();
  const dataTable = useDataTableBlock();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PostagemGerenciamentoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [modalCriar, setModalCriar] = useState(false);
  const [editRef, setEditRef] = useState<PostagemEditRef | null>(null);
  const [histRef, setHistRef] = useState<{ contentType: AcademyPostagemContentType; id: string; assunto: string } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
  const [alvoArquivar, setAlvoArquivar] = useState<PostagemGerenciamentoRow | null>(null);
  const [sortCol, setSortCol] = useState<PostagemSortCol>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const abrirCriar = useCallback(() => {
    setEditRef(null);
    setModalCriar(true);
  }, []);

  useEffect(() => {
    onRegisterAbrirCriar?.(abrirCriar);
  }, [onRegisterAbrirCriar, abrirCriar]);

  const onSortColuna = useCallback((col: PostagemSortCol) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return col;
    });
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    const [comRes, dicaRes, manualRes] = await Promise.all([
      supabase
        .from("academy_portal_comunicado")
        .select("id, titulo, corpo, status, created_at, published_at, created_by, categoria:academy_portal_categoria(slug)")
        .order("created_at", { ascending: false }),
      supabase
        .from("academy_portal_dica")
        .select("id, titulo, corpo, status, created_at, published_at, created_by, categoria:academy_portal_categoria(slug)")
        .order("created_at", { ascending: false }),
      supabase
        .from("academy_portal_manual")
        .select("id, titulo, corpo, introducao, status, created_at, published_at, created_by, categoria:academy_portal_categoria(slug)")
        .order("created_at", { ascending: false }),
    ]);

    if (comRes.error || dicaRes.error || manualRes.error) {
      console.error("[GerenciamentoPostagens Academy]", comRes.error ?? dicaRes.error ?? manualRes.error);
      setErro(ERRO_CARREGAR);
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<string>();
    const built: (PostagemGerenciamentoRow & { _autorId?: string | null })[] = [];

    const pushRow = (
      row: {
        id: string;
        titulo: string;
        corpo: string;
        status: AcademyPostagemStatus;
        created_at: string;
        published_at: string | null;
        created_by: string | null;
        categoria?: { slug: string } | { slug: string }[] | null;
      },
      contentType: AcademyPostagemContentType,
      tipoUi: AcademyPostagemTipoUi,
      labelFn: (slug: string) => string,
      extraBusca = "",
    ) => {
      const catSlug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
      if (row.created_by) userIds.add(row.created_by);
      built.push({
        id: row.id,
        contentType,
        tipoUi,
        assunto: row.titulo,
        autorNome: "",
        tipoPostagemLabel: labelFn(catSlug ?? ""),
        createdAt: row.created_at,
        status: row.status ?? "rascunho",
        publishedAt: row.published_at,
        textoBusca: normalizarTextoBusca(`${row.titulo} ${stripHtmlText(row.corpo)} ${extraBusca}`),
        _autorId: row.created_by,
      });
    };

    for (const c of comRes.data ?? []) {
      pushRow(c as Parameters<typeof pushRow>[0], "comunicado", "comunicado", labelComunicadoFromSlug);
    }
    for (const d of dicaRes.data ?? []) {
      pushRow(d as Parameters<typeof pushRow>[0], "dica", "dica", labelDicaManualFromSlug);
    }
    for (const m of manualRes.data ?? []) {
      const row = m as Parameters<typeof pushRow>[0] & { introducao?: string | null };
      pushRow(row, "manual", "manual", labelDicaManualFromSlug, row.introducao ?? "");
    }

    const meta = await carregarMetaAutoresPortalAcademy([...userIds]);
    const withAutor = built.map((r) => ({
      ...r,
      autorNome: meta[r._autorId ?? ""]?.nome ?? "—",
    }));

    setRows(withAutor);
    onMesesCarrosselChange(buildMesesCarrossel(withAutor.map((r) => ({ iso: r.publishedAt ?? r.createdAt }))));
    setLoading(false);
  }, [onMesesCarrosselChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const rowsFiltradas = useMemo(() => {
    let list = [...rows];
    if (!modoHistorico) {
      const mesSel = mesesDisponiveis[idxMes];
      list = list.filter((r) => itemNoMesCarrossel(r.publishedAt ?? r.createdAt, mesSel));
    }
    if (filtroTipo !== "todos") list = list.filter((r) => r.tipoUi === filtroTipo);
    if (filtroStatus !== "todos") list = list.filter((r) => r.status === filtroStatus);
    if (buscaDeb) list = list.filter((r) => r.textoBusca.includes(buscaDeb));

    const dir = sortDir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      switch (sortCol) {
        case "assunto":
          return compareTexto(a.assunto, b.assunto, dir);
        case "autor":
          return compareTexto(a.autorNome, b.autorNome, dir);
        case "tipo":
          return compareTexto(a.tipoPostagemLabel, b.tipoPostagemLabel, dir);
        case "status":
          return dir * (STATUS_ORDEM[a.status] - STATUS_ORDEM[b.status]);
        case "publishedAt":
          return compareDataIso(a.publishedAt, b.publishedAt, dir);
        default:
          return compareDataIso(a.createdAt, b.createdAt, dir);
      }
    });
    return list;
  }, [rows, modoHistorico, mesesDisponiveis, idxMes, filtroTipo, filtroStatus, buscaDeb, sortCol, sortDir]);

  const confirmarArquivar = async () => {
    if (!alvoArquivar || !user?.id) return;
    setAcaoLoading(alvoArquivar.id);
    const table =
      alvoArquivar.contentType === "comunicado"
        ? "academy_portal_comunicado"
        : alvoArquivar.contentType === "dica"
          ? "academy_portal_dica"
          : "academy_portal_manual";
    const { error } = await supabase.from(table).update({ status: "arquivado" }).eq("id", alvoArquivar.id);
    if (error) {
      console.error("[GerenciamentoPostagens Academy] arquivar:", error);
      setAcaoLoading(null);
      setAlvoArquivar(null);
      setErro(ERRO_ARQUIVAR);
      return;
    }
    await registrarHistoricoStatus(
      supabase,
      alvoArquivar.contentType,
      alvoArquivar.id,
      alvoArquivar.status,
      "arquivado",
      user.id,
    );
    setAcaoLoading(null);
    setAlvoArquivar(null);
    await carregar();
    onDadosAlterados();
  };

  return (
    <div>
      {erro ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 className="app-lucide-spin" size={24} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 12 }} />
          Carregando…
        </div>
      ) : rowsFiltradas.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhuma postagem encontrada.
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 900 })}>
            <caption style={{ display: "none" }}>Gerenciamento de postagens do Portal da Academy</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Assunto"
                  col="assunto"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Autor"
                  col="autor"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Tipo"
                  col="tipo"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Criado em"
                  col="createdAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Status"
                  col="status"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Publicado em"
                  col="publishedAt"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={onSortColuna}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltradas.map((row, i) => {
                const acoes = acoesPorStatus(row.status);
                return (
                  <tr
                    key={`${row.contentType}-${row.id}`}
                    style={{ background: dataTable.zebraRow(i) }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dataTable.zebraRow(i);
                    }}
                  >
                    <td style={dataTable.tdCenter}>{row.assunto}</td>
                    <td style={dataTable.tdCenter}>{row.autorNome}</td>
                    <td style={dataTable.tdCenter}>{row.tipoPostagemLabel}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.createdAt)}</td>
                    <td style={dataTable.tdCenter}>{ACADEMY_POSTAGEM_STATUS_LABEL[row.status]}</td>
                    <td style={dataTable.tdCenter}>{fmtDataColunaGerenciamento(row.publishedAt)}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        {acoes.includes("editar") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Editar postagem")}
                            onClick={() => {
                              setEditRef({ contentType: row.contentType, id: row.id });
                              setModalCriar(true);
                            }}
                          >
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                        {acoes.includes("arquivar") ? (
                          <BtnArquivarLinha
                            labelAcao={tooltipArquivar("postagem")}
                            onClick={() => setAlvoArquivar(row)}
                            disabled={acaoLoading === row.id}
                          />
                        ) : null}
                        {acoes.includes("historico") ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Histórico da postagem")}
                            onClick={() =>
                              setHistRef({ contentType: row.contentType, id: row.id, assunto: row.assunto })
                            }
                          >
                            <Clock size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalCriar ? (
        <ModalCriarPostagem
          open={modalCriar}
          modo={editRef ? "editar" : "criar"}
          editRef={editRef}
          categoriasCom={categoriasCom}
          categoriasDica={categoriasDica}
          categoriasManual={categoriasManual}
          onClose={() => {
            setModalCriar(false);
            setEditRef(null);
          }}
          onSalvo={() => {
            void carregar();
            onDadosAlterados();
          }}
        />
      ) : null}

      {histRef ? (
        <ModalHistoricoPostagem
          open
          assunto={histRef.assunto}
          contentType={histRef.contentType}
          contentId={histRef.id}
          onClose={() => setHistRef(null)}
        />
      ) : null}

      {alvoArquivar ? (
        <ModalConfirmArquivarPadrao
          descricaoItem={descricaoModalArquivarItem("a postagem", alvoArquivar.assunto)}
          onCancel={() => setAlvoArquivar(null)}
          onConfirm={() => void confirmarArquivar()}
          loading={acaoLoading === alvoArquivar.id}
        />
      ) : null}
    </div>
  );
}
