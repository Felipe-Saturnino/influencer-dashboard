import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { usePermission } from "../../../hooks/usePermission";
import type { RhFuncionario, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { revisaoCadastralPendenteParaFuncionario } from "../../../lib/rhCadastroRevisao";
import { prestadorCadastroIncompleto } from "./gestaoPrestadorHelpers";
import { somenteDigitos } from "../../../lib/rhFuncionarioValidators";
import { textoContemBusca } from "../../../lib/searchText";
import type { SortDir } from "../../../components/dashboard";
import {
  dataFuncaoOuInicioIso,
  type AbaPaginaRhFunc,
  type FiltroStatusPrestador,
  type PrestadoresSortCol,
  valorRemuneracaoOrdenacao,
} from "./gestaoPrestadorHelpers";

type Params = {
  busca: string;
  filtroDiretoria: string;
  filtroGerencia: string;
  filtroSetor: string;
  filtroContrato: RhFuncionarioTipoContrato | "todos";
  filtroStatus: FiltroStatusPrestador;
  abaPagina: AbaPaginaRhFunc;
};

export function usePrestadorLista({
  busca,
  filtroDiretoria,
  filtroGerencia,
  filtroSetor,
  filtroContrato,
  filtroStatus,
  abaPagina,
}: Params) {
  const permOrg = usePermission("rh_organograma");

  const [lista, setLista] = useState<RhFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [opcoesTimes, setOpcoesTimes] = useState<RhOrgTimeOpcao[]>([]);
  const [organogramaGrupos, setOrganogramaGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [sortPrestadores, setSortPrestadores] = useState<{ col: PrestadoresSortCol; dir: SortDir }>({
    col: "nome",
    dir: "asc",
  });

  useEffect(() => {
    if (permOrg.loading || permOrg.canView === "nao") {
      setOpcoesTimes([]);
      setOrganogramaGrupos([]);
      return;
    }
    let cancel = false;
    void (async () => {
      const { opcoes, grupos, error } = await carregarOpcoesTimesOrganograma();
      if (cancel) return;
      if (error) {
        setOpcoesTimes([]);
        setOrganogramaGrupos([]);
      } else {
        setOpcoesTimes(opcoes);
        setOrganogramaGrupos(grupos);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [permOrg.loading, permOrg.canView]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroCarregar(null);
    /** Colunas do domínio RhFuncionario — evita select("*") e payloads com colunas futuras não usadas na UI. */
    const PRESTADOR_LISTA_COLS = [
      "id", "status", "nome", "rg", "cpf", "telefone", "email", "email_spin", "data_nascimento",
      "endereco_residencial", "res_cep", "res_logradouro", "res_numero", "res_complemento", "res_cidade", "res_estado",
      "contato_emergencia", "emerg_nome", "emerg_parentesco", "emerg_telefone",
      "setor", "org_diretoria_id", "org_gerencia_id", "org_time_id", "cargo", "nivel",
      "area_atuacao", "remuneracao_hora_centavos", "salario", "data_inicio", "data_funcao",
      "origem_contratacao", "quem_indicou", "data_desligamento", "observacao_rh", "escala", "tipo_contrato",
      "nome_empresa", "cnpj", "endereco_empresa", "emp_cep", "emp_logradouro", "emp_numero", "emp_complemento",
      "emp_cidade", "emp_estado", "banco", "agencia", "conta_corrente", "pix",
      "staff_nickname", "staff_estudio_slug", "staff_estudio_slugs", "staff_operadora_slug", "staff_barcode",
      "staff_id_operacional", "staff_turno", "staff_horario_turno", "staff_skills", "staff_live_no_estudio",
      "staff_fim_treinamento", "staff_dealer_genero", "staff_dealer_bio", "staff_dealer_fotos",
      "cadastro_revisado_em", "cadastro_revisao_tipo",
      "created_at", "updated_at", "created_by", "updated_by",
    ].join(", ");
    try {
      const rows = await fetchAllPages(async (from, to) => {
        const res = await supabase
          .from("rh_funcionarios")
          .select(PRESTADOR_LISTA_COLS)
          .order("nome", { ascending: true })
          .range(from, to);
        return {
          data: (res.data ?? null) as unknown as RhFuncionario[] | null,
          error: res.error,
        };
      });
      setLista(rows);
    } catch (e) {
      console.error("[GestaoPrestador] carregar lista:", e);
      setErroCarregar(
        "Não foi possível carregar os prestadores. Se o problema persistir, entre em contato com o suporte.",
      );
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setSortPrestadores({ col: "nome", dir: "asc" });
  }, [abaPagina]);

  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    lista.forEach((r) => {
      if (r.setor.trim()) s.add(r.setor.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lista]);

  const opcoesVinculoFlat = useMemo(() => flattenVinculosDeGrupos(organogramaGrupos), [organogramaGrupos]);

  const diretoriasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesVinculoFlat.forEach((v) => u.add(v.diretoriaNome));
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesVinculoFlat]);

  const gerenciasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesVinculoFlat.forEach((v) => {
      if (!v.gerenciaNome) return;
      if (filtroDiretoria && v.diretoriaNome !== filtroDiretoria) return;
      u.add(v.gerenciaNome);
    });
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesVinculoFlat, filtroDiretoria]);

  const opcoesFiltroDiretoria = useMemo(
    () => diretoriasOpcoes.map((d) => ({ value: d, label: d })),
    [diretoriasOpcoes],
  );
  const opcoesFiltroGerencia = useMemo(
    () => gerenciasOpcoes.map((g) => ({ value: g, label: g })),
    [gerenciasOpcoes],
  );
  const opcoesFiltroSetor = useMemo(
    () => setoresUnicos.map((s) => ({ value: s, label: s })),
    [setoresUnicos],
  );

  const filtrada = useMemo(() => {
    const digits = somenteDigitos(busca);
    const q = busca.trim();
    return lista.filter((r) => {
      if (filtroStatus === "disponiveis") {
        if (r.status === "encerrado") return false;
      } else if (r.status !== filtroStatus) return false;
      if (filtroContrato !== "todos" && r.tipo_contrato !== filtroContrato) return false;
      if (filtroSetor && r.setor.trim() !== filtroSetor) return false;
      if (filtroDiretoria) {
        const o = encontrarVinculoParaFuncionarioRow(r, opcoesVinculoFlat);
        if (!o || o.diretoriaNome !== filtroDiretoria) return false;
      }
      if (filtroGerencia) {
        const o = encontrarVinculoParaFuncionarioRow(r, opcoesVinculoFlat);
        if (!o || o.gerenciaNome !== filtroGerencia) return false;
      }
      if (!q && digits.length === 0) return true;
      if (digits.length === 11 && r.cpf === digits) return true;
      if (textoContemBusca(r.nome, busca)) return true;
      if (textoContemBusca(r.email, busca)) return true;
      if (r.cpf && r.cpf.includes(digits) && digits.length >= 3) return true;
      return false;
    });
  }, [lista, busca, filtroSetor, filtroContrato, filtroStatus, filtroDiretoria, filtroGerencia, opcoesVinculoFlat]);

  const resumoPrestadoresCards = useMemo(() => {
    const temOrganograma = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
    const total = filtrada.length;
    let ativo = 0;
    let indisponivel = 0;
    let encerrado = 0;
    for (const r of filtrada) {
      if (r.status === "ativo") ativo += 1;
      else if (r.status === "indisponivel") indisponivel += 1;
      else encerrado += 1;
    }
    const incompletos = filtrada.filter((r) => prestadorCadastroIncompleto(r, temOrganograma));
    const revisaoPendente = filtrada.filter((r) => revisaoCadastralPendenteParaFuncionario(r));
    return { total, porStatus: { ativo, indisponivel, encerrado }, incompletos, revisaoPendente, temOrganograma };
  }, [filtrada, permOrg.canView, permOrg.loading, opcoesVinculoFlat.length]);

  const liderImediatoLinha = useCallback(
    (row: RhFuncionario) => {
      const o = encontrarVinculoParaFuncionarioRow(row, opcoesVinculoFlat);
      if (o) return o.gestorNome;
      if (row.org_time_id) return opcoesTimes.find((x) => x.timeId === row.org_time_id)?.gestorNome ?? "—";
      return "—";
    },
    [opcoesTimes, opcoesVinculoFlat],
  );

  const onSortPrestadores = useCallback((col: PrestadoresSortCol) => {
    setSortPrestadores((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  }, []);

  const filtradaOrdenada = useMemo(() => {
    const { col, dir } = sortPrestadores;
    const mult = dir === "asc" ? 1 : -1;
    const rows = [...filtrada];
    rows.sort((a, b) => {
      switch (col) {
        case "nome":
          return mult * a.nome.localeCompare(b.nome, "pt-BR");
        case "cargo":
          return mult * a.cargo.localeCompare(b.cargo, "pt-BR");
        case "lider":
          return mult * liderImediatoLinha(a).localeCompare(liderImediatoLinha(b), "pt-BR");
        case "data_funcao":
          return mult * dataFuncaoOuInicioIso(a).localeCompare(dataFuncaoOuInicioIso(b), "pt-BR");
        case "salario":
          return mult * (valorRemuneracaoOrdenacao(a) - valorRemuneracaoOrdenacao(b));
        case "status": {
          const ord: Record<string, number> = { ativo: 0, indisponivel: 1, encerrado: 2 };
          const oa = ord[a.status] ?? 99;
          const ob = ord[b.status] ?? 99;
          if (oa !== ob) return mult * (oa - ob);
          return mult * a.nome.localeCompare(b.nome, "pt-BR");
        }
        default:
          return 0;
      }
    });
    return rows;
  }, [filtrada, sortPrestadores, liderImediatoLinha]);

  return {
    lista,
    setLista,
    loading,
    carregar,
    erroCarregar,
    setErroCarregar,
    opcoesTimes,
    organogramaGrupos,
    opcoesVinculoFlat,
    opcoesFiltroDiretoria,
    opcoesFiltroGerencia,
    opcoesFiltroSetor,
    gerenciasOpcoes,
    filtrada,
    resumoPrestadoresCards,
    filtradaOrdenada,
    liderImediatoLinha,
    onSortPrestadores,
    sortPrestadores,
    permOrg,
  };
}
