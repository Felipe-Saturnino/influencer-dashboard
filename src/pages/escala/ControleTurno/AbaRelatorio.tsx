import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ClipboardList, Eye, FileText, Loader2, Wrench } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroBarTabButton,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import { ModalBase, ModalHeader, MODAL_FORM_FOOTER_STYLE, MODAL_FORM_SCROLL_BODY_STYLE } from "../../../components/OperacoesModal";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import {
  MSG_ERRO_CT,
  MSG_ERRO_CT_SALVAR,
  getCurrentUserNome,
  listRelatoriosTurnoCt,
  upsertRelatorioTurnoCt,
  type CtRelatorioManutencaoJson,
  type CtRelatorioTurnoRow,
} from "../../../lib/escalaControleTurno";
import { formatDiaBr, labelTurnoCurto } from "./helpers";
import type { ControleTurnoTurno } from "./types";

type RelStatus = "publicado" | "rascunho" | "nao_iniciado";

type StatsBloco = {
  escalados: number;
  presentes: number;
  atrasados: number;
  faltas: number;
};

type RelCampos = {
  sos: string;
  figurino: string;
  equipamentos: string;
  manutencao: string;
  comentarios: string;
};

type ModalRelAba = "andamento" | "manutencao" | "anotacoes";

type RelFormState = {
  sos: string;
  sosNao: boolean;
  figurino: string;
  figurinoNao: boolean;
  equipamentos: string;
  equipamentosNao: boolean;
  comentarios: string;
  roletas: Record<string, boolean>;
  limpezaMesas: Record<string, boolean>;
  trocaCartas: Record<string, boolean>;
  cc: boolean;
  cartas: boolean;
};

const MODAL_REL_ABAS: ModalRelAba[] = ["andamento", "manutencao", "anotacoes"];

const ESTUDIOS_MANUT = [
  { slug: "blaze", nome: "Blaze" },
  { slug: "cda", nome: "CDA" },
  { slug: "sports_club", nome: "Sports Club" },
] as const;

const ROLETAS_MANUT = [
  { id: "r-b", label: "Blaze - Roleta 6140" },
  { id: "r-c", label: "CDA - Roleta 6130" },
  { id: "r-s", label: "Sports Club - Roleta 6115" },
] as const;

const EMPTY_FORM: RelFormState = {
  sos: "",
  sosNao: false,
  figurino: "",
  figurinoNao: false,
  equipamentos: "",
  equipamentosNao: false,
  comentarios: "",
  roletas: {},
  limpezaMesas: {},
  trocaCartas: {},
  cc: false,
  cartas: false,
};

function camposToForm(campos: RelCampos, manut?: CtRelatorioManutencaoJson, flags?: {
  sosNenhum?: boolean;
  figurinoNenhum?: boolean;
  equipamentosNenhum?: boolean;
}): RelFormState {
  return {
    ...EMPTY_FORM,
    sos: campos.sos,
    sosNao: flags?.sosNenhum ?? !campos.sos.trim(),
    figurino: campos.figurino,
    figurinoNao: flags?.figurinoNenhum ?? !campos.figurino.trim(),
    equipamentos: campos.equipamentos,
    equipamentosNao: flags?.equipamentosNenhum ?? !campos.equipamentos.trim(),
    comentarios: campos.comentarios,
    roletas: { ...(manut?.roletas ?? {}) },
    limpezaMesas: { ...(manut?.limpezaMesas ?? {}) },
    trocaCartas: { ...(manut?.trocaCartas ?? {}) },
    cc: Boolean(manut?.cc),
    cartas: Boolean(manut?.cartas),
  };
}

function buildManutencaoSummary(form: RelFormState): string {
  const partes: string[] = [];
  const roletasOk = ROLETAS_MANUT.filter((r) => form.roletas[r.id]).map((r) => r.label.split(" - ")[0] ?? r.label);
  if (roletasOk.length) {
    partes.push(`Roletas ${roletasOk.join(" e ")} concluídas`);
  }
  const limpOk = ESTUDIOS_MANUT.filter((e) => form.limpezaMesas[e.slug]).map((e) => e.nome);
  if (limpOk.length) {
    partes.push(`Limpeza das Mesas ${limpOk.join(", ")}`);
  }
  const trocaOk = ESTUDIOS_MANUT.filter((e) => form.trocaCartas[e.slug]).map((e) => e.nome);
  if (trocaOk.length) {
    partes.push(`Troca de Cartas ${trocaOk.join(", ")}`);
  }
  if (form.cc) partes.push("CC Machine realizado");
  if (form.cartas) partes.push("Cartas Contadas realizado");
  return partes.join(" · ");
}

