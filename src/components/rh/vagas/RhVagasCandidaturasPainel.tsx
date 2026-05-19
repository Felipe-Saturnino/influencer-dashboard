import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import {
  RH_VAGA_CANDIDATURA_ETAPAS,
  emailCandidaturaDeJoin,
  labelVagaComCodigo,
  normalizarBuscaVaga,
  vagaPassaFiltroTipoCandidaturas,
} from "../../../lib/rhVagasFormat";
import { RH_CANDIDATURAS_SELECT } from "../../../lib/rhVagaCandidaturaQueries";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../../../types/rhVaga";
import type { RhVagaCandidaturaEtapa, RhVagaCandidaturaRow, RhVagasCandidaturasFiltroTipo } from "../../../types/rhVagaCandidatura";
import { CandidaturaKanbanCard } from "./CandidaturaKanbanCard";
import { ModalCandidaturaHistorico } from "./ModalCandidaturaHistorico";
import { ModalCandidaturaVer } from "./ModalCandidaturaVer";

const STATUS_FILTRO: Array<RhVagaStatus | "todos"> = ["todos", "aberta", "em_andamento", "concluida", "cancelada"];

const LABEL_STATUS: Record<RhVagaStatus | "todos", string> = {
  todos: "Todos os status",
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TIPO_FILTRO: { value: RhVagasCandidaturasFiltroTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "externo", label: "Externo" },
  { value: "interno", label: "Interno" },
];

type Theme = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
  cardBg?: string;
  isDark?: boolean;
};

