import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
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
  onCelulaAlterada: (
    funcionarioId: string,
    diaIso: string,
    valor: string,
    meta: EscalaAlteracaoCelulaMeta,
  ) => void;
};

function diasEditaveisAlterarEscala(dias: DiaMesAlterarEscala[], hojeIso: string): DiaMesAlterarEscala[] {
  return dias.filter((d) => d.iso >= hojeIso);
}

function labelOpcaoDia(d: DiaMesAlterarEscala): string {
  const [, mm, dd] = d.iso.split("-");
  return `${d.dia} ${d.dowShort} — ${dd}/${mm}`;
}

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
      return "Selecione o prestador e o dia antes de salvar.";
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
  onCelulaAlterada,
}: ModalAlterarEscalaProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const buscaRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [prestadorId, setPrestadorId] = useState<string | null>(null);
  const [diaIso, setDiaIso] = useState("");
  const [valorEdit, setValorEdit] = useState("");
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const diasEditaveis = useMemo(() => diasEditaveisAlterarEscala(dias, hojeIso), [dias, hojeIso]);

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

  useEffect(() => {
    const id = window.setTimeout(() => buscaRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    setDiaIso("");
    setValorEdit("");
    setObservacao("");
    setErr(null);
  }, [prestadorId]);

  useEffect(() => {
    setObservacao("");
  }, [diaIso]);

  useEffect(() => {
    if (!prestador || !diaIso) {
      setValorEdit("");
      return;
    }
    const bruto = celulas[chaveCelula(prestador.id, diaIso)] ?? "";
    setValorEdit(sanitizarValor(prestador.siglaTurnoStaff, bruto, prestador.turnoStaffNome));
    setErr(null);
  }, [prestador, diaIso, celulas, chaveCelula, sanitizarValor]);

  const valorOriginal = useMemo(() => {
    if (!prestador || !diaIso) return "";
    const bruto = celulas[chaveCelula(prestador.id, diaIso)] ?? "";
    return sanitizarValor(prestador.siglaTurnoStaff, bruto, prestador.turnoStaffNome);
  }, [prestador, diaIso, celulas, chaveCelula, sanitizarValor]);

  const opcoesStatus = useMemo(() => {
    if (!prestador) return [];
    const base = opcoesSelectCelula(prestador);
    const valorMarketplace =
      valorOriginal === "Compra" || valorOriginal.startsWith("Compra - ") || valorOriginal === "Venda";
    if (!valorMarketplace || base.some((o) => o.value === valorOriginal)) return base;
    // Mostra o estado automático atual, mas não o oferece como escolha manual.
    return [{ value: valorOriginal, label: valorOriginal, disabled: true }, ...base];
  }, [prestador, opcoesSelectCelula, valorOriginal]);
  const statusAtualLabel = prestador
    ? labelExibicaoCelula(prestador.siglaTurnoStaff, valorOriginal, prestador.turnoStaffNome)
    : "—";

  const obsTrim = observacao.trim();

  const podeSalvar =
    canEditar &&
    prestador != null &&
    diaIso !== "" &&
    valorEdit !== valorOriginal &&
    obsTrim.length > 0 &&
    !salvando;

  const inputSomenteLeitura = (id: string, label: string, value: string) => (
    <div>
      <label htmlFor={id} style={{ ...labelCampoStyle, color: t.textMuted }}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        readOnly
        value={value}
        aria-readonly="true"
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
          cursor: "default",
        }}
      />
    </div>
  );

  const salvar = async () => {
    if (!prestador || !diaIso || !podeSalvar) return;
    if (!obsTrim) {
      setErr("Informe a observação sobre a alteração.");
      return;
    }
    setErr(null);
    setSalvando(true);
    try {
      const valorSan = sanitizarValor(prestador.siglaTurnoStaff, valorEdit, prestador.turnoStaffNome);
      const { data, error } = await supabase.rpc("rh_gestao_escala_grade_alterar_celula", {
        p_ref_mes: refMesIso,
        p_area_key: areaKey,
        p_funcionario_id: prestador.id,
        p_dia_iso: diaIso,
        p_valor: valorSan,
        p_observacao: obsTrim,
      });
      if (error) throw error;
      const payload = data as RpcAlterarCelulaResult | null;
      if (!payload?.ok) {
        console.error("[Alterar Escala] recusado pela base", {
          code: payload?.error ?? "(sem código)",
          refMesIso,
          areaKey,
          diaIso,
          valor: valorSan,
        });
        setErr(mensagemErroAlterarCelula(payload?.error ?? ""));
        return;
      }
      onCelulaAlterada(prestador.id, diaIso, valorSan, {
        valorAnterior: (payload.valor_anterior ?? valorOriginal).trim(),
        alteradoPorNome: (payload.alterado_por_nome ?? "").trim() || "Usuário",
        alteradoEm: payload.alterado_em ?? new Date().toISOString(),
        observacao: payload.observacao ?? obsTrim,
      });
      onClose();
    } catch (e) {
      console.error("[Alterar Escala] falha na chamada rh_gestao_escala_grade_alterar_celula", {
        erro: e,
        refMesIso,
        areaKey,
        diaIso,
      });
      setErr(MSG_ERRO_GENERICO);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalBase maxWidth={520} onClose={() => !salvando && onClose()}>
      <ModalHeader title="Alterar Escala" onClose={() => !salvando && onClose()} />
      <div style={{ fontFamily: FONT.body }}>
        {!prestador ? (
          <>
            <BarraPesquisaPagina
              inputRef={buscaRef}
              value={busca}
              onChange={setBusca}
              placeholder={PAGE_SEARCH.nomeNickname}
              aria-label="Pesquisar prestador por nome ou nickname"
              wrapperStyle={{ width: "100%", marginBottom: 8 }}
            />
            <div
              role="listbox"
              aria-label="Prestadores da área selecionada"
              style={{
                maxHeight: 220,
                overflowY: "auto",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
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
                prestadoresFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={false}
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
                      borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 55%, transparent)`,
                      background: "transparent",
                      color: t.text,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                      {p.nickname !== "—" ? p.nickname : p.nomeCompletoCadastro}
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
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{prestador.nome}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{prestador.nickname}</div>
              </div>
              <button
                type="button"
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
                  cursor: "pointer",
                }}
              >
                Trocar prestador
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 14,
              }}
            >
              {inputSomenteLeitura("alterar-escala-nome", "Nome", prestador.nome)}
              {inputSomenteLeitura("alterar-escala-nickname", "Nickname", prestador.nickname)}
              {inputSomenteLeitura("alterar-escala-escala", "Escala", prestador.escalaCadastro)}
              {inputSomenteLeitura(
                "alterar-escala-turno",
                "Turno",
                prestador.turnoStaffNome.trim() || "—",
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="alterar-escala-dia" style={{ ...labelCampoStyle, color: t.textMuted }}>
                Dia
              </label>
              {diasEditaveis.length === 0 ? (
                <div style={{ fontSize: 12, color: t.textMuted, padding: "8px 0" }}>
                  Não há dias disponíveis para alteração neste mês (somente a partir de hoje).
                </div>
              ) : (
                <select
                  id="alterar-escala-dia"
                  value={diaIso}
                  onChange={(e) => setDiaIso(e.target.value)}
                  aria-label="Selecionar dia para alteração"
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
                    cursor: "pointer",
                  }}
                >
                  <option value="">Selecione o dia…</option>
                  {diasEditaveis.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {labelOpcaoDia(d)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {diaIso ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ ...labelCampoStyle, color: t.textMuted, marginBottom: 8 }}>Status do dia</div>
                <div
                  style={{
                    fontSize: 12,
                    color: t.textMuted,
                    marginBottom: 8,
                  }}
                >
                  Status atual: <strong style={{ color: t.text }}>{statusAtualLabel}</strong>
                </div>
                {canEditar ? (
                  <select
                    id="alterar-escala-status"
                    value={valorEdit}
                    onChange={(e) => setValorEdit(e.target.value)}
                    aria-label={`Alterar status do dia para ${prestador.nomeCompletoCadastro}`}
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
                      cursor: "pointer",
                    }}
                  >
                    {opcoesStatus.map((o) => (
                      <option key={o.value === "" ? "__empty" : o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: t.textMuted }}>
                    Você não tem permissão de Editar para alterar o status.
                  </div>
                )}
              </div>
            ) : null}

            {diaIso && canEditar ? (
              <div style={{ marginBottom: 14 }}>
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
            ) : null}
          </>
        )}

        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button
            type="button"
            disabled={salvando}
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontWeight: 600,
              fontSize: 13,
              fontFamily: FONT.body,
              cursor: salvando ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          {prestador && canEditar ? (
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
              Salvar alteração
            </button>
          ) : null}
        </div>
      </div>
    </ModalBase>
  );
}