function formToCampos(form: RelFormState): RelCampos {
  return {
    sos: form.sosNao ? "" : form.sos.trim(),
    figurino: form.figurinoNao ? "" : form.figurino.trim(),
    equipamentos: form.equipamentosNao ? "" : form.equipamentos.trim(),
    manutencao: buildManutencaoSummary(form),
    comentarios: form.comentarios.trim(),
  };
}

function formToManutJson(form: RelFormState): CtRelatorioManutencaoJson {
  return {
    roletas: { ...form.roletas },
    limpezaMesas: { ...form.limpezaMesas },
    trocaCartas: { ...form.trocaCartas },
    cc: form.cc,
    cartas: form.cartas,
  };
}

function validarPublicar(form: RelFormState): string | null {
  if (!form.sosNao && !form.sos.trim()) return "Preencha SOS ou marque que não houveram SOS.";
  if (!form.figurinoNao && !form.figurino.trim()) return "Preencha Figurino ou marque que não houveram situações.";
  if (!form.equipamentosNao && !form.equipamentos.trim()) {
    return "Preencha Equipamentos ou marque que não houveram situações.";
  }
  if (!form.comentarios.trim()) return "Preencha Comentários Gerais.";
  return null;
}

type RelTurnoData = {
  status: RelStatus;
  relator: string;
  atualizadoEm: string;
  gp: StatsBloco;
  shuffler: StatsBloco;
  campos: RelCampos;
  manutJson: CtRelatorioManutencaoJson;
};

type HistItem = {
  tipo: string;
  quem: string;
  quando: string;
  detalhe?: { campo: string; antigo: string; novo: string } | null;
};

const EMPTY_CAMPOS: RelCampos = {
  sos: "",
  figurino: "",
  equipamentos: "",
  manutencao: "",
  comentarios: "",
};

const EMPTY_STATS: StatsBloco = { escalados: 0, presentes: 0, atrasados: 0, faltas: 0 };

function emptyRelatorios(): Record<ControleTurnoTurno, RelTurnoData> {
  return {
    manha: {
      status: "nao_iniciado",
      relator: "",
      atualizadoEm: "",
      gp: { ...EMPTY_STATS },
      shuffler: { ...EMPTY_STATS },
      campos: { ...EMPTY_CAMPOS },
      manutJson: {},
    },
    tarde: {
      status: "nao_iniciado",
      relator: "",
      atualizadoEm: "",
      gp: { ...EMPTY_STATS },
      shuffler: { ...EMPTY_STATS },
      campos: { ...EMPTY_CAMPOS },
      manutJson: {},
    },
    noite: {
      status: "nao_iniciado",
      relator: "",
      atualizadoEm: "",
      gp: { ...EMPTY_STATS },
      shuffler: { ...EMPTY_STATS },
      campos: { ...EMPTY_CAMPOS },
      manutJson: {},
    },
  };
}

