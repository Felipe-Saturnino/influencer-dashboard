import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { SectionTitle } from "../../../components/dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { formatarPeriodoExperiencia } from "../../../lib/rhExperienciaDates";
import {
  RH_FORMACAO_GRAU_LABEL,
  RH_FORMACAO_STATUS_COLOR,
  RH_FORMACAO_STATUS_LABEL,
  RH_IDIOMA_NIVEL_LABEL,
  RH_PORTFOLIO_TIPO_LABEL,
} from "../../../lib/rhFormacaoCompetenciasConstants";
import { RH_FORMACAO_PORTFOLIO_BUCKET } from "../../../lib/rhFormacaoCompetenciasStorage";
import { supabase } from "../../../lib/supabase";
import type {
  RhFuncionarioCurso,
  RhFuncionarioFormacao,
  RhFuncionarioIdioma,
  RhFuncionarioPortfolio,
} from "../../../types/rhFormacaoCompetencias";
import type { RhFuncionarioExperiencia } from "../../../types/rhExperienciaProfissional";
import { getFormacaoSectionHeaderStyle, getFormacaoStatusBadgeStyle } from "../DadosCadastro/FormacaoCompetencias/sharedStyles";
import { getExperienciaSectionHeaderStyle } from "../DadosCadastro/ExperienciaProfissional/sharedStyles";

export function PrestadorCarreiraVerPanel({ funcionarioId }: { funcionarioId: string | null }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formacoes, setFormacoes] = useState<RhFuncionarioFormacao[]>([]);
  const [idiomas, setIdiomas] = useState<RhFuncionarioIdioma[]>([]);
  const [cursos, setCursos] = useState<RhFuncionarioCurso[]>([]);
  const [portfolio, setPortfolio] = useState<RhFuncionarioPortfolio[]>([]);
  const [experiencias, setExperiencias] = useState<RhFuncionarioExperiencia[]>([]);
  const [signedPortfolio, setSignedPortfolio] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    if (!funcionarioId) {
      setLoading(false);
      setFormacoes([]);
      setIdiomas([]);
      setCursos([]);
      setPortfolio([]);
      setExperiencias([]);
      return;
    }
    setLoading(true);
    setErro(null);
    const [fRes, iRes, cRes, pRes, eRes] = await Promise.all([
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
      supabase
        .from("rh_funcionario_experiencia")
        .select("*")
        .eq("rh_funcionario_id", funcionarioId)
        .order("mes_ano_fim", { ascending: false, nullsFirst: true })
        .order("mes_ano_inicio", { ascending: false }),
    ]);
    setLoading(false);
    if (fRes.error || iRes.error || cRes.error || pRes.error || eRes.error) {
      setErro("Não foi possível carregar os dados de carreira. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    const portRows = (pRes.data ?? []) as RhFuncionarioPortfolio[];
    setFormacoes((fRes.data ?? []) as RhFuncionarioFormacao[]);
    setIdiomas((iRes.data ?? []) as RhFuncionarioIdioma[]);
    setCursos((cRes.data ?? []) as RhFuncionarioCurso[]);
    setPortfolio(portRows);
    setExperiencias((eRes.data ?? []) as RhFuncionarioExperiencia[]);

    if (portRows.some((p) => p.storage_path)) {
      const signed: Record<string, string> = {};
      await Promise.all(
        portRows
          .filter((p) => p.storage_path)
          .map(async (p) => {
            const { data } = await supabase.storage
              .from(RH_FORMACAO_PORTFOLIO_BUCKET)
              .createSignedUrl(p.storage_path!, 3600);
            if (data?.signedUrl) signed[p.id] = data.signedUrl;
          }),
      );
      setSignedPortfolio(signed);
    } else {
      setSignedPortfolio({});
    }
  }, [funcionarioId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const idiomasSorted = useMemo(
    () =>
      [...idiomas].sort((a, b) =>
        compareLocaleTexto(a.rh_idiomas?.nome ?? "", b.rh_idiomas?.nome ?? "", "asc"),
      ),
    [idiomas],
  );

  const temAlgumRegistro =
    formacoes.length > 0 ||
    idiomas.length > 0 ||
    cursos.length > 0 ||
    portfolio.length > 0 ||
    experiencias.length > 0;

  if (!funcionarioId) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Cadastro não disponível.
      </p>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 160,
          color: t.textMuted,
          fontFamily: FONT.body,
          fontSize: 13,
        }}
      >
        <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }

  if (erro) {
    return (
      <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
        {erro}
      </div>
    );
  }

  if (!temAlgumRegistro) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.55 }}>
        Nenhum registro de carreira cadastrado em Dados de Cadastro.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {formacoes.length > 0 ? (
        <div style={pageBox}>
          <div style={getFormacaoSectionHeaderStyle()}>
            <SectionTitle sub="Graduação, pós e demais níveis">Formação acadêmica</SectionTitle>
          </div>
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 640 })}>
              <caption style={{ display: "none" }}>Formação acadêmica do prestador</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Curso
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Instituição
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Grau
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Ano
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {formacoes.map((row, i) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {idiomasSorted.length > 0 ? (
        <div style={pageBox}>
          <div style={getFormacaoSectionHeaderStyle()}>
            <SectionTitle sub="Um registro por idioma">Idiomas</SectionTitle>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {idiomasSorted.map((row, i) => (
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
                <span style={{ flex: 1, minWidth: 120, fontWeight: 700, color: t.text }}>
                  {row.rh_idiomas?.nome ?? "—"}
                </span>
                <span style={{ color: t.textMuted }}>{RH_IDIOMA_NIVEL_LABEL[row.nivel]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {cursos.length > 0 ? (
        <div style={pageBox}>
          <div style={getFormacaoSectionHeaderStyle()}>
            <SectionTitle sub="Certificações e cursos complementares">Cursos</SectionTitle>
          </div>
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 560 })}>
              <caption style={{ display: "none" }}>Cursos e certificações</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Nome
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Instituição
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Carga (h)
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Ano
                  </th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.nome}</td>
                    <td style={dataTable.tdCenter}>{row.instituicao}</td>
                    <td style={dataTable.tdCenter}>{row.carga_horaria_horas ?? "—"}</td>
                    <td style={dataTable.tdCenter}>{row.ano ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {portfolio.length > 0 ? (
        <div style={pageBox}>
          <div style={getFormacaoSectionHeaderStyle()}>
            <SectionTitle sub="Links ou arquivos (vídeo e áudio somente por URL)">Portfólio</SectionTitle>
          </div>
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
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {experiencias.length > 0 ? (
        <div style={pageBox}>
          <div style={getExperienciaSectionHeaderStyle()}>
            <SectionTitle sub="Cargos e empresas onde trabalhou antes">Experiências anteriores</SectionTitle>
          </div>
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 560 })}>
              <caption style={{ display: "none" }}>Experiências profissionais anteriores</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Cargo
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Empresa
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Período
                  </th>
                </tr>
              </thead>
              <tbody>
                {experiencias.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{row.cargo}</td>
                    <td style={dataTable.tdCenter}>{row.empresa}</td>
                    <td style={dataTable.tdCenter}>
                      {formatarPeriodoExperiencia(row.mes_ano_inicio, row.mes_ano_fim)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
