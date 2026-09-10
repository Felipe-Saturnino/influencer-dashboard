import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useListboxKeyboardNavigation } from "../../../hooks/useListboxKeyboardNavigation";
import { FONT } from "../../../constants/theme";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  ModalBase,
  ModalHeader,
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
} from "../../../components/OperacoesModal";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { supabase } from "../../../lib/supabase";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { EscalaAlteracaoCelulaMeta } from "./CelulaIndicadorAlteracaoEscala";

const OBSERVACAO_MAX = 500;

export type LinhaColaboradorAlterarEscala = {
  id: string;
  nome: string;
  nomeCompletoCadastro: string;
  nickname: string;
  escalaCadastro: string;
  siglaTurnoStaff: string;
  turnoStaffNome: string;
};

export type DiaMesAlterarEscala = {
  dia: number;
  dowShort: string;
  iso: string;
};

export type AlteracaoCelulaAprovadaItem = {
  diaIso: string;
  valor: string;
  meta: EscalaAlteracaoCelulaMeta;
};

type OpcaoCelula = { value: string; label: string; disabled?: boolean };

type RpcAlterarCelulaResult = {
  ok?: boolean;
  error?: string;
  valor_anterior?: string;
  observacao?: string | null;
  alterado_em?: string;
  alterado_por_nome?: string;
};

type ModalAlterarEscalaProps = {
  areaKey: string;
  refMesIso: string;
  hojeIso: string;
  dias: DiaMesAlterarEscala[];
  prestadores: LinhaColaboradorAlterarEscala[];
  celulas: Record<string, string>;
  canEditar: boolean;
  sanitizarValor: (siglaTurnoStaff: string, valorArmazenado: string, turnoStaffNome: string) => string;
  opcoesSelectCelula: (row: LinhaColaboradorAlterarEscala) => OpcaoCelula[];
  labelExibicaoCelula: (
    siglaTurnoStaff: string,
    valorArmazenado: string | undefined,
    turnoStaffNome: string,
  ) => string;
  chaveCelula: (rowId: string, iso: string) => string;
  onClose: () => void;
  onCelulasAlteradas: (funcionarioId: string, itens: AlteracaoCelulaAprovadaItem[]) => void;
};

const labelCampoStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 6,
  fontFamily: FONT.body,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const MSG_ERRO_GENERICO =
  "Não foi possível alterar a escala. Se o problema persistir, entre em contato com o suporte.";

function mensagemErroAlterarCelula(code: string): string {
  switch (code) {
    case "not_authenticated":
      return "Sessão expirada. Entre novamente para alterar a escala.";
    case "forbidden":
      return "Sem permissão para alterar a escala.";
    case "escala_nao_aprovada":
      return "A escala desta área não está aprovada.";
    case "dia_passado":
      return "Só é possível alterar dias a partir de hoje.";
    case "dia_fora_mes":
      return "O dia selecionado não pertence ao mês exibido no carrossel.";
    case "prestador_fora_area":
      return "O prestador não pertence a esta área.";
    case "invalid_area":
      return "A área da escala não foi reconhecida. Recarregue a página e tente novamente.";
    case "invalid_payload":
      return "Selecione o prestador e altere pelo menos um dia antes de salvar.";
    case "valor_too_long":
      return "O status selecionado não é válido para esta escala.";
    case "observacao_too_long":
      return `A observação deve ter no máximo ${OBSERVACAO_MAX} caracteres.`;
    case "observacao_obrigatoria":
      return "Informe a observação sobre a alteração.";
    default:
      return MSG_ERRO_GENERICO;
  }
}

/** Compra/Venda do Marketplace — não editáveis no modal (só automação). */
function ehCelulaMarketplaceTravadaAlterarEscala(valor: string): boolean {
  const v = (valor ?? "").trim();
  return v === "Compra" || v === "Venda" || v.startsWith("Compra - ");
}