function formatAtualizadoEm(row: CtRelatorioTurnoRow): string {
  const src = row.publicado_em || row.updated_at;
  if (!src) return formatDiaBr(row.data);
  const d = new Date(src);
  if (Number.isNaN(d.getTime())) return formatDiaBr(row.data);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDiaBr(row.data)} ${hh}:${mm}`;
}

function rowToRelData(row: CtRelatorioTurnoRow): RelTurnoData {
  return {
    status: row.status,
    relator: row.relator_nome,
    atualizadoEm: formatAtualizadoEm(row),
    gp: { ...EMPTY_STATS },
    shuffler: { ...EMPTY_STATS },
    campos: {
      sos: row.sos_nenhum ? "" : row.sos,
      figurino: row.figurino_nenhum ? "" : row.figurino,
      equipamentos: row.equipamentos_nenhum ? "" : row.equipamentos,
      manutencao: row.manutencao_resumo,
      comentarios: row.comentarios,
    },
    manutJson: row.manutencao ?? {},
  };
}

const STATUS_PILL: Record<RelStatus, { label: string; cor: string }> = {
  publicado: { label: "Publicado", cor: "#22c55e" },
  rascunho: { label: "Rascunho", cor: "#f59e0b" },
  nao_iniciado: { label: "Não iniciado", cor: "#e84025" },
};

const TURNOS: ControleTurnoTurno[] = ["manha", "tarde", "noite"];

function keywordsRel(r: RelTurnoData): string {
  const c = r.campos;
  return [
    r.relator,
    c.sos,
    c.figurino,
    c.equipamentos,
    c.manutencao,
    c.comentarios,
    STATUS_PILL[r.status].label,
    "Aguardando geração do Relatório",
  ].join(" ");
}

function agoraLabel(diaIso: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${formatDiaBr(diaIso)} ${hh}:${mm}`;
}

type Props = {
  diaIso: string;
  busca: string;
};

