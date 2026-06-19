import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { BtnExcluirLinha } from "../../../../components/BtnExcluirLinha";
import { ModalConfirmExcluirPadrao } from "../../../../components/OperacoesModal";
import { supabase } from "../../../../lib/supabase";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { CtaCriarButton } from "../../../../components/CtaCriarButton";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SortTableTh } from "../../../../components/dashboard/SortTableTh";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../../lib/excluirItemUi";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { compareLocaleTexto, compareNumber, type SortDir } from "../../../../lib/classificacaoSort";
import {
  RH_FORMACAO_GRAU_LABEL,
  RH_FORMACAO_STATUS_COLOR,
  RH_FORMACAO_STATUS_LABEL,
  RH_FORMACAO_VAZIO,
  RH_IDIOMA_NIVEL_LABEL,
  RH_PORTFOLIO_TIPO_LABEL,
} from "../../../../lib/rhFormacaoCompetenciasConstants";
import {
  RH_FORMACAO_PORTFOLIO_BUCKET,
  buildPortfolioStoragePath,
} from "../../../../lib/rhFormacaoCompetenciasStorage";
import { registrarHistoricoFormacaoCompetencias } from "../../../../lib/rhFormacaoHistorico";
import type {
  RhFuncionarioCurso,
  RhFuncionarioFormacao,
  RhFuncionarioIdioma,
  RhFuncionarioPortfolio,
  RhIdioma,
} from "../../../../types/rhFormacaoCompetencias";
import {
  ModalCurso,
  ModalFormacaoAcademica,
  ModalIdioma,
  ModalPortfolio,
  type CursoPayload,
  type FormacaoAcademicaPayload,
  type IdiomaPayload,
  type PortfolioPayload,
} from "./Modals";
import {
  getFormacaoBtnIconTabela,
  getFormacaoSectionHeaderStyle,
  getFormacaoStatusBadgeStyle,
} from "./sharedStyles";

type Props = {
  funcionarioId: string;
  podeEditar: boolean;
  usuarioLabel: string;
  onHistoricoRefresh?: () => void;
  onCompletudeAlterada?: () => void;
  onErro?: (msg: string) => void;
};

type DeleteTarget =
  | { kind: "formacao"; row: RhFuncionarioFormacao }
  | { kind: "idioma"; row: RhFuncionarioIdioma }
  | { kind: "curso"; row: RhFuncionarioCurso }
  | { kind: "portfolio"; row: RhFuncionarioPortfolio };

function descricaoModalExcluirFormacao(target: DeleteTarget): string {
  switch (target.kind) {
    case "formacao":
      return descricaoModalExcluirItem("a formação", target.row.curso);
    case "idioma":
      return descricaoModalExcluirItem("o idioma", target.row.rh_idiomas?.nome ?? "—");
    case "curso":
      return descricaoModalExcluirItem("o curso", target.row.nome);
    case "portfolio":
      return descricaoModalExcluirItem("o item de portfólio", target.row.titulo);
  }
}

type SortFormacaoCol = "curso" | "instituicao" | "grau" | "ano" | "status";
type SortCursoCol = "nome" | "instituicao" | "carga" | "ano";

function compareAnoNullable(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return compareNumber(a, b, dir);
}

function sortFormacaoRows(
  rows: RhFuncionarioFormacao[],
  col: SortFormacaoCol,
  dir: SortDir,
): RhFuncionarioFormacao[] {
  return [...rows].sort((a, b) => {
    if (col === "ano") return compareAnoNullable(a.ano_conclusao, b.ano_conclusao, dir);
    if (col === "grau") return compareLocaleTexto(RH_FORMACAO_GRAU_LABEL[a.grau], RH_FORMACAO_GRAU_LABEL[b.grau], dir);
    if (col === "status") return compareLocaleTexto(RH_FORMACAO_STATUS_LABEL[a.status], RH_FORMACAO_STATUS_LABEL[b.status], dir);
    if (col === "instituicao") return compareLocaleTexto(a.instituicao, b.instituicao, dir);
    return compareLocaleTexto(a.curso, b.curso, dir);
  });
}

function sortCursoRows(rows: RhFuncionarioCurso[], col: SortCursoCol, dir: SortDir): RhFuncionarioCurso[] {
  return [...rows].sort((a, b) => {
    if (col === "ano") return compareAnoNullable(a.ano, b.ano, dir);
    if (col === "carga") return compareAnoNullable(a.carga_horaria_horas, b.carga_horaria_horas, dir);
    if (col === "instituicao") return compareLocaleTexto(a.instituicao, b.instituicao, dir);
    return compareLocaleTexto(a.nome, b.nome, dir);
  });
}

