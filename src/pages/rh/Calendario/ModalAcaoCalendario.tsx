import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  RH_CALENDARIO_ACAO_LABEL,
  RH_REUNIAO_COM_OPCOES,
  type RhCalendarioAcaoTipo,
  type RhReuniaoComValor,
  labelReuniaoCom,
  listarDatasEscaladoFuturasNoMes,
  listarDatasFolgaFuturasNoMes,
  listarIsoDiasDoMes,
  turnoExibicaoValorGrade,
  valorCelulaEhFolga,
  diaIsoChaveGradeCell,
  labelDataDdMmAaaa,
} from "../../../lib/rhCalendarioAcaoHelpers";
import { normalizarEscalaCadastro } from "../../../lib/rhEscalaTurnos";
import {
  type OperadoraTurnosPick,
  turnosPermitidosVendaFolgaComRegra8h,
} from "../../../lib/rhCalendarioGap8hFolga";

type ColegaRow = { id: string; nome: string };

type CalModalTheme = {
  cardBorder: string;
  text: string;
  inputBg: string;
  textMuted: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  t: CalModalTheme;
  brand: { accent: string };
  /** Primeiro dia do mês visível no calendário. */
  refMes: Date;
  meuFuncionario: RhFuncionario;
  meuFuncionarioId: string;
  /** valor bruto da grade por dia (YYYY-MM-DD) — só o prestador atual. */
  gradeValorPorDiaIso: Map<string, string>;
  /** Horários de turno da operadora (4x2/5x1 e fallback); null se sem slug. */
  operadoraTurnos: OperadoraTurnosPick | null;
};

const MSG_REUNIAO_SO_ESCALADO =
  "Reuniões devem ser agendadas apenas nos dias que você esta escalado para trabalho.";

const STATUS_OFERTADO = "Ofertado";
const STATUS_AGUARDANDO = "Aguardando Confirmação";

function refMesPrimeiroDiaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function ModalAcaoCalendario({
  open,
  onClose,
  t,
  brand,
  refMes,
  meuFuncionario,
  meuFuncionarioId,
  gradeValorPorDiaIso,
  operadoraTurnos,
}: Props) {
  const [etapa, setEtapa] = useState<"formulario" | "confirmar">("formulario");
  const [tipo, setTipo] = useState<RhCalendarioAcaoTipo | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const [diaIso, setDiaIso] = useState("");
  const [turnosFolgaSel, setTurnosFolgaSel] = useState<string[]>([]);
  const [outroFuncionarioId, setOutroFuncionarioId] = useState("");
  const [outroDiaIso, setOutroDiaIso] = useState("");
  const [reuniaoCom, setReuniaoCom] = useState<RhReuniaoComValor | "">("");
  const [motivoReuniao, setMotivoReuniao] = useState("");

  const [colegas, setColegas] = useState<ColegaRow[]>([]);
  const [loadingColegas, setLoadingColegas] = useState(false);
  const [gradeOutroPorIso, setGradeOutroPorIso] = useState<Map<string, string>>(new Map());
  const [loadingGradeOutro, setLoadingGradeOutro] = useState(false);

  const resetForm = useCallback(() => {
    setEtapa("formulario");
    setTipo("");
    setErro(null);
    setGravando(false);
    setDiaIso("");
    setTurnosFolgaSel([]);
    setOutroFuncionarioId("");
    setOutroDiaIso("");
    setReuniaoCom("");
    setMotivoReuniao("");
    setGradeOutroPorIso(new Map());
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    resetForm();
  }, [open, resetForm]);

  const diasFolgaFuturos = useMemo(
    () => listarDatasFolgaFuturasNoMes(refMes, gradeValorPorDiaIso),
    [refMes, gradeValorPorDiaIso],
  );
  const diasEscaladoFuturos = useMemo(
    () => listarDatasEscaladoFuturasNoMes(refMes, gradeValorPorDiaIso),
    [refMes, gradeValorPorDiaIso],
  );

  const turnosFolgaDisponiveis = useMemo(() => {
    if (tipo !== "venda_folga" || !diaIso) return [] as string[];
    return turnosPermitidosVendaFolgaComRegra8h(diaIso, gradeValorPorDiaIso, meuFuncionario, operadoraTurnos);
  }, [tipo, diaIso, gradeValorPorDiaIso, meuFuncionario, operadoraTurnos]);

  const trocaListaSoPorTime = useMemo(
    () => normalizarEscalaCadastro(meuFuncionario.escala ?? "") === "3x3",
    [meuFuncionario.escala],
  );

  useEffect(() => {
    if (!open || tipo !== "troca_cassada") {
      setColegas([]);
      return;
    }
    const tid = meuFuncionario.org_time_id;
    const slug = (meuFuncionario.staff_operadora_slug ?? "").trim();
    if (!tid) {
      setColegas([]);
      return;
    }
    if (!trocaListaSoPorTime && !slug) {
      setColegas([]);
      return;
    }
    let c = false;
    setLoadingColegas(true);
    let q = supabase
      .from("rh_funcionarios")
      .select("id, nome")
      .eq("org_time_id", tid)
      .neq("id", meuFuncionarioId)
      .in("status", ["ativo", "indisponivel"]);
    if (!trocaListaSoPorTime) {
      q = q.eq("staff_operadora_slug", slug);
    }
    void q.order("nome", { ascending: true }).then(({ data, error }) => {
      if (c) return;
      setLoadingColegas(false);
      if (error || !data) {
        setColegas([]);
        return;
      }
      setColegas(
        (data as { id: string; nome: string }[]).map((r) => ({
          id: r.id,
          nome: (r.nome ?? "").trim() || "—",
        })),
      );
    });
    return () => {
      c = true;
    };
  }, [
    open,
    tipo,
    meuFuncionario.org_time_id,
    meuFuncionario.staff_operadora_slug,
    meuFuncionarioId,
    trocaListaSoPorTime,
  ]);

  useEffect(() => {
    if (!open || tipo !== "troca_cassada" || !outroFuncionarioId) {
      setGradeOutroPorIso(new Map());
      setOutroDiaIso("");
      return;
    }
    let c = false;
    setLoadingGradeOutro(true);
    const refIso = refMesPrimeiroDiaISO(refMes);
    void supabase
      .rpc("rh_calendario_grade_colega_mes", { p_ref_mes: refIso, p_outro_funcionario_id: outroFuncionarioId })
      .then(({ data, error }) => {
        if (c) return;
        setLoadingGradeOutro(false);
        if (error || !data) {
          setGradeOutroPorIso(new Map());
          return;
        }
        const m = new Map<string, string>();
        (data as { dia_iso: string; valor: string }[]).forEach((row) => {
          const iso = diaIsoChaveGradeCell(row.dia_iso);
          if (iso) m.set(iso, (row.valor ?? "").trim());
        });
        setGradeOutroPorIso(m);
      });
    return () => {
      c = true;
    };
  }, [open, tipo, outroFuncionarioId, refMes]);

  const diasEscaladoColegaFuturos = useMemo(() => {
    const out: { iso: string; label: string; turno: string }[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (const iso of listarIsoDiasDoMes(refMes)) {
      const parts = iso.split("-").map(Number);
      const alvo = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
      if (alvo <= hoje) continue;
      const v = gradeOutroPorIso.get(iso);
      if (v == null) continue;
      const turno = turnoExibicaoValorGrade(v);
      if (!turno) continue;
      out.push({ iso, turno, label: `${labelDataDdMmAaaa(iso)} - ${turno}` });
    }
    return out;
  }, [refMes, gradeOutroPorIso]);

  const turnoNoDiaEscolhido = useMemo(() => {
    if (!diaIso) return "";
    const raw = gradeValorPorDiaIso.get(diaIso);
    return raw ? turnoExibicaoValorGrade(raw) ?? "" : "";
  }, [diaIso, gradeValorPorDiaIso]);

  const turnoOutroNoDia = useMemo(() => {
    if (!outroDiaIso) return "";
    const raw = gradeOutroPorIso.get(outroDiaIso);
    return raw ? turnoExibicaoValorGrade(raw) ?? "" : "";
  }, [outroDiaIso, gradeOutroPorIso]);

  const outroNome = useMemo(
    () => colegas.find((c) => c.id === outroFuncionarioId)?.nome ?? "",
    [colegas, outroFuncionarioId],
  );

  function toggleTurnoFolga(t: string) {
    setTurnosFolgaSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function validarAntesConfirmar(): string | null {
    if (!tipo) return "Selecione o tipo de ação.";
    if (!diaIso && tipo !== "troca_cassada") {
      return "Selecione a data.";
    }
    if (tipo === "venda_folga") {
      if (!diaIso) return "Selecione a data da folga.";
      const v = gradeValorPorDiaIso.get(diaIso);
      if (!v || !valorCelulaEhFolga(v)) return "Escolha um dia em que está de folga.";
      if (turnosFolgaSel.length === 0) return "Selecione pelo menos um turno.";
    }
    if (tipo === "venda_turno" || tipo === "oferta_troca") {
      if (!diaIso) return "Selecione a data.";
      const v = gradeValorPorDiaIso.get(diaIso);
      if (!v || !turnoExibicaoValorGrade(v)) return "Escolha um dia em que está escalado.";
    }
    if (tipo === "troca_cassada") {
      if (!diaIso) return "Selecione a data do seu turno.";
      const rawMe = gradeValorPorDiaIso.get(diaIso);
      if (!rawMe || !turnoExibicaoValorGrade(rawMe)) return "Selecione um dia em que está escalado.";
      if (!outroFuncionarioId) return "Selecione quem irá assumir.";
      if (!outroDiaIso) return "Selecione o dia escalado do outro prestador.";
      const rawO = gradeOutroPorIso.get(outroDiaIso);
      const to = rawO ? turnoExibicaoValorGrade(rawO) : null;
      if (!to) return "O outro prestador não tem escala de trabalho nesse dia.";
    }
    if (tipo === "agendamento_reuniao") {
      if (!reuniaoCom) return "Selecione com quem será a reunião.";
      if (!(motivoReuniao ?? "").trim()) return "Informe o motivo da reunião.";
      if (!diaIso) return "Selecione a data da reunião.";
      const v = gradeValorPorDiaIso.get(diaIso);
      if (!v || !turnoExibicaoValorGrade(v)) return MSG_REUNIAO_SO_ESCALADO;
    }
    return null;
  }

  function textoConsolidado(): string {
    if (!tipo) return "";
    if (tipo === "venda_folga") {
      return `Você está disponibilizando a trabalhar no dia ${diaIso} nos turnos: ${turnosFolgaSel.join(", ")}.`;
    }
    if (tipo === "venda_turno") {
      return `Você está oferecendo a venda do seu turno do dia ${diaIso} (${turnoNoDiaEscolhido}) para compra por outro prestador.`;
    }
    if (tipo === "oferta_troca") {
      return `Você está oferecendo uma troca do seu turno do dia ${diaIso} (${turnoNoDiaEscolhido}) com outro prestador.`;
    }
    if (tipo === "troca_cassada") {
      return `Você está solicitando a troca do seu turno do dia ${diaIso} (${turnoNoDiaEscolhido}) com ${outroNome} no dia ${outroDiaIso} e turno ${turnoOutroNoDia}.`;
    }
    if (tipo === "agendamento_reuniao") {
      return `Você está solicitando uma reunião com ${labelReuniaoCom(reuniaoCom)}, no dia ${diaIso} durante seu turno (${turnoNoDiaEscolhido}); basta aguardar o aceite.`;
    }
    return "";
  }

  function montarPayload(): Record<string, unknown> {
    if (tipo === "venda_folga") {
      return { dia_iso: diaIso, turnos: turnosFolgaSel };
    }
    if (tipo === "venda_turno" || tipo === "oferta_troca") {
      return { dia_iso: diaIso, turno: turnoNoDiaEscolhido };
    }
    if (tipo === "troca_cassada") {
      return {
        dia_iso: diaIso,
        turno: turnoNoDiaEscolhido,
        outro_funcionario_id: outroFuncionarioId,
        outro_nome: outroNome,
        outro_dia_iso: outroDiaIso,
        outro_turno: turnoOutroNoDia,
      };
    }
    if (tipo === "agendamento_reuniao") {
      return {
        dia_iso: diaIso,
        turno: turnoNoDiaEscolhido,
        reuniao_com: reuniaoCom,
        reuniao_com_label: labelReuniaoCom(reuniaoCom),
        motivo: motivoReuniao.trim(),
      };
    }
    return {};
  }

  function statusParaTipo(): string {
    if (tipo === "troca_cassada" || tipo === "agendamento_reuniao") return STATUS_AGUARDANDO;
    return STATUS_OFERTADO;
  }

  async function confirmarGravacao() {
    if (!tipo) return;
    const v = validarAntesConfirmar();
    if (v) {
      setErro(v);
      setEtapa("formulario");
      return;
    }
    setGravando(true);
    setErro(null);
    const refIso = refMesPrimeiroDiaISO(refMes);
    const payload = montarPayload();
    const { error } = await supabase.from("rh_calendario_acoes").insert({
      solicitante_funcionario_id: meuFuncionarioId,
      tipo_acao: tipo,
      status: statusParaTipo(),
      ref_mes: refIso,
      payload,
    });
    setGravando(false);
    if (error) {
      setErro(error.message || "Não foi possível guardar o pedido.");
      return;
    }
    onClose();
  }

  function aoClicarSalvar() {
    const v = validarAntesConfirmar();
    if (v) {
      setErro(v);
      return;
    }
    setErro(null);
    setEtapa("confirmar");
  }

  const labelSelectTipo = "Tipo de ação";

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
  };

  return (
    <ModalBase maxWidth={520} onClose={onClose} zIndex={1150}>
      <ModalHeader title="Ação" onClose={onClose} />
      <div style={{ padding: "4px 4px 0", fontFamily: FONT.body, color: t.text }}>
        {etapa === "confirmar" ? (
          <>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: t.text }}>{textoConsolidado()}</p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted }}>
              Confirme para registar o pedido. Após confirmar, a informação será guardada na base de dados.
            </p>
            {erro ? (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e84025" }} role="alert">
                {erro}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setEtapa("formulario");
                  setErro(null);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: "transparent",
                  color: t.text,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={gravando}
                onClick={() => void confirmarGravacao()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${brand.accent}`,
                  background: brand.accent,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: gravando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  opacity: gravando ? 0.7 : 1,
                }}
              >
                {gravando ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
                    A guardar…
                  </span>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                {labelSelectTipo}
                <CampoObrigatorioMark />
              </label>
              <select
                aria-label={labelSelectTipo}
                value={tipo}
                onChange={(e) => {
                  setTipo((e.target.value || "") as RhCalendarioAcaoTipo | "");
                  setDiaIso("");
                  setTurnosFolgaSel([]);
                  setOutroFuncionarioId("");
                  setOutroDiaIso("");
                  setReuniaoCom("");
                  setMotivoReuniao("");
                  setErro(null);
                }}
                style={inputStyle}
              >
                <option value="">Selecione…</option>
                {(Object.keys(RH_CALENDARIO_ACAO_LABEL) as RhCalendarioAcaoTipo[]).map((k) => (
                  <option key={k} value={k}>
                    {RH_CALENDARIO_ACAO_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            {tipo === "venda_folga" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Data (folga no mês)
                    <CampoObrigatorioMark />
                  </label>
                  <select
                    aria-label="Data da folga a vender"
                    value={diaIso}
                    onChange={(e) => {
                      setDiaIso(e.target.value);
                      setTurnosFolgaSel([]);
                    }}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {diasFolgaFuturos.map((o) => (
                      <option key={o.iso} value={o.iso}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Turnos em que pode trabalhar
                    <CampoObrigatorioMark />
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {turnosFolgaDisponiveis.map((tn) => (
                      <label
                        key={tn}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={turnosFolgaSel.includes(tn)}
                          onChange={() => toggleTurnoFolga(tn)}
                          aria-label={`Turno ${tn}`}
                        />
                        {tn}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(tipo === "venda_turno" || tipo === "oferta_troca") && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Data (dia escalado)
                  <CampoObrigatorioMark />
                </label>
                <select
                  aria-label="Data do turno"
                  value={diaIso}
                  onChange={(e) => setDiaIso(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione…</option>
                  {diasEscaladoFuturos.map((o) => (
                    <option key={o.iso} value={o.iso}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipo === "troca_cassada" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Data do seu turno
                    <CampoObrigatorioMark />
                  </label>
                  <select
                    aria-label="Data do seu turno na troca"
                    value={diaIso}
                    onChange={(e) => setDiaIso(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {diasEscaladoFuturos.map((o) => (
                      <option key={o.iso} value={o.iso}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Quem irá assumir
                    <CampoObrigatorioMark />
                  </label>
                  {loadingColegas ? (
                    <span style={{ color: t.textMuted, fontSize: 13 }}>A carregar…</span>
                  ) : colegas.length === 0 ? (
                    <span style={{ color: t.textMuted, fontSize: 13 }}>
                      {trocaListaSoPorTime
                        ? "Não há outros prestadores no mesmo time."
                        : "Não há outros prestadores no mesmo time e operadora."}
                    </span>
                  ) : (
                    <select
                      aria-label="Prestador que assume o dia"
                      value={outroFuncionarioId}
                      onChange={(e) => setOutroFuncionarioId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Selecione…</option>
                      {colegas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Data do turno de troca
                    <CampoObrigatorioMark />
                  </label>
                  {!outroFuncionarioId ? (
                    <span style={{ color: t.textMuted, fontSize: 13 }}>Escolha primeiro o prestador.</span>
                  ) : loadingGradeOutro ? (
                    <span style={{ color: t.textMuted, fontSize: 13 }}>A carregar escala…</span>
                  ) : (
                    <select
                      aria-label="Data do turno de troca do outro prestador"
                      value={outroDiaIso}
                      onChange={(e) => setOutroDiaIso(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Selecione…</option>
                      {diasEscaladoColegaFuturos.map((o) => (
                        <option key={o.iso} value={o.iso}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}

            {tipo === "agendamento_reuniao" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Com quem será a reunião
                    <CampoObrigatorioMark />
                  </label>
                  <select
                    aria-label="Área da reunião"
                    value={reuniaoCom}
                    onChange={(e) => setReuniaoCom((e.target.value || "") as RhReuniaoComValor | "")}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {RH_REUNIAO_COM_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Motivo da reunião
                    <CampoObrigatorioMark />
                  </label>
                  <textarea
                    aria-label="Motivo da reunião"
                    value={motivoReuniao}
                    onChange={(e) => setMotivoReuniao(e.target.value)}
                    placeholder="Descreva o assunto sobre o qual pretende falar na reunião."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Data da reunião
                    <CampoObrigatorioMark />
                  </label>
                  <select
                    aria-label="Data da reunião"
                    value={diaIso}
                    onChange={(e) => setDiaIso(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Selecione…</option>
                    {diasEscaladoFuturos.map((o) => (
                      <option key={o.iso} value={o.iso}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {erro ? (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e84025" }} role="alert">
                {erro}
              </p>
            ) : null}

            {tipo ? (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={aoClicarSalvar}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: `1px solid ${brand.accent}`,
                    background: brand.accent,
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  Salvar
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ModalBase>
  );
}
