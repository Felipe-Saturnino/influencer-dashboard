import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { FONT } from "../../../constants/theme";
import {
  RH_VAGA_CANDIDATURA_ETAPAS,
  emailCandidaturaDisplay,
  labelVagaComCodigo,
  statusVagaEfetivo,
  vagaPassaFiltroTipoCandidaturas,
} from "../../../lib/rhVagasFormat";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { RH_CANDIDATURAS_SELECT } from "../../../lib/rhVagaCandidaturaQueries";
import { VAGA_FILTRO_TODAS_VAGAS_VALUE } from "../../../lib/rhVagasFiltroConstants";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../../../types/rhVaga";
import type { RhVagaCandidaturaEtapa, RhVagaCandidaturaRow, RhVagasCandidaturasFiltroTipo } from "../../../types/rhVagaCandidatura";
import type { FiltroBarCampoOption } from "../../FiltroBarCampoSelect";
import { getVagasKanbanColBodyMaxHeightPx, VAGAS_KANBAN_MAX_CARDS_VISIVEIS } from "../../../lib/rhVagaCandidaturaKanban";
import { CandidaturaKanbanCard } from "./CandidaturaKanbanCard";
import { ModalCandidaturaHistorico } from "./ModalCandidaturaHistorico";
import { ModalCandidaturaVer } from "./ModalCandidaturaVer";

const ERRO_CARGA_CANDIDATURAS =
  "Não foi possível carregar as candidaturas. Se o problema persistir, entre em contato com o suporte.";

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
  busca,
  filtroTipo,
  filtroStatusVaga,
  vagaIdFiltro,
  onOpcoesVagaChange,
  onVagaIdFiltroReset,
  podeEditarEtapa,
}: {
  t: Theme;
  busca: string;
  filtroTipo: RhVagasCandidaturasFiltroTipo;
  filtroStatusVaga: RhVagaStatus | "todos";
  vagaIdFiltro: string;
  onOpcoesVagaChange: (opcoes: FiltroBarCampoOption[]) => void;
  onVagaIdFiltroReset: () => void;
  podeEditarEtapa: boolean;
}) {
  const [candidaturas, setCandidaturas] = useState<RhVagaCandidaturaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [candidaturaVerId, setCandidaturaVerId] = useState<string | null>(null);
  const [candidaturaHistorico, setCandidaturaHistorico] = useState<RhVagaCandidaturaRow | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchAllPages(async (from, to) =>
        supabase
          .from("rh_vaga_candidaturas")
          .select(RH_CANDIDATURAS_SELECT)
          .order("created_at", { ascending: false })
          .range(from, to),
      );
      setCandidaturas((data ?? []) as unknown as RhVagaCandidaturaRow[]);
    } catch (e) {
      console.error("[rh_vaga_candidaturas] carregar", e);
      setErro(ERRO_CARGA_CANDIDATURAS);
      setCandidaturas([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const candidaturasFiltradasBloco1 = useMemo(() => {
    return candidaturas.filter((c) => {
      const vaga = c.vaga;
      if (!vaga) return false;
      if (filtroStatusVaga !== "todos" && statusVagaEfetivo(vaga) !== filtroStatusVaga) return false;
      if (!vagaPassaFiltroTipoCandidaturas(vaga.tipo_vaga as RhVagaTipo, filtroTipo)) return false;
      return textoContemBuscaEmAlgum(
        busca,
        vaga.titulo,
        vaga.codigo_vaga,
        c.nome_completo,
        emailCandidaturaDisplay(c) !== "—" ? emailCandidaturaDisplay(c) : null,
      );
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
    onOpcoesVagaChange(opcoesVaga.map((v) => ({ value: v.id, label: labelVagaComCodigo(v) })));
  }, [opcoesVaga, onOpcoesVagaChange]);

  useEffect(() => {
    if (vagaIdFiltro === VAGA_FILTRO_TODAS_VAGAS_VALUE) return;
    if (!opcoesVaga.some((v) => v.id === vagaIdFiltro)) onVagaIdFiltroReset();
  }, [opcoesVaga, vagaIdFiltro, onVagaIdFiltroReset]);

  const candidaturasKanban = useMemo(() => {
    if (vagaIdFiltro === VAGA_FILTRO_TODAS_VAGAS_VALUE) return candidaturasFiltradasBloco1;
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

  return (
    <>
      {erro ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            fontSize: 13,
            color: "#e84025",
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => void carregar()}
            style={{
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "transparent",
              color: "#e84025",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : erro ? null : candidaturasKanban.length === 0 ? (
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
                className="app-vagas-candidaturas-kanban-col"
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
                    fontFamily: FONT.body,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{col.label}</span>
                  <span style={{ color: t.textMuted, fontWeight: 600, fontFamily: FONT.body }}>{itens.length}</span>
                </div>
                <ul
                  className="app-vagas-candidaturas-kanban-col-body"
                  aria-label={
                    itens.length > VAGAS_KANBAN_MAX_CARDS_VISIVEIS
                      ? `${col.label} — ${itens.length} candidaturas, role para ver mais`
                      : undefined
                  }
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: getVagasKanbanColBodyMaxHeightPx(),
                    overflowY: itens.length > VAGAS_KANBAN_MAX_CARDS_VISIVEIS ? "auto" : "visible",
                  }}
                >
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