export function AbaRelatorio({ diaIso, busca }: Props) {
  const { theme: t, dadosUsuarioEfetivo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const pageBox = getPageContentBoxStyle(brand, t);
  const relatorNome = getCurrentUserNome(dadosUsuarioEfetivo?.name);

  const [relatorios, setRelatorios] = useState(emptyRelatorios);
  const [historicos, setHistoricos] = useState<Record<ControleTurnoTurno, HistItem[]>>({
    manha: [],
    tarde: [],
    noite: [],
  });
  const [loading, setLoading] = useState(true);
  const [erroPagina, setErroPagina] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroPagina("");
    try {
      const rows = await listRelatoriosTurnoCt(diaIso);
      const next = emptyRelatorios();
      for (const row of rows) {
        if (row.turno === "manha" || row.turno === "tarde" || row.turno === "noite") {
          next[row.turno] = rowToRelData(row);
        }
      }
      setRelatorios(next);
      setHistoricos({ manha: [], tarde: [], noite: [] });
    } catch (e) {
      console.error(e);
      setErroPagina(MSG_ERRO_CT);
      setRelatorios(emptyRelatorios());
    } finally {
      setLoading(false);
    }
  }, [diaIso]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const [modalTurno, setModalTurno] = useState<ControleTurnoTurno | null>(null);
  const [modalModo, setModalModo] = useState<"gerar" | "editar">("gerar");
  const [modalAba, setModalAba] = useState<ModalRelAba>("andamento");
  const [form, setForm] = useState<RelFormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [histTurno, setHistTurno] = useState<ControleTurnoTurno | null>(null);

  const cardsVisiveis = useMemo(
    () =>
      TURNOS.filter((turno) => {
        const r = relatorios[turno];
        return textoContemBuscaEmAlgum(busca, keywordsRel(r), labelTurnoCurto(turno));
      }),
    [relatorios, busca],
  );

  const abrirModal = useCallback(
    (turno: ControleTurnoTurno, modo: "gerar" | "editar") => {
      setModalTurno(turno);
      setModalModo(modo);
      setModalAba("andamento");
      const r = relatorios[turno];
      if (r.status === "nao_iniciado") {
        setForm({ ...EMPTY_FORM });
      } else {
        setForm(
          camposToForm(r.campos, r.manutJson, {
            sosNenhum: !r.campos.sos.trim(),
            figurinoNenhum: !r.campos.figurino.trim(),
            equipamentosNenhum: !r.campos.equipamentos.trim(),
          }),
        );
      }
      setFormErr("");
    },
    [relatorios],
  );

  const fecharModal = useCallback(() => {
    setModalTurno(null);
    setFormErr("");
  }, []);

  const salvar = useCallback(
    async (publicar: boolean) => {
      if (!modalTurno) return;
      setFormErr("");
      if (publicar) {
        const erro = validarPublicar(form);
        if (erro) {
          setFormErr(erro);
          return;
        }
      }
      if (publicar ? !perm.canCriarOk && !perm.canEditarOk : !perm.canCriarOk && !perm.canEditarOk) {
        setFormErr(MSG_ERRO_CT_SALVAR);
        return;
      }
      const campos = formToCampos(form);
      const manutJson = formToManutJson(form);
      setSalvando(true);
      const turno = modalTurno;
      const quando = agoraLabel(diaIso);
      try {
        const saved = await upsertRelatorioTurnoCt({
          data: diaIso,
          turno,
          status: publicar ? "publicado" : "rascunho",
          relatorNome,
          sos: form.sos,
          sosNenhum: form.sosNao,
          figurino: form.figurino,
          figurinoNenhum: form.figurinoNao,
          equipamentos: form.equipamentos,
          equipamentosNenhum: form.equipamentosNao,
          manutencao: manutJson,
          manutencaoResumo: campos.manutencao,
          comentarios: form.comentarios,
        });
        setRelatorios((prev) => ({
          ...prev,
          [turno]: {
            ...rowToRelData(saved),
            gp: prev[turno].gp,
            shuffler: prev[turno].shuffler,
          },
        }));
        setHistoricos((prev) => {
          const lista = [...(prev[turno] ?? [])];
          if (modalModo === "gerar" && lista.length === 0) {
            lista.push({ tipo: "Rascunho criado", quem: relatorNome, quando, detalhe: null });
          }
          if (publicar) {
            lista.push({ tipo: "Publicado", quem: relatorNome, quando, detalhe: null });
          } else {
            lista.push({ tipo: "Rascunho salvo", quem: relatorNome, quando, detalhe: null });
          }
          return { ...prev, [turno]: lista };
        });
        fecharModal();
      } catch (e) {
        console.error(e);
        setFormErr(MSG_ERRO_CT_SALVAR);
      } finally {
        setSalvando(false);
      }
    },
    [modalTurno, form, diaIso, modalModo, fecharModal, relatorNome, perm.canCriarOk, perm.canEditarOk],
  );

  return (
    <>
      {erroPagina ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {erroPagina}
        </div>
      ) : null}

      {loading ? (
        <div style={pageBox}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8 }}>
            <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ fontSize: 13, fontFamily: FONT.body, color: t.textMuted }}>Carregando…</span>
          </div>
        </div>
      ) : null}

      {!loading ? (
      <div style={pageBox}>
        <SectionTitle sub={formatDiaBr(diaIso)}>Controle dos Turnos</SectionTitle>
        <div className="app-grid-3" style={{ gap: 12 }}>
          {TURNOS.map((turno) => {
            const st = relatorios[turno].status;
            const pill = STATUS_PILL[st];
            return (
              <div
                key={turno}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: FONT.body, color: t.text }}>
                  {labelTurnoCurto(turno)}
                </span>
                <StatusPill label={pill.label} cor={pill.cor} />
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {!loading && cardsVisiveis.length === 0 ? (
        <div style={pageBox}>
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            Nenhum relatório encontrado para a busca.
          </div>
        </div>
      ) : null}

      {!loading
        ? cardsVisiveis.map((turno) => (
            <CardTurno
              key={turno}
              turno={turno}
              data={relatorios[turno]}
              t={t}
              brand={brand}
              pageBox={pageBox}
              canGerar={perm.canCriarOk}
              canEditar={perm.canEditarOk}
              onEditar={() => abrirModal(turno, "editar")}
              onGerar={() => abrirModal(turno, "gerar")}
              onHistorico={() => setHistTurno(turno)}
            />
          ))
        : null}

      {modalTurno ? (
        <ModalBase onClose={fecharModal} maxWidth={720}>
          <ModalHeader
            title={
              modalModo === "editar"
                ? `Editar Rascunho — ${labelTurnoCurto(modalTurno)}`
                : `Gerar Relatório — ${labelTurnoCurto(modalTurno)}`
            }
            onClose={fecharModal}
          />
          <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
            {formErr ? (
              <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 8 }}>
                {formErr}
              </div>
            ) : null}

            <div
              role="tablist"
              aria-label="Abas do relatório"
              onKeyDown={(e) =>
                onFiltroBarTabsKeyDown(e, [...MODAL_REL_ABAS], setModalAba, (k) => `tab-rel-${k}`)
              }
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                justifyContent: "center",
              }}
            >
              <FiltroBarTabButton
                id="tab-rel-andamento"
                active={modalAba === "andamento"}
                aria-controls="panel-rel-andamento"
                onClick={() => setModalAba("andamento")}
                icon={<ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Andamento do Turno
              </FiltroBarTabButton>
              <FiltroBarTabButton
                id="tab-rel-manutencao"
                active={modalAba === "manutencao"}
                aria-controls="panel-rel-manutencao"
                onClick={() => setModalAba("manutencao")}
                icon={<Wrench {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Manutenção
              </FiltroBarTabButton>
              <FiltroBarTabButton
                id="tab-rel-anotacoes"
                active={modalAba === "anotacoes"}
                aria-controls="panel-rel-anotacoes"
                onClick={() => setModalAba("anotacoes")}
                icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Anotações
              </FiltroBarTabButton>
            </div>

            <ModalTabPanel active={modalAba === "andamento"} id="panel-rel-andamento" labelledBy="tab-rel-andamento">
              <CampoAndamento
                id="sos"
                label="SOS"
                placeholder="Descreva os SOS do turno…"
                naoLabel="Não houveram SOS"
                value={form.sos}
                nao={form.sosNao}
                t={t}
                onChange={(v) => setForm((f) => ({ ...f, sos: v }))}
                onToggleNao={(checked) =>
                  setForm((f) => ({ ...f, sosNao: checked, sos: checked ? "" : f.sos }))
                }
              />
              <CampoAndamento
                id="figurino"
                label="Figurino"
                placeholder="Descreva situações de figurino…"
                naoLabel="Não houveram situações com Figurino"
                value={form.figurino}
                nao={form.figurinoNao}
                t={t}
                onChange={(v) => setForm((f) => ({ ...f, figurino: v }))}
                onToggleNao={(checked) =>
                  setForm((f) => ({ ...f, figurinoNao: checked, figurino: checked ? "" : f.figurino }))
                }
              />
              <CampoAndamento
                id="equipamentos"
                label="Equipamentos"
                placeholder="Descreva situações de equipamentos…"
                naoLabel="Não houveram situações com Equipamentos"
                value={form.equipamentos}
                nao={form.equipamentosNao}
                t={t}
                onChange={(v) => setForm((f) => ({ ...f, equipamentos: v }))}
                onToggleNao={(checked) =>
                  setForm((f) => ({ ...f, equipamentosNao: checked, equipamentos: checked ? "" : f.equipamentos }))
                }
              />
            </ModalTabPanel>

            <ModalTabPanel active={modalAba === "manutencao"} id="panel-rel-manutencao" labelledBy="tab-rel-manutencao">
              <GrupoChecklist label="Limpeza das Roletas" t={t}>
                {ROLETAS_MANUT.map((r) => (
                  <CheckLinha
                    key={r.id}
                    id={`rel-roleta-${r.id}`}
                    label={r.label}
                    checked={!!form.roletas[r.id]}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, roletas: { ...f.roletas, [r.id]: v } }))
                    }
                    t={t}
                  />
                ))}
              </GrupoChecklist>
              <GrupoChecklist label="Limpeza das Mesas" t={t}>
                {ESTUDIOS_MANUT.map((e) => (
                  <CheckLinha
                    key={e.slug}
                    id={`rel-limp-${e.slug}`}
                    label={e.nome}
                    checked={!!form.limpezaMesas[e.slug]}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, limpezaMesas: { ...f.limpezaMesas, [e.slug]: v } }))
                    }
                    t={t}
                  />
                ))}
              </GrupoChecklist>
              <GrupoChecklist label="Trocas de Cartas" t={t}>
                {ESTUDIOS_MANUT.map((e) => (
                  <CheckLinha
                    key={`troca-${e.slug}`}
                    id={`rel-troca-${e.slug}`}
                    label={e.nome}
                    checked={!!form.trocaCartas[e.slug]}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, trocaCartas: { ...f.trocaCartas, [e.slug]: v } }))
                    }
                    t={t}
                  />
                ))}
              </GrupoChecklist>
              <GrupoChecklist label="Limpeza da CC Machine" t={t}>
                <CheckLinha
                  id="rel-cc"
                  label="Realizado"
                  checked={form.cc}
                  onChange={(v) => setForm((f) => ({ ...f, cc: v }))}
                  t={t}
                />
              </GrupoChecklist>
              <GrupoChecklist label="Cartas Contadas" t={t}>
                <CheckLinha
                  id="rel-cartas"
                  label="Realizado"
                  checked={form.cartas}
                  onChange={(v) => setForm((f) => ({ ...f, cartas: v }))}
                  t={t}
                />
              </GrupoChecklist>
            </ModalTabPanel>

            <ModalTabPanel active={modalAba === "anotacoes"} id="panel-rel-anotacoes" labelledBy="tab-rel-anotacoes">
              <div>
                <label
                  htmlFor="rel-comentarios"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    color: t.text,
                    marginBottom: 6,
                  }}
                >
                  Comentários Gerais
                  <CampoObrigatorioMark />
                </label>
                <textarea
                  id="rel-comentarios"
                  value={form.comentarios}
                  onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
                  rows={6}
                  placeholder="Comentários gerais do turno…"
                  style={textareaStyle(t)}
                />
              </div>
            </ModalTabPanel>
          </div>
          <div style={MODAL_FORM_FOOTER_STYLE}>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvar(false)}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: salvando ? "not-allowed" : "pointer",
              }}
            >
              {salvando ? "Salvando…" : "Salvar rascunho"}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvar(true)}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: getCtaCriarGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: salvando ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {salvando ? (
                <>
                  <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                  Publicando…
                </>
              ) : (
                "Publicar"
              )}
            </button>
          </div>
        </ModalBase>
      ) : null}

      {histTurno ? (
        <ModalBase onClose={() => setHistTurno(null)} maxWidth={560}>
          <ModalHeader
            title={`Histórico — Turno da ${labelTurnoCurto(histTurno)}`}
            onClose={() => setHistTurno(null)}
          />
          <div style={{ ...MODAL_FORM_SCROLL_BODY_STYLE, paddingBottom: 8 }}>
            {(historicos[histTurno] ?? []).length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Sem registros de histórico para este turno.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {(historicos[histTurno] ?? []).map((item, i) => (
                  <li
                    key={`${item.quando}-${i}`}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      fontFamily: FONT.body,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: t.text }}>{item.tipo}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                      {item.quem} · {item.quando}
                    </div>
                    {item.detalhe ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: t.text }}>
                        <strong>{item.detalhe.campo}:</strong> {item.detalhe.antigo} → {item.detalhe.novo}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}

function CardTurno({
  turno,
  data,
  t,
  brand,
  pageBox,
  canGerar,
  canEditar,
  onEditar,
  onGerar,
  onHistorico,
}: {
  turno: ControleTurnoTurno;
  data: RelTurnoData;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  pageBox: CSSProperties;
  canGerar: boolean;
  canEditar: boolean;
  onEditar: () => void;
  onGerar: () => void;
  onHistorico: () => void;
}) {
  const st = STATUS_PILL[data.status];
  const titulo = `Turno da ${labelTurnoCurto(turno)}`;

  if (data.status === "nao_iniciado") {
    return (
      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.body, color: brand.primary, textTransform: "uppercase" }}>
            {titulo}
          </span>
          {canGerar ? <CtaCriarButton onClick={onGerar}>Gerar Relatório</CtaCriarButton> : null}
        </div>
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Aguardando geração do Relatório
        </div>
      </div>
    );
  }

  const secBtn: CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontWeight: 700,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
  };

  return (
    <div style={pageBox}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.body, color: brand.primary, textTransform: "uppercase" }}>
          {titulo}
        </span>
        {data.status === "rascunho" && canEditar ? (
          <button type="button" style={secBtn} onClick={onEditar}>
            Editar Rascunho
          </button>
        ) : (
          <StatusPill label={st.label} cor={st.cor} />
        )}
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 1 }}>
          <BtnIconeAcaoLinha label={tooltipAcao("Ver histórico")} onClick={onHistorico}>
            <Eye size={14} aria-hidden />
          </BtnIconeAcaoLinha>
        </div>

        <StatsSec titulo="Game Presenters" stats={data.gp} t={t} />
        <StatsSec titulo="Shuffler" stats={data.shuffler} t={t} />

        <div className="app-grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <CampoLeitura label="SOSs" valor={data.campos.sos} empty="Não houveram SOS no Turno" t={t} />
          <CampoLeitura label="Figurino" valor={data.campos.figurino} empty="Não houveram trocas de Figurino no Turno" t={t} />
          <CampoLeitura
            label="Equipamentos"
            valor={data.campos.equipamentos}
            empty="Não houveram problemas com Equipamentos no Turno"
            t={t}
          />
        </div>
        <CampoLeitura
          label="Manutenção"
          valor={data.campos.manutencao}
          empty="Não houveram Manutenções no Turno"
          t={t}
          full
        />
        <CampoLeitura label="Comentários Gerais" valor={data.campos.comentarios} empty="—" t={t} full />

        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
            fontSize: 12,
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          {data.relator} — {data.atualizadoEm} — {st.label}
        </div>
      </div>
    </div>
  );
}