export function RhVagasCandidaturasPainel({
  t,
  cardShadow,
  podeEditarEtapa,
}: {
  t: Theme;
  cardShadow: string;
  podeEditarEtapa: boolean;
}) {
  const [candidaturas, setCandidaturas] = useState<RhVagaCandidaturaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<RhVagasCandidaturasFiltroTipo>("todos");
  const [filtroStatusVaga, setFiltroStatusVaga] = useState<RhVagaStatus | "todos">("todos");
  const [vagaIdFiltro, setVagaIdFiltro] = useState<string>("todas");
  const [candidaturaVerId, setCandidaturaVerId] = useState<string | null>(null);
  const [candidaturaHistorico, setCandidaturaHistorico] = useState<RhVagaCandidaturaRow | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("rh_vaga_candidaturas")
      .select(RH_CANDIDATURAS_SELECT)
      .order("created_at", { ascending: false });
    if (error) {
      setErro(error.message);
      setCandidaturas([]);
    } else {
      setCandidaturas((data ?? []) as unknown as RhVagaCandidaturaRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const candidaturasFiltradasBloco1 = useMemo(() => {
    const q = normalizarBuscaVaga(busca);
    return candidaturas.filter((c) => {
      const vaga = c.vaga;
      if (!vaga) return false;
      if (filtroStatusVaga !== "todos" && vaga.status !== filtroStatusVaga) return false;
      if (!vagaPassaFiltroTipoCandidaturas(vaga.tipo_vaga as RhVagaTipo, filtroTipo)) return false;
      if (!q) return true;
      if (normalizarBuscaVaga(vaga.titulo).includes(q)) return true;
      if (normalizarBuscaVaga(vaga.codigo_vaga ?? "").includes(q)) return true;
      if (normalizarBuscaVaga(c.nome_completo).includes(q)) return true;
      const em = emailCandidaturaDeJoin(c.funcionario);
      if (em !== "—" && normalizarBuscaVaga(em).includes(q)) return true;
      return false;
    });
  }, [candidaturas, busca, filtroTipo, filtroStatusVaga]);

  const opcoesVaga = useMemo(() => {
    const map = new Map<string, Pick<RhVagaRow, "id" | "codigo_vaga" | "titulo">>();
    for (const c of candidaturasFiltradasBloco1) {
      if (c.vaga?.id) map.set(c.vaga.id, c.vaga as Pick<RhVagaRow, "id" | "codigo_vaga" | "titulo">);
    }
    return [...map.values()].sort((a, b) => labelVagaComCodigo(a).localeCompare(labelVagaComCodigo(b), "pt-BR"));
  }, [candidaturasFiltradasBloco1]);

  useEffect(() => {
    if (vagaIdFiltro === "todas") return;
    if (!opcoesVaga.some((v) => v.id === vagaIdFiltro)) setVagaIdFiltro("todas");
  }, [opcoesVaga, vagaIdFiltro]);

  const candidaturasKanban = useMemo(() => {
    if (vagaIdFiltro === "todas") return candidaturasFiltradasBloco1;
    return candidaturasFiltradasBloco1.filter((c) => c.vaga_id === vagaIdFiltro);
  }, [candidaturasFiltradasBloco1, vagaIdFiltro]);

  const porEtapa = useMemo(() => {
    const m = new Map<RhVagaCandidaturaEtapa, RhVagaCandidaturaRow[]>();
    for (const e of RH_VAGA_CANDIDATURA_ETAPAS) m.set(e.id, []);
    for (const c of candidaturasKanban) {
      const etapaRaw = c.etapa as string;
      const etapa = etapaRaw === "aprovado" ? "stand_by" : c.etapa;
      const lista = m.get(etapa as RhVagaCandidaturaEtapa) ?? [];
      lista.push(c);
      m.set(etapa as RhVagaCandidaturaEtapa, lista);
    }
    return m;
  }, [candidaturasKanban]);

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
    outline: "none" as const,
  };

  const selectStyle = { ...inputStyle, minWidth: 160 };

  return (
    <>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Candidaturas</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
          Acompanhamento do funil de candidatos por vaga.
        </p>
      </header>

      <section
        aria-label="Filtros de candidaturas"
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          background: t.cardBg ?? t.inputBg,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>Filtros</div>
        <div style={{ position: "relative", maxWidth: 520, marginBottom: 14 }}>
          <Search
            size={16}
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: t.textMuted,
              pointerEvents: "none",
            }}
          />
          <input
            id="busca-candidaturas"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome da vaga, candidato ou e-mail…"
            autoComplete="off"
            aria-label="Pesquisar por nome da vaga, nome do candidato ou e-mail do candidato"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", paddingLeft: 38 }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div>
            <label htmlFor="filtro-tipo-cand" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Tipo de vaga
            </label>
            <select
              id="filtro-tipo-cand"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as RhVagasCandidaturasFiltroTipo)}
              aria-label="Filtrar por tipo de vaga"
              style={selectStyle}
            >
              {TIPO_FILTRO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-status-cand" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Status da vaga
            </label>
            <select
              id="filtro-status-cand"
              value={filtroStatusVaga}
              onChange={(e) => setFiltroStatusVaga(e.target.value as RhVagaStatus | "todos")}
              aria-label="Filtrar por status da vaga"
              style={selectStyle}
            >
              {STATUS_FILTRO.map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section aria-label="Quadro de candidatos">
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="filtro-vaga-cand" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
            Vaga
          </label>
          <select
            id="filtro-vaga-cand"
            value={vagaIdFiltro}
            onChange={(e) => setVagaIdFiltro(e.target.value)}
            aria-label="Filtrar por vaga"
            style={{ ...selectStyle, width: "100%", maxWidth: 560 }}
          >
            <option value="todas">Todas as vagas (filtros acima)</option>
            {opcoesVaga.map((v) => (
              <option key={v.id} value={v.id}>
                {labelVagaComCodigo(v)}
              </option>
            ))}
          </select>
        </div>

        {erro ? (
          <div role="alert" style={{ marginBottom: 12, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : candidaturasKanban.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhuma candidatura para os filtros atuais.
          </div>
        ) : (
          <div className="app-vagas-candidaturas-kanban" role="region" aria-label="Funil de candidaturas">
            {RH_VAGA_CANDIDATURA_ETAPAS.map((col) => {
              const itens = porEtapa.get(col.id) ?? [];
              return (
                <div
                  key={col.id}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.cardBg ?? t.inputBg,
                    minHeight: 120,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${t.cardBorder}`,
                      fontSize: 12,
                      fontWeight: 700,
                      color: t.text,
                      fontFamily: FONT_TITLE,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>{col.label}</span>
                    <span style={{ color: t.textMuted, fontWeight: 600, fontFamily: FONT.body }}>{itens.length}</span>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 8, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {itens.length === 0 ? (
                      <li style={{ fontSize: 12, color: t.textMuted, padding: 8, fontFamily: FONT.body, textAlign: "center" }}>—</li>
                    ) : (
                      itens.map((c) => (
                        <CandidaturaKanbanCard
                          key={c.id}
                          c={c}
                          etapaColuna={col.id}
                          t={t}
                          onVer={() => setCandidaturaVerId(c.id)}
                          onHistorico={() => setCandidaturaHistorico(c)}
                        />
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ModalCandidaturaVer
        open={candidaturaVerId !== null}
        candidaturaId={candidaturaVerId}
        onClose={() => setCandidaturaVerId(null)}
        onAtualizado={() => void carregar()}
        podeEditar={podeEditarEtapa}
        t={t}
      />

      <ModalCandidaturaHistorico
        open={candidaturaHistorico !== null}
        candidatura={candidaturaHistorico}
        onClose={() => setCandidaturaHistorico(null)}
        t={t}
      />
    </>
  );
}
