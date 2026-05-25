import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ClipboardList, GitBranch, Loader2, StickyNote } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  camposObrigatoriosParaEtapa,
  etapasAvancoDisponiveis,
  fmtDataHoraBR,
  mostrarAbaEtapasNoModal,
  patchCamposParaEtapa,
  type CamposEtapaCandidatura,
} from "../../../lib/rhVagaCandidaturaKanban";
import { urlAssinadaCurriculoCandidatura, uploadAnexoCandidaturaVaga } from "../../../lib/rhVagaCandidaturaFiles";
import { inserirHistoricoCandidatura, resumoMudancaEtapa } from "../../../lib/rhVagaCandidaturaHistorico";
import { RH_CANDIDATURAS_SELECT } from "../../../lib/rhVagaCandidaturaQueries";
import { fmtDataBR, labelEtapaCandidatura, labelVagaComCodigo } from "../../../lib/rhVagasFormat";
import type { RhVagaCandidaturaEtapa, RhVagaCandidaturaRow } from "../../../types/rhVagaCandidatura";
import type { RhVagaTipo } from "../../../types/rhVaga";
import { ModalBase, ModalHeader } from "../../OperacoesModal";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; cardBg?: string; isDark?: boolean };
type TabVer = "candidatura" | "anotacoes" | "etapas";

const CANDIDATURA_TAB_ICONS = {
  candidatura: <ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  anotacoes: <StickyNote {...FILTRO_BAR_TAB_ICON_PROPS} />,
  etapas: <GitBranch {...FILTRO_BAR_TAB_ICON_PROPS} />,
} as const;

type AnotacaoRow = { id: string; conteudo: string; created_at: string; created_by: string | null; autor?: { name: string | null } | null };
type AnexoRow = {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  created_at: string;
  created_by: string | null;
  autor?: { name: string | null } | null;
};

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function tipoInterna(tipo: RhVagaTipo | undefined): boolean {
  return tipo === "interna" || tipo === "mista";
}