function StatsSec({
  titulo,
  stats,
  t,
}: {
  titulo: string;
  stats: StatsBloco;
  t: ReturnType<typeof useApp>["theme"];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: t.textMuted,
          marginBottom: 8,
          fontFamily: FONT.body,
        }}
      >
        {titulo}
      </div>
      <div className="app-grid-kpi-4" style={{ gap: 10 }}>
        <StatCell label="Escalados" value={stats.escalados} t={t} />
        <StatCell label="Presentes" value={stats.presentes} t={t} cor="#22c55e" />
        <StatCell label="Atrasados" value={stats.atrasados} t={t} cor="#f59e0b" />
        <StatCell label="Faltas" value={stats.faltas} t={t} cor="#e84025" />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  t,
  cor,
}: {
  label: string;
  value: number;
  t: ReturnType<typeof useApp>["theme"];
  cor?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor ?? t.text, fontFamily: FONT.body }}>{value}</div>
      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{label}</div>
    </div>
  );
}

function CampoLeitura({
  label,
  valor,
  empty,
  t,
  full,
}: {
  label: string;
  valor: string;
  empty: string;
  t: ReturnType<typeof useApp>["theme"];
  full?: boolean;
}) {
  const vazio = !valor.trim();
  return (
    <div style={full ? { marginBottom: 12 } : undefined}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: t.textMuted,
          marginBottom: 4,
          fontFamily: FONT.body,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontFamily: FONT.body,
          color: vazio ? t.textMuted : t.text,
          fontStyle: vazio ? "italic" : "normal",
        }}
      >
        {vazio ? empty : valor}
      </div>
    </div>
  );
}