function labelMesRefAlterarEscala(refMesIso: string): string {
  const [y, m] = refMesIso.split("-").map((x) => Number(x));
  if (!y || !m) return refMesIso;
  const raw = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function tintCelulaStatus(valor: string, isDark: boolean): string | undefined {
  if (valor === "MRN" || valor === "Manhã") {
    return isDark ? "color-mix(in srgb, #22c55e 22%, transparent)" : "#dcfce7";
  }
  if (valor === "AFT" || valor === "Tarde") {
    return isDark ? "color-mix(in srgb, #f59e0b 22%, transparent)" : "#fef3c7";
  }
  if (valor === "NGT" || valor === "Noite") {
    return isDark ? "color-mix(in srgb, #1e36f8 22%, transparent)" : "#dbeafe";
  }
  if (valor === "Folga") {
    return isDark ? "color-mix(in srgb, #6b7280 18%, transparent)" : "#f3f4f6";
  }
  if (valor === "Comercial") {
    return isDark ? "color-mix(in srgb, #a78bfa 22%, transparent)" : "#f3e8ff";
  }
  return undefined;
}

export function ModalAlterarEscala({
  areaKey,
  refMesIso,
  hojeIso,
  dias,
  prestadores,
  celulas,
  canEditar,
  sanitizarValor,
  opcoesSelectCelula,
  labelExibicaoCelula,
  chaveCelula,
  onClose,
  onCelulasAlteradas,
}: ModalAlterarEscalaProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const buscaRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [prestadorId, setPrestadorId] = useState<string | null>(null);
  /** Rascunho local: iso → valor sanitizado editado. */
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const prestador = useMemo(
    () => (prestadorId ? prestadores.find((p) => p.id === prestadorId) : undefined),
    [prestadores, prestadorId],
  );

  const prestadoresFiltrados = useMemo(() => {
    const q = busca.trim();
    if (!q) return prestadores;
    return prestadores.filter((p) =>
      textoContemBuscaEmAlgum(q, p.nome, p.nomeCompletoCadastro, p.nickname),
    );
  }, [prestadores, busca]);

  const prestadoresKeyboard = useListboxKeyboardNavigation({
    items: prestadoresFiltrados,
    onSelect: (p) => {
      setPrestadorId(p.id);
      setBusca("");
    },
  });

  useEffect(() => {
    const id = window.setTimeout(() => buscaRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    setRascunho({});
    setObservacao("");
    setErr(null);
  }, [prestadorId]);

  const valorOriginalDia = (diaIso: string): string => {
    if (!prestador) return "";
    const bruto = celulas[chaveCelula(prestador.id, diaIso)] ?? "";
    return sanitizarValor(prestador.siglaTurnoStaff, bruto, prestador.turnoStaffNome);
  };

  const valorEditDia = (diaIso: string): string => {
    if (Object.prototype.hasOwnProperty.call(rascunho, diaIso)) return rascunho[diaIso] ?? "";
    return valorOriginalDia(diaIso);
  };

  const opcoesBase = useMemo(
    () => (prestador ? opcoesSelectCelula(prestador) : []),
    [prestador, opcoesSelectCelula],
  );

  const diasAlterados = useMemo(() => {
    if (!prestador) return [] as string[];
    const out: string[] = [];
    for (const d of dias) {
      if (d.iso < hojeIso) continue;
      const bruto = celulas[chaveCelula(prestador.id, d.iso)] ?? "";
      const original = sanitizarValor(prestador.siglaTurnoStaff, bruto, prestador.turnoStaffNome);
      if (ehCelulaMarketplaceTravadaAlterarEscala(original)) continue;
      const edit = Object.prototype.hasOwnProperty.call(rascunho, d.iso)
        ? (rascunho[d.iso] ?? "")
        : original;
      if (edit !== original) out.push(d.iso);
    }
    return out;
  }, [prestador, dias, hojeIso, rascunho, celulas, chaveCelula, sanitizarValor]);

  const obsTrim = observacao.trim();
  const podeSalvar =
    canEditar && prestador != null && diasAlterados.length > 0 && obsTrim.length > 0 && !salvando;

  const labelMes = labelMesRefAlterarEscala(refMesIso);

  const salvar = async () => {
    if (!prestador || !podeSalvar) return;
    if (!obsTrim) {
      setErr("Informe a observação sobre a alteração.");
      return;
    }
    setErr(null);
    setSalvando(true);
    const sucessos: AlteracaoCelulaAprovadaItem[] = [];
    let primeiroErro: string | null = null;

    try {
      for (const diaIso of diasAlterados) {
        const valorOriginal = valorOriginalDia(diaIso);
        if (ehCelulaMarketplaceTravadaAlterarEscala(valorOriginal)) continue;
        const valorSan = sanitizarValor(prestador.siglaTurnoStaff, valorEditDia(diaIso), prestador.turnoStaffNome);
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_alterar_celula", {
          p_ref_mes: refMesIso,
          p_area_key: areaKey,
          p_funcionario_id: prestador.id,
          p_dia_iso: diaIso,
          p_valor: valorSan,
          p_observacao: obsTrim,
        });
        if (error) {
          console.error("[Alterar Escala] falha na chamada rh_gestao_escala_grade_alterar_celula", {
            erro: error,
            refMesIso,
            areaKey,
            diaIso,
          });
          primeiroErro = MSG_ERRO_GENERICO;
          break;
        }
        const payload = data as RpcAlterarCelulaResult | null;
        if (!payload?.ok) {
          console.error("[Alterar Escala] recusado pela base", {
            code: payload?.error ?? "(sem código)",
            refMesIso,
            areaKey,
            diaIso,
            valor: valorSan,
          });
          primeiroErro = mensagemErroAlterarCelula(payload?.error ?? "");
          break;
        }
        sucessos.push({
          diaIso,
          valor: valorSan,
          meta: {
            valorAnterior: (payload.valor_anterior ?? valorOriginal).trim(),
            alteradoPorNome: (payload.alterado_por_nome ?? "").trim() || "Usuário",
            alteradoEm: payload.alterado_em ?? new Date().toISOString(),
            observacao: payload.observacao ?? obsTrim,
          },
        });
      }

      if (sucessos.length > 0) {
        onCelulasAlteradas(prestador.id, sucessos);
        setRascunho((prev) => {
          const next = { ...prev };
          for (const s of sucessos) delete next[s.diaIso];
          return next;
        });
      }

      if (primeiroErro) {
        setErr(
          sucessos.length > 0
            ? `${primeiroErro} ${sucessos.length} dia(s) já foram gravados.`
            : primeiroErro,
        );
        return;
      }

      onClose();
    } catch (e) {
      console.error("[Alterar Escala] falha inesperada no lote", { erro: e, refMesIso, areaKey });
      if (sucessos.length > 0) onCelulasAlteradas(prestador.id, sucessos);
      setErr(MSG_ERRO_GENERICO);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalBase maxWidth={760} panelOverflow="hidden" onClose={() => !salvando && onClose()}>
      <ModalHeader title="Alterar Escala" onClose={() => !salvando && onClose()} />
      <div style={{ ...MODAL_FORM_SHELL_STYLE, fontFamily: FONT.body }}>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          {!prestador ? (
            <>
              <BarraPesquisaPagina
                inputRef={buscaRef}
                value={busca}
                onChange={setBusca}
                placeholder={PAGE_SEARCH.nomeNickname}
                aria-label="Pesquisar prestador por nome ou nickname"
                aria-activedescendant={
                  prestadoresFiltrados[prestadoresKeyboard.activeIndex]
                    ? `alterar-escala-prestador-${prestadoresKeyboard.activeIndex}`
                    : undefined
                }
                onKeyDown={prestadoresKeyboard.onKeyDown}
                wrapperStyle={{ width: "100%" }}
              />
              <div
                role="listbox"
                aria-label="Prestadores da área selecionada"
                style={{
                  maxHeight: 280,
                  overflowY: "auto",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg,
                  padding: 8,
                }}
              >
                {prestadores.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: t.textMuted, textAlign: "center" }}>
                    Nenhum prestador nesta área para os filtros aplicados.
                  </div>
                ) : prestadoresFiltrados.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: t.textMuted, textAlign: "center" }}>
                    Nenhum prestador corresponde à pesquisa.
                  </div>
                ) : (
                  prestadoresFiltrados.map((p, index) => (
                    <button
                      key={p.id}
                      id={`alterar-escala-prestador-${index}`}
                      ref={(node) => {
                        prestadoresKeyboard.optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={false}
                      tabIndex={-1}
                      onMouseEnter={() => prestadoresKeyboard.setActiveIndex(index)}
                      onClick={() => {
                        setPrestadorId(p.id);
                        setBusca("");
                      }}
                      style={{
                        width: "100%",
                        display: "block",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "none",
                        borderRadius: 8,
                        borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 55%, transparent)`,
                        background:
                          index === prestadoresKeyboard.activeIndex
                            ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                            : "transparent",
                        color: t.text,
                        fontFamily: FONT.body,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                        {p.nickname !== "—" ? p.nickname : p.nomeCompletoCadastro}
                        {" · "}
                        {p.escalaCadastro}
                        {p.turnoStaffNome.trim() ? ` · ${p.turnoStaffNome.trim()}` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <strong style={{ fontSize: 14, color: t.text }}>{labelMes}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: "color-mix(in srgb, #22c55e 18%, transparent)",
                      color: "#22c55e",
                      border: "1px solid color-mix(in srgb, #22c55e 35%, transparent)",
                    }}
                  >
                    Escala aprovada
                  </span>
                </div>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    setPrestadorId(null);
                    setBusca("");
                    window.setTimeout(() => buscaRef.current?.focus(), 50);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${t.cardBorder}`,
                    background: "transparent",
                    color: t.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    cursor: salvando ? "wait" : "pointer",
                  }}
                >
                  Trocar prestador
                </button>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{prestador.nome}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {prestador.nickname !== "—" ? prestador.nickname : prestador.nomeCompletoCadastro}
                  {" · "}
                  {prestador.escalaCadastro}
                  {prestador.turnoStaffNome.trim() ? ` · ${prestador.turnoStaffNome.trim()}` : ""}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, #1e36f8 30%, transparent)",
                  background: "color-mix(in srgb, #1e36f8 8%, transparent)",
                  padding: "10px 12px",
                  fontSize: 13,
                  color: t.text,
                }}
              >
                Edite os dias a partir de hoje. Células de Marketplace (Compra / Venda) ficam travadas.
                Ao salvar, só este prestador é atualizado — o restante da escala aprovada permanece intacto.
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { label: "Travado = passado", bg: t.inputBg, color: t.textMuted, border: t.cardBorder },
                  {
                    label: "Editado nesta sessão",
                    bg: "color-mix(in srgb, #1e36f8 12%, transparent)",
                    color: "#1e36f8",
                    border: "color-mix(in srgb, #1e36f8 35%, transparent)",
                  },
                  {
                    label: "Marketplace",
                    bg: "color-mix(in srgb, #f59e0b 16%, transparent)",
                    color: "#b45309",
                    border: "color-mix(in srgb, #f59e0b 40%, transparent)",
                  },
                ].map((pill) => (
                  <span
                    key={pill.label}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: pill.bg,
                      color: pill.color,
                      border: `1px solid ${pill.border}`,
                    }}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>

              {dias.length === 0 ? (
                <div style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: 16 }}>
                  Sem dados para o período selecionado.
                </div>
              ) : (
                <div
                  role="group"
                  aria-label={`Grade de ${prestador.nome} em ${labelMes}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
                    gap: 6,
                  }}
                >
                  {dias.map((d) => {
                    const locked = d.iso < hojeIso;
                    const original = valorOriginalDia(d.iso);
                    const edit = valorEditDia(d.iso);
                    const marketplace = ehCelulaMarketplaceTravadaAlterarEscala(original);
                    const dirty = !locked && !marketplace && edit !== original;
                    const labelAtual = labelExibicaoCelula(
                      prestador.siglaTurnoStaff,
                      edit,
                      prestador.turnoStaffNome,
                    );
                    const opcoesDia =
                      marketplace && !opcoesBase.some((o) => o.value === original)
                        ? [{ value: original, label: labelAtual, disabled: true }, ...opcoesBase]
                        : opcoesBase;
                    const bg =
                      marketplace
                        ? "color-mix(in srgb, #f59e0b 10%, transparent)"
                        : dirty
                          ? "color-mix(in srgb, #1e36f8 10%, transparent)"
                          : locked
                            ? t.inputBg ?? t.cardBg
                            : tintCelulaStatus(edit, Boolean(t.isDark)) ?? t.cardBg;

                    return (
                      <div
                        key={d.iso}
                        style={{
                          border: marketplace
                            ? "1px dashed color-mix(in srgb, #f59e0b 45%, transparent)"
                            : dirty
                              ? "1px solid color-mix(in srgb, #1e36f8 35%, transparent)"
                              : `1px solid ${t.cardBorder}`,
                          borderRadius: 10,
                          padding: "8px 6px",
                          minHeight: 72,
                          background: bg,
                          opacity: locked ? 0.55 : 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: t.text,
                          }}
                        >
                          <span>
                            {d.dia} {d.dowShort}
                          </span>
                          <span style={{ fontWeight: 600, color: t.textMuted, fontSize: 10 }}>
                            {locked ? "travado" : marketplace ? "Mkt" : dirty ? "editado" : ""}
                          </span>
                        </div>
                        {locked || marketplace || !canEditar ? (
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: t.textMuted,
                              padding: "4px 0",
                            }}
                            title={labelAtual}
                          >
                            {labelAtual || "—"}
                          </div>
                        ) : (
                          <select
                            aria-label={`Status do dia ${d.dia} de ${prestador.nome}`}
                            value={edit}
                            disabled={salvando}
                            onChange={(e) => {
                              const next = e.target.value;
                              setRascunho((prev) => {
                                const orig = valorOriginalDia(d.iso);
                                if (next === orig) {
                                  const copy = { ...prev };
                                  delete copy[d.iso];
                                  return copy;
                                }
                                return { ...prev, [d.iso]: next };
                              });
                              setErr(null);
                            }}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              padding: "4px 4px",
                              fontSize: 11,
                              fontFamily: FONT.body,
                              background: tintCelulaStatus(edit, Boolean(t.isDark)) ?? t.inputBg ?? "#fff",
                              color: t.text,
                              cursor: salvando ? "wait" : "pointer",
                            }}
                          >
                            {opcoesDia.map((o) => (
                              <option
                                key={o.value === "" ? "__empty" : o.value}
                                value={o.value}
                                disabled={o.disabled}
                              >
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {canEditar ? (
                <div>
                  <label htmlFor="alterar-escala-observacao" style={{ ...labelCampoStyle, color: t.textMuted }}>
                    Observação
                    <CampoObrigatorioMark />
                  </label>
                  <textarea
                    id="alterar-escala-observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value.slice(0, OBSERVACAO_MAX))}
                    rows={3}
                    required
                    disabled={salvando}
                    placeholder="Motivo ou contexto da alteração..."
                    aria-label="Observação sobre a alteração de escala"
                    aria-required="true"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg ?? t.cardBg ?? "transparent",
                      color: t.text,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      resize: "vertical",
                      minHeight: 72,
                    }}
                  />
                </div>
              ) : (
                <div style={{ fontSize: 12, color: t.textMuted }}>
                  Você não tem permissão de Editar para alterar o status.
                </div>
              )}
            </>
          )}

          {err ? (
            <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12 }}>
              {err}
            </div>
          ) : null}
        </div>

        {prestador && canEditar ? (
          <div
            style={{
              ...MODAL_FORM_FOOTER_STYLE,
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 0,
              paddingTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              {diasAlterados.length} dia{diasAlterados.length === 1 ? "" : "s"} alterado
              {diasAlterados.length === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              disabled={!podeSalvar}
              onClick={() => void salvar()}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: podeSalvar ? getCtaCriarGradient(brand) : t.cardBorder,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: podeSalvar ? (salvando ? "wait" : "pointer") : "not-allowed",
                opacity: salvando ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {salvando ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
              Salvar alterações
            </button>
          </div>
        ) : null}
      </div>
    </ModalBase>
  );
}