export function ModalCandidaturaVer({
  open,
  candidaturaId,
  onClose,
  onAtualizado,
  podeEditar,
  t,
}: {
  open: boolean;
  candidaturaId: string | null;
  onClose: () => void;
  onAtualizado: () => void;
  podeEditar: boolean;
  t: Theme;
}) {
  const brand = useDashboardBrand();
  const { user } = useApp();
  const inputAnexoRef = useRef<HTMLInputElement>(null);

  const [c, setC] = useState<RhVagaCandidaturaRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tab, setTab] = useState<TabVer>("candidatura");

  const [textoAnotacao, setTextoAnotacao] = useState("");
  const [anotacoes, setAnotacoes] = useState<AnotacaoRow[]>([]);
  const [anexos, setAnexos] = useState<AnexoRow[]>([]);
  const [salvandoAnotacao, setSalvandoAnotacao] = useState(false);

  const [etapaDestino, setEtapaDestino] = useState<RhVagaCandidaturaEtapa | "">("");
  const [camposEtapa, setCamposEtapa] = useState<CamposEtapaCandidatura>({});
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);
  const [erroEtapa, setErroEtapa] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!candidaturaId) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.from("rh_vaga_candidaturas").select(RH_CANDIDATURAS_SELECT).eq("id", candidaturaId).maybeSingle();
    setLoading(false);
    if (error || !data) {
      setErro(error?.message ?? "Candidatura não encontrada.");
      setC(null);
      return;
    }
    const row = data as unknown as RhVagaCandidaturaRow;
    setC(row);
    setEtapaDestino("");
    setCamposEtapa({});
  }, [candidaturaId]);

  const carregarAnotacoes = useCallback(async () => {
    if (!candidaturaId) return;
    const [aRes, xRes] = await Promise.all([
      supabase
        .from("rh_vaga_candidatura_anotacoes")
        .select("id, conteudo, created_at, created_by, autor:profiles ( name )")
        .eq("candidatura_id", candidaturaId)
        .order("created_at", { ascending: false }),
      supabase
        .from("rh_vaga_candidatura_anexos")
        .select("id, nome_arquivo, storage_path, created_at, created_by, autor:profiles ( name )")
        .eq("candidatura_id", candidaturaId)
        .order("created_at", { ascending: false }),
    ]);
    setAnotacoes((aRes.data ?? []) as unknown as AnotacaoRow[]);
    setAnexos((xRes.data ?? []) as unknown as AnexoRow[]);
  }, [candidaturaId]);

  useEffect(() => {
    if (!open || !candidaturaId) {
      setC(null);
      setTab("candidatura");
      setTextoAnotacao("");
      return;
    }
    void carregar();
    void carregarAnotacoes();
  }, [open, candidaturaId, carregar, carregarAnotacoes]);

  useEffect(() => {
    if (!c) return;
    if (!mostrarAbaEtapasNoModal(c.etapa) && tab === "etapas") setTab("candidatura");
  }, [c, tab]);

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
    outline: "none",
  };

  const readOnlyStyle: CSSProperties = { ...inputStyle, opacity: 0.92, cursor: "not-allowed" };

  async function baixarCurriculo() {
    if (!c?.curriculo_storage_path) return;
    const url = await urlAssinadaCurriculoCandidatura(c.curriculo_storage_path);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = c.curriculo_nome_arquivo || "curriculo";
    a.target = "_blank";
    a.click();
  }

  async function salvarAnotacao() {
    if (!c || !user?.id || !podeEditar) return;
    const texto = textoAnotacao.trim();
    if (!texto) return;
    setSalvandoAnotacao(true);
    const { data: ins, error } = await supabase
      .from("rh_vaga_candidatura_anotacoes")
      .insert({ candidatura_id: c.id, conteudo: texto, created_by: user.id })
      .select("id")
      .single();
    if (!error && ins) {
      await inserirHistoricoCandidatura(supabase, {
        candidaturaId: c.id,
        tipo: "anotacao",
        resumo: "Anotação registrada.",
        detalhes: { conteudo: texto },
        createdBy: user.id,
      });
    }
    setSalvandoAnotacao(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setTextoAnotacao("");
    void carregarAnotacoes();
    onAtualizado();
  }

  async function enviarAnexos(files: FileList | null) {
    if (!c || !user?.id || !podeEditar || !files?.length) return;
    setSalvandoAnotacao(true);
    for (const file of [...files]) {
      const up = await uploadAnexoCandidaturaVaga(c.funcionario_id, c.vaga_id, file);
      if (!up.ok) {
        setErro(up.message);
        continue;
      }
      const { error } = await supabase.from("rh_vaga_candidatura_anexos").insert({
        candidatura_id: c.id,
        storage_path: up.path,
        nome_arquivo: up.fileName,
        created_by: user.id,
      });
      if (!error) {
        await inserirHistoricoCandidatura(supabase, {
          candidaturaId: c.id,
          tipo: "anexo",
          resumo: `Arquivo anexado: ${up.fileName}`,
          detalhes: { nome_arquivo: up.fileName, storage_path: up.path },
          createdBy: user.id,
        });
      }
    }
    setSalvandoAnotacao(false);
    if (inputAnexoRef.current) inputAnexoRef.current.value = "";
    void carregarAnotacoes();
    onAtualizado();
  }

  async function salvarEtapa() {
    if (!c || !user?.id || !podeEditar || !etapaDestino) return;
    setErroEtapa(null);
    const obrig = camposObrigatoriosParaEtapa(etapaDestino);
    const errs: string[] = [];
    for (const k of obrig) {
      const v = camposEtapa[k];
      if (v == null || (typeof v === "string" && !v.trim())) errs.push(k);
    }
    if (errs.length) {
      setErroEtapa("Preencha os campos obrigatórios da etapa selecionada.");
      return;
    }
    setSalvandoEtapa(true);
    const patch = patchCamposParaEtapa(etapaDestino, camposEtapa);
    const { error } = await supabase.from("rh_vaga_candidaturas").update(patch).eq("id", c.id);
    if (error) {
      setSalvandoEtapa(false);
      setErroEtapa(error.message);
      return;
    }
    await inserirHistoricoCandidatura(supabase, {
      candidaturaId: c.id,
      tipo: "etapa",
      resumo: resumoMudancaEtapa(c.etapa, etapaDestino),
      detalhes: { de: c.etapa, para: etapaDestino, ...camposEtapa },
      createdBy: user.id,
    });
    if (Object.keys(camposEtapa).some((k) => camposEtapa[k as keyof CamposEtapaCandidatura])) {
      await inserirHistoricoCandidatura(supabase, {
        candidaturaId: c.id,
        tipo: "campos_etapa",
        resumo: `Campos atualizados para etapa «${labelEtapaCandidatura(etapaDestino)}».`,
        detalhes: { ...camposEtapa },
        createdBy: user.id,
      });
    }
    setSalvandoEtapa(false);
    setEtapaDestino("");
    setCamposEtapa({});
    void carregar();
    onAtualizado();
    onClose();
  }

  const etapasFwd = c ? etapasAvancoDisponiveis(c.etapa) : [];

  const trilha = [
    ...anotacoes.map((a) => ({ tipo: "anotacao" as const, at: a.created_at, autor: a.autor?.name, texto: a.conteudo })),
    ...anexos.map((x) => ({ tipo: "anexo" as const, at: x.created_at, autor: x.autor?.name, texto: x.nome_arquivo })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (!open) return null;

  const subtitulo = c?.vaga ? labelVagaComCodigo(c.vaga) : "—";
  const mostrarEtapas = c ? mostrarAbaEtapasNoModal(c.etapa) : false;
  const tabsVisiveis: TabVer[] = mostrarEtapas
    ? ["candidatura", "anotacoes", "etapas"]
    : ["candidatura", "anotacoes"];

  return (
    <ModalBase maxWidth={640} onClose={onClose} zIndex={1101}>
      <ModalHeader title={c ? c.nome_completo.toUpperCase() : "Candidatura"} onClose={onClose} />
      <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{subtitulo}</p>

      <div
        role="tablist"
        aria-label="Seções da candidatura"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabsVisiveis, setTab, (k) => `tab-cand-${k}`)}
      >
        {tabsVisiveis.map((id) => (
          <FiltroBarTabButton
            key={id}
            id={`tab-cand-${id}`}
            active={tab === id}
            onClick={() => setTab(id)}
            icon={CANDIDATURA_TAB_ICONS[id]}
          >
            {id === "candidatura" ? "Candidatura" : id === "anotacoes" ? "Anotações" : "Etapas"}
          </FiltroBarTabButton>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : erro && !c ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : !c ? null : (
        <div style={{ maxHeight: "min(68dvh, 560px)", overflowY: "auto", paddingRight: 4 }}>
          {tab === "candidatura" ? (
            tipoInterna(c.vaga?.tipo_vaga as RhVagaTipo) ? (
              <>
                <CampoLeitura label="Função Atual" valor={c.funcao_atual || "—"} style={readOnlyStyle} t={t} />
                <CampoLeitura
                  label="Data de Contratação"
                  valor={fmtDataBR(c.funcionario?.data_inicio)}
                  style={readOnlyStyle}
                  t={t}
                />
                {c.funcionario?.data_funcao?.trim() ? (
                  <CampoLeitura label="Data da Função" valor={fmtDataBR(c.funcionario.data_funcao)} style={readOnlyStyle} t={t} />
                ) : null}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>Currículo</div>
                  <BtnSec t={t} label="Download" onClick={() => void baixarCurriculo()} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>Carta de Apresentação</div>
                  <div
                    style={{
                      ...readOnlyStyle,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                      minHeight: 80,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {(c.carta_apresentacao ?? "").trim() || "—"}
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Vaga externa — detalhes em breve.</p>
            )
          ) : null}

          {tab === "anotacoes" ? (
            <>
              {podeEditar ? (
                <>
                  <label htmlFor="cand-anot-texto" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
                    Nova anotação
                  </label>
                  <textarea
                    id="cand-anot-texto"
                    value={textoAnotacao}
                    onChange={(e) => setTextoAnotacao(e.target.value)}
                    rows={4}
                    disabled={salvandoAnotacao}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 88, marginBottom: 10 }}
                  />
                  <button
                    type="button"
                    disabled={salvandoAnotacao || !textoAnotacao.trim()}
                    onClick={() => void salvarAnotacao()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: ctaGradient(brand),
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      cursor: salvandoAnotacao ? "not-allowed" : "pointer",
                      marginBottom: 14,
                      opacity: salvandoAnotacao ? 0.85 : 1,
                    }}
                  >
                    Salvar
                  </button>
                  <input
                    ref={inputAnexoRef}
                    type="file"
                    multiple
                    disabled={salvandoAnotacao}
                    onChange={(e) => void enviarAnexos(e.target.files)}
                    style={{ ...inputStyle, padding: 8, marginBottom: 16 }}
                    aria-label="Enviar arquivos"
                  />
                </>
              ) : null}
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>Trilha</div>
              {trilha.length === 0 ? (
                <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Sem anotações ou arquivos.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {trilha.map((item, i) => (
                    <li key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${t.cardBorder}`, fontFamily: FONT.body }}>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{fmtDataHoraBR(item.at)}</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>{(item.autor ?? "").trim() || "Usuário"}</div>
                      <div style={{ fontSize: 13, color: t.text, marginTop: 4 }}>
                        {item.tipo === "anexo" ? `Arquivo: ${item.texto}` : item.texto}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {tab === "etapas" && mostrarEtapas && podeEditar ? (
            <>
              <label htmlFor="cand-etapa-dest" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
                Nova etapa
              </label>
              <select
                id="cand-etapa-dest"
                value={etapaDestino}
                onChange={(e) => {
                  setEtapaDestino(e.target.value as RhVagaCandidaturaEtapa);
                  setCamposEtapa({});
                  setErroEtapa(null);
                }}
                style={{ ...inputStyle, marginBottom: 14 }}
              >
                <option value="">Selecione…</option>
                {etapasFwd.map((e) => (
                  <option key={e} value={e}>
                    {labelEtapaCandidatura(e)}
                  </option>
                ))}
              </select>

              {etapaDestino === "agendado" ? (
                <CampoData
                  id="cand-dt-ag"
                  label="Data de Agendamento"
                  value={camposEtapa.data_agendamento ?? ""}
                  onChange={(v) => setCamposEtapa((p) => ({ ...p, data_agendamento: v }))}
                  style={inputStyle}
                  t={t}
                />
              ) : null}
              {etapaDestino === "stand_by" ? (
                <CampoData
                  id="cand-dt-apr"
                  label="Data de Aprovação"
                  value={camposEtapa.data_aprovacao ?? ""}
                  onChange={(v) => setCamposEtapa((p) => ({ ...p, data_aprovacao: v }))}
                  style={inputStyle}
                  t={t}
                />
              ) : null}
              {etapaDestino === "contratado" ? (
                <CampoData
                  id="cand-dt-cont"
                  label="Data de Contratação"
                  value={camposEtapa.data_contratacao ?? ""}
                  onChange={(v) => setCamposEtapa((p) => ({ ...p, data_contratacao: v }))}
                  style={inputStyle}
                  t={t}
                />
              ) : null}
              {etapaDestino === "dispensado" ? (
                <>
                  <CampoData
                    id="cand-dt-disp"
                    label="Data de Dispensa"
                    value={camposEtapa.data_dispensa ?? ""}
                    onChange={(v) => setCamposEtapa((p) => ({ ...p, data_dispensa: v }))}
                    style={inputStyle}
                    t={t}
                  />
                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="cand-motivo" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
                      Motivo da Dispensa
                    </label>
                    <input
                      id="cand-motivo"
                      type="text"
                      value={camposEtapa.motivo_dispensa ?? ""}
                      onChange={(e) => setCamposEtapa((p) => ({ ...p, motivo_dispensa: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </>
              ) : null}

              {erroEtapa ? (
                <div role="alert" style={{ color: "#e84025", fontSize: 12, marginBottom: 10, fontFamily: FONT.body }}>
                  {erroEtapa}
                </div>
              ) : null}

              <button
                type="button"
                disabled={salvandoEtapa || !etapaDestino}
                onClick={() => void salvarEtapa()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: ctaGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: salvandoEtapa ? "not-allowed" : "pointer",
                }}
              >
                {salvandoEtapa ? "Salvando…" : "Salvar etapa"}
              </button>
            </>
          ) : tab === "etapas" && !podeEditar ? (
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Sem permissão para alterar etapas.</p>
          ) : null}
        </div>
      )}
    </ModalBase>
  );
}

function CampoLeitura({
  label,
  valor,
  style,
  t,
}: {
  label: string;
  valor: string;
  style: CSSProperties;
  t: Theme;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>{label}</div>
      <input type="text" readOnly value={valor} style={style} aria-readonly="true" />
    </div>
  );
}

function CampoData({
  id,
  label,
  value,
  onChange,
  style,
  t,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  style: CSSProperties;
  t: Theme;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
        {label}
      </label>
      <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} style={style} />
    </div>
  );
}

function BtnSec({ label, onClick, t }: { label: string; onClick: () => void; t: Theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        color: t.text,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: FONT.body,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