function textareaStyle(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    resize: "vertical",
  };
}

function CampoAndamento({
  id,
  label,
  placeholder,
  naoLabel,
  value,
  nao,
  t,
  onChange,
  onToggleNao,
}: {
  id: string;
  label: string;
  placeholder: string;
  naoLabel: string;
  value: string;
  nao: boolean;
  t: ReturnType<typeof useApp>["theme"];
  onChange: (v: string) => void;
  onToggleNao: (checked: boolean) => void;
}) {
  const inputId = `rel-${id}`;
  const chkId = `rel-chk-${id}`;
  return (
    <div style={{ marginBottom: 14, opacity: nao ? 0.65 : 1 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
          {label}
          <CampoObrigatorioMark />
        </label>
        <label
          htmlFor={chkId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontFamily: FONT.body,
            color: t.textMuted,
            cursor: "pointer",
          }}
        >
          <input id={chkId} type="checkbox" checked={nao} onChange={(e) => onToggleNao(e.target.checked)} />
          {naoLabel}
        </label>
      </div>
      <textarea
        id={inputId}
        value={value}
        disabled={nao}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...textareaStyle(t), opacity: nao ? 0.6 : 1 }}
      />
    </div>
  );
}

function GrupoChecklist({
  label,
  t,
  children,
}: {
  label: string;
  t: ReturnType<typeof useApp>["theme"];
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
          color: t.text,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function CheckLinha({
  id,
  label,
  checked,
  onChange,
  t,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  t: ReturnType<typeof useApp>["theme"];
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontFamily: FONT.body,
        color: t.text,
        cursor: "pointer",
      }}
    >
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function StatusPill({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
        fontFamily: FONT.body,
      }}
    >
      {label}
    </span>
  );
}