export default function FormacaoCompetenciasPainel({
  funcionarioId,
  podeEditar,
  usuarioLabel,
  onHistoricoRefresh,
  onCompletudeAlterada,
  onErro,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const btnIcon = getFormacaoBtnIconTabela(t);

  const [loading, setLoading] = useState(true);
  const [formacoes, setFormacoes] = useState<RhFuncionarioFormacao[]>([]);
  const [idiomasRows, setIdiomasRows] = useState<RhFuncionarioIdioma[]>([]);
  const [cursos, setCursos] = useState<RhFuncionarioCurso[]>([]);
  const [portfolio, setPortfolio] = useState<RhFuncionarioPortfolio[]>([]);
  const [catalogoIdiomas, setCatalogoIdiomas] = useState<RhIdioma[]>([]);
  const [signedPortfolio, setSignedPortfolio] = useState<Record<string, string>>({});

  const [sortFormacao, setSortFormacao] = useState<{ col: SortFormacaoCol; dir: SortDir }>({
    col: "ano",
    dir: "desc",
  });
  const [sortCurso, setSortCurso] = useState<{ col: SortCursoCol; dir: SortDir }>({ col: "ano", dir: "desc" });

  const [modalFormacao, setModalFormacao] = useState<RhFuncionarioFormacao | null | "novo">(null);
  const [modalIdioma, setModalIdioma] = useState<RhFuncionarioIdioma | null | "novo">(null);
  const [modalCurso, setModalCurso] = useState<RhFuncionarioCurso | null | "novo">(null);
  const [modalPortfolio, setModalPortfolio] = useState<RhFuncionarioPortfolio | null | "novo">(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notifyErro = useCallback(
    (msg: string) => {
      console.error(msg);
      onErro?.(msg);
    },
    [onErro],
  );

  const logHistorico = useCallback(
    async (
      acao: "criar" | "editar" | "excluir",
      bloco: "formacao_academica" | "idioma" | "curso" | "portfolio",
      resumo: string,
    ) => {
      const { error } = await registrarHistoricoFormacaoCompetencias({
        rhFuncionarioId: funcionarioId,
        acao,
        bloco,
        resumo,
        usuarioLabel,
      });
      if (error) notifyErro("Registro salvo, mas não foi possível gravar o histórico.");
      else onHistoricoRefresh?.();
    },
    [funcionarioId, usuarioLabel, notifyErro, onHistoricoRefresh],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    const [fRes, iRes, cRes, pRes, catRes] = await Promise.all([
      supabase
        .from("rh_funcionario_formacao")
        .select("*")
        .eq("rh_funcionario_id", funcionarioId)
        .order("ano_conclusao", { ascending: false, nullsFirst: false }),
      supabase
        .from("rh_funcionario_idioma")
        .select("*, rh_idiomas(nome)")
        .eq("rh_funcionario_id", funcionarioId),
      supabase
        .from("rh_funcionario_curso")
        .select("*")
        .eq("rh_funcionario_id", funcionarioId)
        .order("ano", { ascending: false, nullsFirst: false }),
      supabase
        .from("rh_funcionario_portfolio")
        .select("*")
        .eq("rh_funcionario_id", funcionarioId)
        .order("created_at", { ascending: false }),
      supabase.from("rh_idiomas").select("id, nome, ordem").order("ordem"),
    ]);
    setLoading(false);
    if (fRes.error || iRes.error || cRes.error || pRes.error) {
      notifyErro("Não foi possível carregar formação e competências.");
      return;
    }
    setFormacoes((fRes.data ?? []) as RhFuncionarioFormacao[]);
    setIdiomasRows((iRes.data ?? []) as RhFuncionarioIdioma[]);
    setCursos((cRes.data ?? []) as RhFuncionarioCurso[]);
    const portRows = (pRes.data ?? []) as RhFuncionarioPortfolio[];
    setPortfolio(portRows);
    setCatalogoIdiomas((catRes.data ?? []) as RhIdioma[]);

    const paths = portRows.filter((p) => p.origem === "arquivo" && p.storage_path).map((p) => p.storage_path!);
    if (paths.length) {
      const signed: Record<string, string> = {};
      await Promise.all(
        portRows
          .filter((p) => p.storage_path)
          .map(async (p) => {
            const { data } = await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).createSignedUrl(p.storage_path!, 3600);
            if (data?.signedUrl) signed[p.id] = data.signedUrl;
          }),
      );
      setSignedPortfolio(signed);
    } else {
      setSignedPortfolio({});
    }
  }, [funcionarioId, notifyErro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const formacoesSorted = useMemo(
    () => sortFormacaoRows(formacoes, sortFormacao.col, sortFormacao.dir),
    [formacoes, sortFormacao],
  );
  const cursosSorted = useMemo(() => sortCursoRows(cursos, sortCurso.col, sortCurso.dir), [cursos, sortCurso]);
  const idiomasSorted = useMemo(
    () =>
      [...idiomasRows].sort((a, b) =>
        compareLocaleTexto(a.rh_idiomas?.nome ?? "", b.rh_idiomas?.nome ?? "", "asc"),
      ),
    [idiomasRows],
  );
  const idsIdiomaCadastrados = useMemo(() => new Set(idiomasRows.map((r) => r.rh_idioma_id)), [idiomasRows]);

  const toggleSortFormacao = (col: SortFormacaoCol) => {
    setSortFormacao((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };
  const toggleSortCurso = (col: SortCursoCol) => {
    setSortCurso((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };

  const salvarFormacao = async (payload: FormacaoAcademicaPayload, edit?: RhFuncionarioFormacao | null) => {
    if (edit) {
      const { error } = await supabase.from("rh_funcionario_formacao").update(payload).eq("id", edit.id);
      if (error) throw error;
      await logHistorico("editar", "formacao_academica", payload.curso);
    } else {
      const { error } = await supabase.from("rh_funcionario_formacao").insert({
        rh_funcionario_id: funcionarioId,
        ...payload,
      });
      if (error) throw error;
      await logHistorico("criar", "formacao_academica", payload.curso);
    }
    setModalFormacao(null);
    await carregar();
    onCompletudeAlterada?.();
  };

  const salvarIdioma = async (payload: IdiomaPayload, edit?: RhFuncionarioIdioma | null) => {
    const nome =
      catalogoIdiomas.find((i) => i.id === payload.rh_idioma_id)?.nome ??
      idiomasRows.find((r) => r.rh_idioma_id === payload.rh_idioma_id)?.rh_idiomas?.nome ??
      "Idioma";
    if (edit) {
      const { error } = await supabase.from("rh_funcionario_idioma").update({ nivel: payload.nivel }).eq("id", edit.id);
      if (error) throw error;
      await logHistorico("editar", "idioma", `${nome} (${RH_IDIOMA_NIVEL_LABEL[payload.nivel]})`);
    } else {
      const { error } = await supabase.from("rh_funcionario_idioma").insert({
        rh_funcionario_id: funcionarioId,
        ...payload,
      });
      if (error) throw error;
      await logHistorico("criar", "idioma", `${nome} (${RH_IDIOMA_NIVEL_LABEL[payload.nivel]})`);
    }
    setModalIdioma(null);
    await carregar();
    onCompletudeAlterada?.();
  };

  const salvarCurso = async (payload: CursoPayload, edit?: RhFuncionarioCurso | null) => {
    if (edit) {
      const { error } = await supabase.from("rh_funcionario_curso").update(payload).eq("id", edit.id);
      if (error) throw error;
      await logHistorico("editar", "curso", payload.nome);
    } else {
      const { error } = await supabase.from("rh_funcionario_curso").insert({
        rh_funcionario_id: funcionarioId,
        ...payload,
      });
      if (error) throw error;
      await logHistorico("criar", "curso", payload.nome);
    }
    setModalCurso(null);
    await carregar();
  };

  const salvarPortfolio = async (payload: PortfolioPayload, edit?: RhFuncionarioPortfolio | null) => {
    if (payload.origem === "link") {
      if (edit) {
        const { error } = await supabase
          .from("rh_funcionario_portfolio")
          .update({
            titulo: payload.titulo,
            tipo: payload.tipo,
            origem: "link",
            url: payload.url,
            storage_path: null,
            file_name: null,
            mime_type: null,
            tamanho_bytes: null,
          })
          .eq("id", edit.id);
        if (error) throw error;
        if (edit.storage_path) {
          await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).remove([edit.storage_path]);
        }
        await logHistorico("editar", "portfolio", payload.titulo);
      } else {
        const { error } = await supabase.from("rh_funcionario_portfolio").insert({
          rh_funcionario_id: funcionarioId,
          titulo: payload.titulo,
          tipo: payload.tipo,
          origem: "link",
          url: payload.url,
        });
        if (error) throw error;
        await logHistorico("criar", "portfolio", payload.titulo);
      }
    } else {
      let storagePath = edit?.storage_path ?? null;
      if (payload.file) {
        const path = buildPortfolioStoragePath(funcionarioId, payload.file.name);
        const { error: upErr } = await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).upload(path, payload.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: payload.file.type || undefined,
        });
        if (upErr) throw upErr;
        if (edit?.storage_path && edit.storage_path !== path) {
          await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).remove([edit.storage_path]);
        }
        storagePath = path;
      }
      if (!storagePath) throw new Error("missing file");
      const fileMeta = payload.file ?? null;
      const rowPayload = {
        titulo: payload.titulo,
        tipo: payload.tipo,
        origem: "arquivo" as const,
        url: null,
        storage_path: storagePath,
        file_name: fileMeta?.name ?? edit?.file_name ?? "arquivo",
        mime_type: fileMeta?.type ?? edit?.mime_type ?? null,
        tamanho_bytes: fileMeta?.size ?? edit?.tamanho_bytes ?? null,
      };
      if (edit) {
        const { error } = await supabase.from("rh_funcionario_portfolio").update(rowPayload).eq("id", edit.id);
        if (error) {
          if (payload.file) await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).remove([storagePath]);
          throw error;
        }
        await logHistorico("editar", "portfolio", payload.titulo);
      } else {
        const { error } = await supabase.from("rh_funcionario_portfolio").insert({
          rh_funcionario_id: funcionarioId,
          ...rowPayload,
        });
        if (error) {
          await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).remove([storagePath]);
          throw error;
        }
        await logHistorico("criar", "portfolio", payload.titulo);
      }
    }
    setModalPortfolio(null);
    await carregar();
  };

  const confirmarExclusao = async () => {
    if (!deleteTarget) return;
    const alvo = deleteTarget;
    setDeleting(true);
    try {
      if (alvo.kind === "formacao") {
        const { error } = await supabase.from("rh_funcionario_formacao").delete().eq("id", alvo.row.id);
        if (error) throw error;
        await logHistorico("excluir", "formacao_academica", alvo.row.curso);
      } else if (alvo.kind === "idioma") {
        const nome = alvo.row.rh_idiomas?.nome ?? "Idioma";
        const { error } = await supabase.from("rh_funcionario_idioma").delete().eq("id", alvo.row.id);
        if (error) throw error;
        await logHistorico("excluir", "idioma", nome);
      } else if (alvo.kind === "curso") {
        const { error } = await supabase.from("rh_funcionario_curso").delete().eq("id", alvo.row.id);
        if (error) throw error;
        await logHistorico("excluir", "curso", alvo.row.nome);
      } else {
        const row = alvo.row;
        if (row.storage_path) {
          await supabase.storage.from(RH_FORMACAO_PORTFOLIO_BUCKET).remove([row.storage_path]);
        }
        const { error } = await supabase.from("rh_funcionario_portfolio").delete().eq("id", row.id);
        if (error) throw error;
        await logHistorico("excluir", "portfolio", row.titulo);
      }
      setDeleteTarget(null);
      await carregar();
      if (alvo.kind === "formacao" || alvo.kind === "idioma") {
        onCompletudeAlterada?.();
      }
    } catch {
      notifyErro("Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const acoesLinha = (edit: () => void, del: () => void, labelEditar: string, descricaoExcluir: string) =>
    podeEditar ? (
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        <button type="button" style={btnIcon} onClick={edit} aria-label={`Editar ${labelEditar}`} title={`Editar ${labelEditar}`}>
          <Pencil size={13} aria-hidden />
        </button>
        <BtnExcluirLinha descricaoItem={descricaoExcluir} onClick={del} />
      </div>
    ) : (
      "—"
    );

  const loadingBlock = (
    <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      <Loader2 size={20} className="app-lucide-spin" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
      Carregando…
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Formação acadêmica */}
      <div style={pageBox}>
        <div style={getFormacaoSectionHeaderStyle()}>
          <SectionTitle sub="Graduação, pós e demais níveis">Formação acadêmica</SectionTitle>
          {podeEditar ? (
            <CtaCriarButton onClick={() => setModalFormacao("novo")}>Nova formação</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          loadingBlock
        ) : formacoesSorted.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {RH_FORMACAO_VAZIO.formacao}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 640 })}>
              <caption style={{ display: "none" }}>Formação acadêmica do prestador</caption>
              <thead>
                <tr>
                  <SortTableTh
                    label="Curso"
                    col="curso"
                    sortCol={sortFormacao.col}
                    sortDir={sortFormacao.dir}
                    onSort={toggleSortFormacao}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Instituição"
                    col="instituicao"
                    sortCol={sortFormacao.col}
                    sortDir={sortFormacao.dir}
                    onSort={toggleSortFormacao}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Grau"
                    col="grau"
                    sortCol={sortFormacao.col}
                    sortDir={sortFormacao.dir}
                    onSort={toggleSortFormacao}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Ano"
                    col="ano"
                    sortCol={sortFormacao.col}
                    sortDir={sortFormacao.dir}
                    onSort={toggleSortFormacao}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Status"
                    col="status"
                    sortCol={sortFormacao.col}
                    sortDir={sortFormacao.dir}
                    onSort={toggleSortFormacao}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  {podeEditar ? (
                    <th scope="col" style={dataTable.thHeader}>
                      Ações
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {formacoesSorted.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.curso}</td>
                    <td style={dataTable.tdCenter}>{row.instituicao}</td>
                    <td style={dataTable.tdCenter}>{RH_FORMACAO_GRAU_LABEL[row.grau]}</td>
                    <td style={dataTable.tdCenter}>{row.ano_conclusao ?? "—"}</td>
                    <td style={dataTable.tdCenter}>
                      <span style={getFormacaoStatusBadgeStyle(RH_FORMACAO_STATUS_COLOR[row.status])}>
                        {RH_FORMACAO_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    {podeEditar ? (
                      <td style={dataTable.tdCenter}>
                        {acoesLinha(
                          () => setModalFormacao(row),
                          () => setDeleteTarget({ kind: "formacao", row }),
                          row.curso,
                          descricaoBotaoExcluir("formação", row.curso),
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Idiomas */}
      <div style={pageBox}>
        <div style={getFormacaoSectionHeaderStyle()}>
          <SectionTitle sub="Um registro por idioma">Idiomas</SectionTitle>
          {podeEditar && idsIdiomaCadastrados.size < catalogoIdiomas.length ? (
            <CtaCriarButton onClick={() => setModalIdioma("novo")}>Novo idioma</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          loadingBlock
        ) : idiomasSorted.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {RH_FORMACAO_VAZIO.idioma}
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {idiomasSorted.map((row, i) => {
              const nome = row.rh_idiomas?.nome ?? "—";
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: i < idiomasSorted.length - 1 ? `1px solid ${t.cardBorder}` : undefined,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 120, fontWeight: 700, color: t.text }}>{nome}</span>
                  <span style={{ color: t.textMuted }}>{RH_IDIOMA_NIVEL_LABEL[row.nivel]}</span>
                  {podeEditar
                    ? acoesLinha(
                        () => setModalIdioma(row),
                        () => setDeleteTarget({ kind: "idioma", row }),
                        nome,
                        descricaoBotaoExcluir("idioma", nome),
                      )
                    : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cursos */}
      <div style={pageBox}>
        <div style={getFormacaoSectionHeaderStyle()}>
          <SectionTitle sub="Certificações e cursos complementares">Cursos</SectionTitle>
          {podeEditar ? <CtaCriarButton onClick={() => setModalCurso("novo")}>Novo curso</CtaCriarButton> : null}
        </div>
        {loading ? (
          loadingBlock
        ) : cursosSorted.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {RH_FORMACAO_VAZIO.curso}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 560 })}>
              <caption style={{ display: "none" }}>Cursos e certificações</caption>
              <thead>
                <tr>
                  <SortTableTh
                    label="Nome"
                    col="nome"
                    sortCol={sortCurso.col}
                    sortDir={sortCurso.dir}
                    onSort={toggleSortCurso}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Instituição"
                    col="instituicao"
                    sortCol={sortCurso.col}
                    sortDir={sortCurso.dir}
                    onSort={toggleSortCurso}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Carga (h)"
                    col="carga"
                    sortCol={sortCurso.col}
                    sortDir={sortCurso.dir}
                    onSort={toggleSortCurso}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  <SortTableTh
                    label="Ano"
                    col="ano"
                    sortCol={sortCurso.col}
                    sortDir={sortCurso.dir}
                    onSort={toggleSortCurso}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                  {podeEditar ? (
                    <th scope="col" style={dataTable.thHeader}>
                      Ações
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {cursosSorted.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.nome}</td>
                    <td style={dataTable.tdCenter}>{row.instituicao}</td>
                    <td style={dataTable.tdCenter}>{row.carga_horaria_horas ?? "—"}</td>
                    <td style={dataTable.tdCenter}>{row.ano ?? "—"}</td>
                    {podeEditar ? (
                      <td style={dataTable.tdCenter}>
                        {acoesLinha(
                          () => setModalCurso(row),
                          () => setDeleteTarget({ kind: "curso", row }),
                          row.nome,
                          descricaoBotaoExcluir("curso", row.nome),
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portfólio */}
      <div style={pageBox}>
        <div style={getFormacaoSectionHeaderStyle()}>
          <SectionTitle sub="Links ou arquivos (vídeo e áudio somente por URL)">Portfólio</SectionTitle>
          {podeEditar ? <CtaCriarButton onClick={() => setModalPortfolio("novo")}>Novo item</CtaCriarButton> : null}
        </div>
        {loading ? (
          loadingBlock
        ) : portfolio.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {RH_FORMACAO_VAZIO.portfolio}
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {portfolio.map((row, i) => {
              const href = row.origem === "link" ? row.url : signedPortfolio[row.id];
              return (
                <li
                  key={row.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: i < portfolio.length - 1 ? `1px solid ${t.cardBorder}` : undefined,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 140, fontWeight: 700, color: t.text }}>{row.titulo}</span>
                  <span style={{ color: t.textMuted, fontSize: 12 }}>{RH_PORTFOLIO_TIPO_LABEL[row.tipo]}</span>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--brand-primary, #7c3aed)",
                        fontWeight: 600,
                      }}
                    >
                      Abrir
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  ) : (
                    <span style={{ color: t.textMuted }}>{row.file_name ?? "—"}</span>
                  )}
                  {podeEditar
                    ? acoesLinha(
                        () => setModalPortfolio(row),
                        () => setDeleteTarget({ kind: "portfolio", row }),
                        row.titulo,
                        descricaoBotaoExcluir("item de portfólio", row.titulo),
                      )
                    : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalFormacao === "novo" ? (
        <ModalFormacaoAcademica onClose={() => setModalFormacao(null)} onSave={(p) => salvarFormacao(p, null)} />
      ) : modalFormacao ? (
        <ModalFormacaoAcademica
          initial={modalFormacao}
          onClose={() => setModalFormacao(null)}
          onSave={(p) => salvarFormacao(p, modalFormacao)}
        />
      ) : null}

      {modalIdioma === "novo" ? (
        <ModalIdioma
          idiomas={catalogoIdiomas}
          idsJaCadastrados={idsIdiomaCadastrados}
          onClose={() => setModalIdioma(null)}
          onSave={(p) => salvarIdioma(p, null)}
        />
      ) : modalIdioma ? (
        <ModalIdioma
          idiomas={catalogoIdiomas}
          idsJaCadastrados={idsIdiomaCadastrados}
          initial={modalIdioma}
          onClose={() => setModalIdioma(null)}
          onSave={(p) => salvarIdioma(p, modalIdioma)}
        />
      ) : null}

      {modalCurso === "novo" ? (
        <ModalCurso onClose={() => setModalCurso(null)} onSave={(p) => salvarCurso(p, null)} />
      ) : modalCurso ? (
        <ModalCurso initial={modalCurso} onClose={() => setModalCurso(null)} onSave={(p) => salvarCurso(p, modalCurso)} />
      ) : null}

      {modalPortfolio === "novo" ? (
        <ModalPortfolio onClose={() => setModalPortfolio(null)} onSave={(p) => salvarPortfolio(p, null)} />
      ) : modalPortfolio ? (
        <ModalPortfolio
          initial={modalPortfolio}
          onClose={() => setModalPortfolio(null)}
          onSave={(p) => salvarPortfolio(p, modalPortfolio)}
        />
      ) : null}

      {deleteTarget ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirFormacao(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmarExclusao()}
          loading={deleting}
        />
      ) : null}
    </div>
  );
}
