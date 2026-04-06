import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GiShield } from "react-icons/gi";

type BancaStatus = "solicitado" | "aprovado" | "liberado";
type BancaStatusConta = "liberada" | "bloqueada";

interface BancaRowDb {
  id: string;
  influencer_id: string;
  operadora_slug: string;
  id_operadora_exibicao: string | null;
  valor: number;
  status: BancaStatus;
  solicitado_em: string;
  aprovado_em: string | null;
  aprovado_por: string | null;
  liberado_em: string | null;
  liberado_por: string | null;
}

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_BANCA: Record<BancaStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "#f59e0b" },
  aprovado:   { label: "Aprovado",   color: "#6b7fff" },
  liberado:   { label: "Liberado",   color: "#10b981" },
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarMeses(): { value: string; label: string }[] {
  const lista: { value: string; label: string }[] = [{ value: "", label: "Total" }];
  const agora = new Date();
  const inicio = new Date(2025, 11, 1);
  const cur = new Date(agora.getFullYear(), agora.getMonth(), 1);
  while (cur >= inicio) {
    lista.push({
      value: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES_NOMES[cur.getMonth()]} ${cur.getFullYear()}`,
    });
    cur.setMonth(cur.getMonth() - 1);
  }
  return lista;
}

function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  if (!mes) return null;
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

function diaISO(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function rowNoMesSolicitacao(r: BancaRowDb, periodo: { inicio: string; fim: string } | null, historico: boolean) {
  if (historico || !periodo) return true;
  const d = diaISO(r.solicitado_em);
  return d >= periodo.inicio && d <= periodo.fim;
}

function rowInteressaConsolidado(r: BancaRowDb, periodo: { inicio: string; fim: string } | null, historico: boolean) {
  if (historico || !periodo) return true;
  const s = diaISO(r.solicitado_em);
  const l = diaISO(r.liberado_em);
  if (s >= periodo.inicio && s <= periodo.fim) return true;
  if (l && l >= periodo.inicio && l <= periodo.fim) return true;
  return false;
}

interface BlocoFiltros {
  podeVerInfluencer: (id: string) => boolean;
  podeVerOperadora: (slug: string) => boolean;
  filterInfluencers: string[];
  filterOperadora: string;
  filtroOp: string[] | null;
  operadorasList: { slug: string; nome: string }[];
  mesFiltro: string;
  historico: boolean;
  statusFiltro: "" | BancaStatus;
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const letra = (name ?? "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.4,
    }}>
      {letra}
    </div>
  );
}

function BlocoLabel({ label }: { label: string }) {
  const brand = useDashboardBrand();
  return (
    <span style={{
      fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
      textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body,
    }}>
      {label}
    </span>
  );
}

function ModalBase({ children, maxWidth = 440, onClose: _onClose, zIndex = 1000 }: {
  children: React.ReactNode; maxWidth?: number; onClose: () => void;
  zIndex?: number;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000090",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex, padding: "20px",
    }}
    >
      <div style={{
        background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: "20px", padding: "28px",
        width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto",
      }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>{title}</h2>
      <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }} aria-label="Fechar">✕</button>
    </div>
  );
}

/** Filtro operadora: oculto para influencer, agência e operador (este último com escopo forçado). */
function useBancaFiltroOperadoraUI(userRole: string | undefined) {
  return userRole && !["influencer", "agencia", "operador"].includes(userRole);
}

function ModalBloqueioSolicitacaoCampanha({
  tipo,
  onClose,
}: {
  tipo: "perfil" | "playbook";
  onClose: () => void;
}) {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const texto = tipo === "perfil"
    ? "Para solicitar valores para a Campanha promocional você precisa concluir o cadastro na página de Influencers. Qualquer solicitação permanece bloqueada até a conclusão do cadastro."
    : "Para solicitar valores para a Campanha promocional você precisa ler e dar ciência nos termos do Playbook. Qualquer solicitação permanece bloqueada até que essa ciência seja registrada.";

  function irResolver() {
    onClose();
    setActivePage(tipo === "perfil" ? "influencers" : "playbook_influencers");
  }

  return (
    <ModalBase onClose={onClose} maxWidth={460} zIndex={1100}>
      <ModalHeader title="Solicitação indisponível" onClose={onClose} />
      <p style={{ margin: "0 0 22px", fontSize: 14, color: t.text, fontFamily: FONT.body, lineHeight: 1.55 }}>
        {texto}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, minWidth: 120, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
            background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
          }}
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={irResolver}
          style={{
            flex: 2, minWidth: 180, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {tipo === "perfil" ? "Ir para Influencers" : "Ir para Playbook"}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalSolicitar({
  onClose,
  onSalvo,
  userRole,
  userId,
  influencerListAgencia,
  nomeInfluencerLocked,
  onBloqueioGate,
}: {
  onClose: () => void;
  onSalvo: () => void;
  userRole: string;
  userId: string;
  influencerListAgencia: { id: string; name: string }[];
  nomeInfluencerLocked?: string;
  onBloqueioGate: (tipo: "perfil" | "playbook") => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [infSel, setInfSel] = useState(userRole === "influencer" ? userId : "");
  const [opSlug, setOpSlug] = useState("");
  const [idOp, setIdOp] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [opcoesIo, setOpcoesIo] = useState<{ slug: string; id_operadora: string | null; nome: string }[]>([]);
  /** Agência: null = sem influencer ou verificando; true = pode solicitar; false = bloqueado (gate já disparou). */
  const [agenciaElegivel, setAgenciaElegivel] = useState<boolean | null>(userRole === "agencia" ? null : true);

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: 13, fontFamily: FONT.body, boxSizing: "border-box",
  };

  useEffect(() => {
    if (userRole !== "influencer" || !userId) return;
    void carregarIo(userId);
  }, [userRole, userId]);

  useEffect(() => {
    if (userRole === "agencia" && infSel) void carregarIo(infSel);
    else if (userRole === "agencia" && !infSel) {
      setOpcoesIo([]); setOpSlug(""); setIdOp("");
    }
  }, [userRole, infSel]);

  useEffect(() => {
    if (userRole !== "agencia") return;
    if (!infSel) {
      setAgenciaElegivel(null);
      return;
    }
    let cancel = false;
    setAgenciaElegivel(null);
    void verificarElegibilidadeAgendaLive(infSel).then((c) => {
      if (cancel) return;
      if (c.perfilIncompleto) {
        onBloqueioGate("perfil");
        setAgenciaElegivel(false);
      } else if (c.faltaPlaybook) {
        onBloqueioGate("playbook");
        setAgenciaElegivel(false);
      } else {
        setAgenciaElegivel(true);
      }
    });
    return () => { cancel = true; };
  }, [userRole, infSel, onBloqueioGate]);

  async function carregarIo(influencerId: string) {
    const { data: ios } = await supabase
      .from("influencer_operadoras")
      .select("operadora_slug, id_operadora, ativo")
      .eq("influencer_id", influencerId)
      .eq("ativo", true);
    const slugs = [...new Set((ios ?? []).map((r: { operadora_slug: string }) => r.operadora_slug))];
    if (slugs.length === 0) {
      setOpcoesIo([]); setOpSlug(""); setIdOp("");
      return;
    }
    const { data: ops } = await supabase.from("operadoras").select("slug, nome").in("slug", slugs);
    const nomeMap: Record<string, string> = {};
    for (const o of ops ?? []) nomeMap[o.slug] = o.nome;
    const lista = (ios ?? []).map((r: { operadora_slug: string; id_operadora?: string | null }) => ({
      slug: r.operadora_slug,
      id_operadora: r.id_operadora ?? null,
      nome: nomeMap[r.operadora_slug] ?? r.operadora_slug,
    }));
    setOpcoesIo(lista);
    if (lista.length === 1) {
      setOpSlug(lista[0].slug);
      setIdOp((lista[0].id_operadora ?? "").trim());
    } else {
      setOpSlug("");
      setIdOp("");
    }
  }

  useEffect(() => {
    const cur = opcoesIo.find((o) => o.slug === opSlug);
    setIdOp((cur?.id_operadora ?? "").trim());
  }, [opSlug, opcoesIo]);

  const valorNum = parseFloat(valorStr.replace(",", ".")) || 0;
  const escopoOk = userRole === "influencer" || !!infSel;
  const regraCampanhaOk = userRole !== "agencia" || agenciaElegivel === true;
  const podeSubmeter =
    escopoOk &&
    regraCampanhaOk &&
    opSlug &&
    idOp.length > 0 &&
    valorNum > 0;

  async function handleSolicitar() {
    setErr("");
    if (!podeSubmeter) return;
    const influencerAlvo = userRole === "influencer" ? userId : infSel;
    const check = await verificarElegibilidadeAgendaLive(influencerAlvo);
    if (check.perfilIncompleto) {
      onBloqueioGate("perfil");
      return;
    }
    if (check.faltaPlaybook) {
      onBloqueioGate("playbook");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("banca_jogo_solicitacoes").insert({
      influencer_id: influencerAlvo,
      operadora_slug: opSlug,
      id_operadora_exibicao: idOp,
      valor: valorNum,
      status: "solicitado",
    });
    setSaving(false);
    if (error) {
      setErr(error.message ?? "Não foi possível salvar.");
      return;
    }
    onSalvo();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Nova solicitação de banca" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {userRole === "influencer" && (
          <div>
            <label style={labelStyle}>Influencer</label>
            <input value={nomeInfluencerLocked ?? ""} readOnly disabled style={{ ...inputStyle, opacity: 0.85, cursor: "not-allowed" }} />
          </div>
        )}
        {userRole === "agencia" && (
          <div>
            <label style={labelStyle}>Influencer *</label>
            <select value={infSel} onChange={(e) => setInfSel(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Selecione...</option>
              {influencerListAgencia.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            {infSel && agenciaElegivel === null ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Verificando elegibilidade…</p>
            ) : null}
            {infSel && agenciaElegivel === false ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f59e0b", fontFamily: FONT.body }}>
                Este influencer não pode solicitar valores até concluir cadastro ou ciência do Playbook (veja o aviso na tela).
              </p>
            ) : null}
          </div>
        )}

        <div>
          <label style={labelStyle}>ID da operadora (ativo)</label>
          {opcoesIo.length > 1 ? (
            <select value={opSlug} onChange={(e) => setOpSlug(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Selecione a operadora...</option>
              {opcoesIo.map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome} ({o.slug})</option>
              ))}
            </select>
          ) : null}
          <input
            value={idOp}
            readOnly
            placeholder={opSlug ? idOp : "—"}
            style={{ ...inputStyle, marginTop: opcoesIo.length > 1 ? 8 : 0, opacity: 0.9, cursor: "not-allowed" }}
          />
        </div>

        <div>
          <label style={labelStyle}>Valor solicitado (R$) *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valorStr}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { setValorStr(""); return; }
              if (v === "-") return;
              const n = parseFloat(v.replace(",", "."));
              if (!isNaN(n) && n < 0) return;
              setValorStr(v);
            }}
            style={inputStyle}
            placeholder="0,00"
          />
        </div>

        {err ? <div style={{ color: "#ef4444", fontSize: 12, fontFamily: FONT.body }}>{err}</div> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSolicitar}
            disabled={saving || !podeSubmeter}
            style={{
              flex: 2, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
              cursor: saving || !podeSubmeter ? "not-allowed" : "pointer", opacity: saving || !podeSubmeter ? 0.6 : 1,
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
            }}
          >
            {saving ? "Salvando..." : "Solicitar"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function ModalAprovarBanca({
  row,
  userId,
  onClose,
  onSucesso,
}: {
  row: BancaRowDb;
  userId: string;
  onClose: () => void;
  onSucesso: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [valorStr, setValorStr] = useState(String(row.valor));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: 13, fontFamily: FONT.body, boxSizing: "border-box",
  };
  const valorNum = parseFloat(valorStr.replace(",", ".")) || 0;

  async function handleConfirmar() {
    setErr("");
    if (valorNum <= 0) {
      setErr("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("banca_jogo_solicitacoes").update({
      valor: valorNum,
      status: "aprovado",
      aprovado_em: new Date().toISOString(),
      aprovado_por: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("status", "solicitado");
    setSaving(false);
    if (error) {
      setErr(error.message ?? "Não foi possível aprovar.");
      return;
    }
    onSucesso();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Aprovar solicitação" onClose={onClose} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Ajuste o valor, se necessário, antes de aprovar.
      </p>
      <div>
        <label style={labelStyle}>Valor (R$)</label>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={valorStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { setValorStr(""); return; }
            const n = parseFloat(v.replace(",", "."));
            if (!isNaN(n) && n < 0) return;
            setValorStr(v);
          }}
          style={inputStyle}
        />
      </div>
      {err ? <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12, fontFamily: FONT.body }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={saving || valorNum <= 0}
          style={{
            flex: 2, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: saving || valorNum <= 0 ? "not-allowed" : "pointer", opacity: saving || valorNum <= 0 ? 0.6 : 1,
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {saving ? "Salvando..." : "Confirmar aprovação"}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalConfirmLiberar({
  idOperadora,
  onCancel,
  onSeguir,
  loading,
}: {
  idOperadora: string;
  onCancel: () => void;
  onSeguir: () => void;
  loading?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const idTxt = (idOperadora ?? "").trim() || "—";
  return (
    <ModalBase onClose={onCancel} maxWidth={440}>
      <ModalHeader title="Liberar banca" onClose={onCancel} />
      <p style={{ margin: "0 0 24px", fontSize: 14, color: t.text, fontFamily: FONT.body, lineHeight: 1.5 }}>
        Verifique se a conta <strong style={{ fontFamily: "monospace" }}>{idTxt}</strong> está bloqueada.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: loading ? "not-allowed" : "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSeguir}
          disabled={loading}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {loading ? "Processando..." : "Seguir"}
        </button>
      </div>
    </ModalBase>
  );
}

function BlocoSolicitacoes({
  filtros,
  rowsDb,
  perfilMap,
  staffPodeAcao,
  staffPodeAprovar,
  podeExcluirLinha,
  onRecarregar,
  onPerfisAtualizados,
  influencerListAgencia,
  nomeUsuario,
}: {
  filtros: BlocoFiltros;
  rowsDb: BancaRowDb[];
  perfilMap: Record<string, { nome: string; cpf: string }>;
  staffPodeAcao: boolean;
  /** Operador não aprova solicitações; só libera após aprovação interna. */
  staffPodeAprovar: boolean;
  /** Gestão de Usuários: can_excluir sim ou proprios + escopo da linha. */
  podeExcluirLinha: (row: BancaRowDb) => boolean;
  onRecarregar: () => void;
  onPerfisAtualizados: () => void;
  influencerListAgencia: { id: string; name: string }[];
  nomeUsuario: string;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const {
    podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp,
    mesFiltro, historico, statusFiltro,
  } = filtros;
  const periodo = historico ? null : periodoDoMes(mesFiltro);

  const [modalOpen, setModalOpen] = useState(false);
  const [bloqueioSolicitacao, setBloqueioSolicitacao] = useState<"perfil" | "playbook" | null>(null);
  const [modalAprovar, setModalAprovar] = useState<BancaRowDb | null>(null);
  const [modalLiberar, setModalLiberar] = useState<BancaRowDb | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const onBloqueioGate = useCallback((tipo: "perfil" | "playbook") => {
    setBloqueioSolicitacao(tipo);
  }, []);

  async function aoClicarSolicitar() {
    if (!user?.id) return;
    if (user.role === "influencer") {
      const check = await verificarElegibilidadeAgendaLive(user.id);
      if (check.perfilIncompleto) {
        setBloqueioSolicitacao("perfil");
        return;
      }
      if (check.faltaPlaybook) {
        setBloqueioSolicitacao("playbook");
        return;
      }
    }
    setModalOpen(true);
  }

  const lista = useMemo(() => {
    return rowsDb.filter((r) => {
      if (!["solicitado", "aprovado"].includes(r.status)) return false;
      if (!podeVerInfluencer(r.influencer_id)) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(r.influencer_id)) return false;
      if (filtroOp?.length) {
        if (!r.operadora_slug || !filtroOp.includes(r.operadora_slug)) return false;
      } else if (filterOperadora && filterOperadora !== "todas") {
        if (r.operadora_slug !== filterOperadora) return false;
      }
      if (statusFiltro && r.status !== statusFiltro) return false;
      return rowNoMesSolicitacao(r, periodo, historico);
    }).sort((a, b) => (b.solicitado_em ?? "").localeCompare(a.solicitado_em ?? ""));
  }, [rowsDb, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, statusFiltro, periodo, historico]);

  async function executarLiberar(row: BancaRowDb) {
    if (!user?.id) return;
    setLiberando(true);
    try {
      const { error } = await supabase.from("banca_jogo_solicitacoes").update({
        status: "liberado",
        liberado_em: new Date().toISOString(),
        liberado_por: user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("status", "aprovado");
      if (!error) {
        onRecarregar();
        setModalLiberar(null);
      }
    } finally {
      setLiberando(false);
    }
  }

  async function excluirSolicitacao(r: BancaRowDb) {
    if (!podeExcluirLinha(r)) return;
    if (!window.confirm("Excluir esta solicitação permanentemente?")) return;
    setExcluindoId(r.id);
    const { error } = await supabase.from("banca_jogo_solicitacoes").delete().eq("id", r.id);
    setExcluindoId(null);
    if (!error) onRecarregar();
  }

  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted,
    background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "13px 14px", fontSize: "13px", color: t.text, fontFamily: FONT.body,
  };

  const podeSolicitar = user && ["influencer", "agencia"].includes(user.role);

  return (
    <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "22px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <BlocoLabel label="📋 Solicitações" />
        {podeSolicitar ? (
          <button
            type="button"
            onClick={() => void aoClicarSolicitar()}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
            }}
          >
            + Solicitar
          </button>
        ) : null}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.cardBorder}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Influencer", "ID operadora", "CPF", "Valor", "Status", "Data", "Ação"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: "center", color: t.textMuted, padding: 36 }}>
                  Nenhuma solicitação em aberto neste filtro.
                </td>
              </tr>
            ) : (
              lista.map((r) => {
                const perf = perfilMap[r.influencer_id];
                const st = STATUS_BANCA[r.status];
                const dataStr = new Date(r.solicitado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
                const showAprovar = staffPodeAprovar && r.status === "solicitado";
                const showLiberar = staffPodeAcao && r.status === "aprovado";
                const showExcluir = podeExcluirLinha(r);
                const semAcao = !showAprovar && !showLiberar && !showExcluir;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    <td style={td}>{perf?.nome ?? r.influencer_id}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{(r.id_operadora_exibicao ?? "").trim() || "—"}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{(perf?.cpf ?? "").trim() || "—"}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmtMoeda(Number(r.valor))}</td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}44` }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>{dataStr}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {showAprovar ? (
                          <button type="button" onClick={() => setModalAprovar(r)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #6b7fff44", background: "#6b7fff15", color: "#6b7fff", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                            Aprovar
                          </button>
                        ) : null}
                        {showLiberar ? (
                          <button type="button" onClick={() => setModalLiberar(r)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #10b98144", background: "#10b98115", color: "#10b981", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                            Liberar
                          </button>
                        ) : null}
                        {showExcluir ? (
                          <button
                            type="button"
                            disabled={excluindoId === r.id}
                            onClick={() => void excluirSolicitacao(r)}
                            style={{
                              padding: "5px 12px", borderRadius: 8, border: "1px solid #ef444444", background: "#ef444415",
                              color: "#ef4444", fontSize: 11, fontWeight: 700, fontFamily: FONT.body,
                              cursor: excluindoId === r.id ? "not-allowed" : "pointer", opacity: excluindoId === r.id ? 0.65 : 1,
                            }}
                          >
                            {excluindoId === r.id ? "…" : "Excluir"}
                          </button>
                        ) : null}
                        {semAcao ? <span style={{ color: t.textMuted, fontSize: 11 }}>—</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {bloqueioSolicitacao ? (
        <ModalBloqueioSolicitacaoCampanha
          tipo={bloqueioSolicitacao}
          onClose={() => setBloqueioSolicitacao(null)}
        />
      ) : null}
      {modalOpen && user && (
        <ModalSolicitar
          onClose={() => setModalOpen(false)}
          onSalvo={onRecarregar}
          userRole={user.role}
          userId={user.id}
          influencerListAgencia={influencerListAgencia}
          nomeInfluencerLocked={nomeUsuario}
          onBloqueioGate={onBloqueioGate}
        />
      )}
      {modalAprovar && user ? (
        <ModalAprovarBanca
          row={modalAprovar}
          userId={user.id}
          onClose={() => setModalAprovar(null)}
          onSucesso={() => { onRecarregar(); onPerfisAtualizados(); }}
        />
      ) : null}
      {modalLiberar ? (
        <ModalConfirmLiberar
          idOperadora={(modalLiberar.id_operadora_exibicao ?? "").trim()}
          onCancel={() => { if (!liberando) setModalLiberar(null); }}
          onSeguir={() => void executarLiberar(modalLiberar)}
          loading={liberando}
        />
      ) : null}
    </div>
  );
}

function ModalAlterarStatusConta({
  influencerId,
  nome,
  statusContaAtual,
  onClose,
  onSalvo,
}: {
  influencerId: string;
  nome: string;
  /** Status da conta na banca (operadora), não o status do cadastro do influencer. */
  statusContaAtual: BancaStatusConta;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [paraLiberada, setParaLiberada] = useState(statusContaAtual === "liberada");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [idsOperadoraTxt, setIdsOperadoraTxt] = useState("…");

  useEffect(() => {
    setParaLiberada(statusContaAtual === "liberada");
  }, [influencerId, statusContaAtual]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("influencer_operadoras")
        .select("id_operadora")
        .eq("influencer_id", influencerId)
        .eq("ativo", true);
      const ids = [...new Set((data ?? [])
        .map((r: { id_operadora?: string | null }) => (r.id_operadora ?? "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      setIdsOperadoraTxt(ids.length ? ids.join(" · ") : "—");
    })();
  }, [influencerId]);

  async function salvar() {
    setErr("");
    const novoConta: BancaStatusConta = paraLiberada ? "liberada" : "bloqueada";
    if (novoConta === statusContaAtual) {
      onClose();
      return;
    }
    setSaving(true);
    const agora = new Date().toISOString();
    const patch: Record<string, string> = { banca_status_conta: novoConta };
    if (paraLiberada) patch.banca_data_desbloqueio = agora;
    else patch.banca_data_bloqueio = agora;
    const { error } = await supabase.from("influencer_perfil").update(patch).eq("id", influencerId);
    setSaving(false);
    if (error) {
      setErr(error.message ?? "Não foi possível atualizar.");
      return;
    }
    onSalvo();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Status da Conta" onClose={onClose} />
      <p style={{
        margin: "0 0 12px",
        fontSize: 14,
        fontWeight: 700,
        color: t.text,
        fontFamily: FONT.body,
        lineHeight: 1.45,
      }}
      >
        {nome} / {idsOperadoraTxt}
      </p>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.55 }}>
        Garanta que a conta esteja Bloqueada enquanto a ação continua ativa para evitar saques por parte do Influencer do dinheiro destinado a ação.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONT.body, fontSize: 14, color: t.text }}>
          <input type="radio" name="stconta" checked={paraLiberada} onChange={() => setParaLiberada(true)} />
          Liberada
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONT.body, fontSize: 14, color: t.text }}>
          <input type="radio" name="stconta" checked={!paraLiberada} onChange={() => setParaLiberada(false)} />
          Bloqueada
        </label>
      </div>
      {err ? <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12, fontFamily: FONT.body }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </ModalBase>
  );
}

function BlocoConsolidadoBanca({
  filtros,
  rowsDb,
  perfilMap,
  podeEditarStatusConta,
  onPerfisAtualizados,
}: {
  filtros: BlocoFiltros;
  rowsDb: BancaRowDb[];
  perfilMap: Record<string, {
    nome: string;
    cpf: string;
    email: string;
    banca_status_conta: BancaStatusConta;
    banca_data_bloqueio: string | null;
    banca_data_desbloqueio: string | null;
  }>;
  podeEditarStatusConta: boolean;
  onPerfisAtualizados: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const {
    podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp,
    mesFiltro, historico, statusFiltro,
  } = filtros;
  const periodo = historico ? null : periodoDoMes(mesFiltro);

  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<{ id: string; nome: string; statusConta: BancaStatusConta } | null>(null);

  const fmtData = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—";

  const rowsFiltradas = useMemo(() => {
    return rowsDb.filter((r) => {
      if (!podeVerInfluencer(r.influencer_id)) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(r.influencer_id)) return false;
      if (filtroOp?.length) {
        if (!r.operadora_slug || !filtroOp.includes(r.operadora_slug)) return false;
      } else if (filterOperadora && filterOperadora !== "todas") {
        if (r.operadora_slug !== filterOperadora) return false;
      }
      if (statusFiltro && r.status !== statusFiltro) return false;
      return rowInteressaConsolidado(r, periodo, historico);
    });
  }, [rowsDb, podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, statusFiltro, periodo, historico]);

  interface AgRow {
    influencer_id: string;
    nome: string;
    email: string;
    totalLiberado: number;
    totalSolicitado: number;
    dataBloqueio: string | null;
    dataDesbloqueio: string | null;
    statusContaBanca: BancaStatusConta;
  }

  const agregados = useMemo(() => {
    const byInf = new Map<string, BancaRowDb[]>();
    for (const r of rowsFiltradas) {
      const arr = byInf.get(r.influencer_id) ?? [];
      arr.push(r);
      byInf.set(r.influencer_id, arr);
    }
    const out: AgRow[] = [];
    for (const [infId, list] of byInf) {
      const perf = perfilMap[infId];
      const totalLiberado = list.filter((x) => x.status === "liberado").reduce((a, x) => a + Number(x.valor), 0);
      const totalSolicitado = list.filter((x) => x.status === "solicitado" || x.status === "aprovado").reduce((a, x) => a + Number(x.valor), 0);
      const stConta: BancaStatusConta =
        perf?.banca_status_conta === "bloqueada" ? "bloqueada" : "liberada";
      out.push({
        influencer_id: infId,
        nome: perf?.nome ?? infId,
        email: perf?.email ?? "",
        totalLiberado,
        totalSolicitado,
        dataBloqueio: perf?.banca_data_bloqueio ?? null,
        dataDesbloqueio: perf?.banca_data_desbloqueio ?? null,
        statusContaBanca: stConta,
      });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rowsFiltradas, perfilMap]);

  const filtradaBusca = agregados.filter((r) =>
    !busca || r.nome.toLowerCase().includes(busca.toLowerCase()) || r.email.toLowerCase().includes(busca.toLowerCase()),
  );

  const th: React.CSSProperties = {
    padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted,
    background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const td: React.CSSProperties = {
    padding: "13px 14px", fontSize: "13px", color: t.text, fontFamily: FONT.body,
  };

  const contaLabel = (st: BancaStatusConta) => {
    if (st === "liberada") return { label: "Liberada", color: "#10b981" };
    return { label: "Bloqueada", color: "#ef4444" };
  };

  return (
    <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "22px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <BlocoLabel label="🎰 Consolidado de bancas" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome ou e-mail..."
          style={{
            flex: 1, minWidth: 280, maxWidth: 420,
            padding: "8px 14px", borderRadius: 10,
            border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.inputText,
            fontSize: 13, fontFamily: FONT.body, outline: "none",
          }}
        />
        <span style={{ fontSize: 12, color: t.textMuted }}>{filtradaBusca.length} influencers</span>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.cardBorder}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 32 }} />
              {["Influencer", "Total liberado", "Total solicitado", "Data de bloqueio", "Data de desbloqueio", "Status da conta"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradaBusca.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: "center", color: t.textMuted, padding: 40 }}>
                  {MSG_SEM_DADOS_FILTRO}
                </td>
              </tr>
            ) : (
              filtradaBusca.map((row) => {
                const open = expandido === row.influencer_id;
                const sl = contaLabel(row.statusContaBanca);
                const itens = rowsFiltradas.filter((r) => r.influencer_id === row.influencer_id).sort((a, b) => (b.solicitado_em ?? "").localeCompare(a.solicitado_em ?? ""));
                return (
                  <Fragment key={row.influencer_id}>
                    <tr
                      style={{ borderBottom: `1px solid ${t.cardBorder}`, cursor: "pointer" }}
                      onClick={() => setExpandido(open ? null : row.influencer_id)}
                    >
                      <td style={td}>
                        <span style={{ fontSize: 10, color: t.textMuted, display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▶</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={row.nome} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{row.nome}</div>
                            <div style={{ fontSize: 11, color: t.textMuted }}>{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: "#10b981" }}>{fmtMoeda(row.totalLiberado)}</td>
                      <td style={{ ...td, color: row.totalSolicitado > 0 ? "#f59e0b" : t.textMuted, fontWeight: row.totalSolicitado > 0 ? 600 : 400 }}>{fmtMoeda(row.totalSolicitado)}</td>
                      <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>{fmtData(row.dataBloqueio)}</td>
                      <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>{fmtData(row.dataDesbloqueio)}</td>
                      <td style={td}>
                        <span
                          role={podeEditarStatusConta ? "button" : undefined}
                          title={podeEditarStatusConta ? "Clique para alterar" : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (podeEditarStatusConta) setModalStatus({ id: row.influencer_id, nome: row.nome, statusConta: row.statusContaBanca });
                          }}
                          style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                            background: `${sl.color}22`, color: sl.color, border: `1px solid ${sl.color}44`,
                            cursor: podeEditarStatusConta ? "pointer" : "default",
                          }}
                        >
                          {sl.label}
                        </span>
                      </td>
                    </tr>
                    {open ? (
                      <tr style={{ background: t.isDark ? "rgba(74,48,130,0.06)" : "rgba(74,48,130,0.03)" }}>
                        <td colSpan={7} style={{ padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: t.textMuted, marginBottom: 10, fontFamily: FONT.body }}>
                            Bancas solicitadas — {row.nome}
                          </div>
                          {itens.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: 12 }}>Nenhum registro.</div>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["Data", "Operadora", "ID operadora", "Valor", "Status"].map((h) => (
                                    <th key={h} style={{ ...th, background: "transparent", fontSize: 10, padding: "6px 10px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {itens.map((h) => (
                                  <tr key={h.id} style={{ borderBottom: `1px solid ${t.divider}` }}>
                                    <td style={{ ...td, fontSize: 12, padding: "8px 10px" }}>
                                      {new Date(h.solicitado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                    </td>
                                    <td style={{ ...td, fontSize: 12, padding: "8px 10px" }}>{h.operadora_slug}</td>
                                    <td style={{ ...td, fontSize: 12, padding: "8px 10px", fontFamily: "monospace" }}>{(h.id_operadora_exibicao ?? "").trim() || "—"}</td>
                                    <td style={{ ...td, fontSize: 12, padding: "8px 10px" }}>{fmtMoeda(Number(h.valor))}</td>
                                    <td style={{ ...td, fontSize: 12, padding: "8px 10px" }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_BANCA[h.status].color }}>{STATUS_BANCA[h.status].label}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {modalStatus ? (
        <ModalAlterarStatusConta
          influencerId={modalStatus.id}
          nome={modalStatus.nome}
          statusContaAtual={modalStatus.statusConta}
          onClose={() => setModalStatus(null)}
          onSalvo={onPerfisAtualizados}
        />
      ) : null}
    </div>
  );
}

export default function BancaJogo() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("banca_jogo");
  const {
    showFiltroInfluencer,
    podeVerInfluencer,
    podeVerOperadora,
    escoposVisiveis: ev,
    operadoraSlugsForcado,
  } = useDashboardFiltros();
  const showFiltroOperadoraExtra = useBancaFiltroOperadoraUI(user?.role);

  const [ciclosRows, setCiclosRows] = useState<BancaRowDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora, setFilterOperadora] = useState("todas");
  const [influencerList, setInfluencerList] = useState<{ id: string; name: string }[]>([]);
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [perfilMap, setPerfilMap] = useState<Record<string, {
    nome: string;
    cpf: string;
    email: string;
    banca_status_conta: BancaStatusConta;
    banca_data_bloqueio: string | null;
    banca_data_desbloqueio: string | null;
  }>>({});

  const MESES_OPCOES = useMemo(() => gerarMeses().slice(1), []);
  const [mesFiltro, setMesFiltro] = useState(MESES_OPCOES[0]?.value ?? "");
  const [historico, setHistorico] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<"" | BancaStatus>("");

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer],
  );

  const agenciaParesInfIds = useMemo(() => {
    if (user?.role !== "agencia") return null;
    const ids = new Set<string>();
    for (const s of ev?.influencersVisiveis ?? []) ids.add(s);
    return ids;
  }, [user?.role, ev?.influencersVisiveis]);

  const influencerListAgenciaModal = useMemo(() => {
    if (user?.role !== "agencia") return [];
    return influencerListVisiveis.filter((i) => !agenciaParesInfIds || agenciaParesInfIds.has(i.id));
  }, [user?.role, influencerListVisiveis, agenciaParesInfIds]);

  const filterOperadoraEfetivo = operadoraSlugsForcado?.length ? operadoraSlugsForcado[0] : filterOperadora;
  const filtroOp = operadoraSlugsForcado?.length ? operadoraSlugsForcado : (filterOperadora !== "todas" ? [filterOperadora] : null);

  const filtros: BlocoFiltros = useMemo(() => ({
    podeVerInfluencer,
    podeVerOperadora,
    filterInfluencers,
    filterOperadora: filterOperadoraEfetivo,
    filtroOp,
    operadorasList,
    mesFiltro: historico ? "" : mesFiltro,
    historico,
    statusFiltro: statusFiltro || ("" as const),
  }), [podeVerInfluencer, podeVerOperadora, filterInfluencers, filterOperadoraEfetivo, filtroOp, operadorasList, mesFiltro, historico, statusFiltro]);

  const idxMesAtual = MESES_OPCOES.findIndex((m) => m.value === mesFiltro);
  function prevMes() {
    if (idxMesAtual < MESES_OPCOES.length - 1) setMesFiltro(MESES_OPCOES[idxMesAtual + 1]?.value ?? "");
  }
  function nextMes() {
    if (idxMesAtual > 0) setMesFiltro(MESES_OPCOES[idxMesAtual - 1]?.value ?? "");
  }

  const btnNavStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`, background: "transparent",
    color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const chipBase = (active: boolean) => ({
    padding: "6px 14px", borderRadius: 999,
    border: `1px solid ${active ? brand.accent : t.cardBorder}`,
    background: active ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BASE_COLORS.purple}22`) : (t.inputBg ?? t.cardBg),
    color: active ? brand.accent : t.textMuted,
    fontSize: 13, fontWeight: active ? 700 : 400,
    fontFamily: FONT.body, cursor: "pointer", outline: "none",
  } as React.CSSProperties);

  async function carregarDados() {
    setLoading(true);
    const { data } = await supabase.from("banca_jogo_solicitacoes").select("*").order("solicitado_em", { ascending: false });
    setCiclosRows((data ?? []) as BancaRowDb[]);
    setLoading(false);
  }

  useEffect(() => { void carregarDados(); }, []);

  useEffect(() => {
    void supabase.from("profiles").select("id, name").eq("role", "influencer").then(({ data }) => {
      if (data) setInfluencerList(data);
    });
  }, []);

  useEffect(() => {
    void supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => {
      if (data) setOperadorasList(data);
    });
  }, []);

  const carregarPerfis = useCallback(async () => {
    const { data: perfis } = await supabase
      .from("influencer_perfil")
      .select("id, nome_artistico, cpf, banca_status_conta, banca_data_bloqueio, banca_data_desbloqueio");
    const { data: emails } = await supabase.from("profiles").select("id, email").eq("role", "influencer");
    const emailM: Record<string, string> = {};
    for (const e of emails ?? []) emailM[(e as { id: string }).id] = (e as { email: string }).email;
    const m: Record<string, {
      nome: string;
      cpf: string;
      email: string;
      banca_status_conta: BancaStatusConta;
      banca_data_bloqueio: string | null;
      banca_data_desbloqueio: string | null;
    }> = {};
    for (const p of perfis ?? []) {
      const row = p as {
        id: string;
        nome_artistico?: string;
        cpf?: string;
        banca_status_conta?: string | null;
        banca_data_bloqueio?: string | null;
        banca_data_desbloqueio?: string | null;
      };
      const conta: BancaStatusConta = row.banca_status_conta === "bloqueada" ? "bloqueada" : "liberada";
      m[row.id] = {
        nome: row.nome_artistico ?? emailM[row.id] ?? row.id,
        cpf: row.cpf ?? "",
        email: emailM[row.id] ?? "",
        banca_status_conta: conta,
        banca_data_bloqueio: row.banca_data_bloqueio ?? null,
        banca_data_desbloqueio: row.banca_data_desbloqueio ?? null,
      };
    }
    setPerfilMap(m);
  }, []);

  useEffect(() => { void carregarPerfis(); }, [carregarPerfis]);

  const staffPodeAcao =
    !!user &&
    !["influencer", "agencia"].includes(user.role) &&
    perm.canEditarOk;

  const staffPodeAprovar = staffPodeAcao && user?.role !== "operador";

  /** can_excluir da Gestão de Usuários: sim ou proprios, respeitando escopo influencer + operadora da linha. */
  const podeExcluirLinha = useCallback((r: BancaRowDb) => {
    if (!user || !perm.canExcluirOk) return false;
    const ce = perm.canExcluir;
    if (ce !== "sim" && ce !== "proprios") return false;
    return podeVerInfluencer(r.influencer_id) && podeVerOperadora(r.operadora_slug);
  }, [user, perm.canExcluirOk, perm.canExcluir, podeVerInfluencer, podeVerOperadora]);

  if (perm.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando permissões...
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Banca de Jogo.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando banca de jogo...
      </div>
    );
  }

  const perfilMapSolicitacoes = perfilMap;

  return (
    <div className="app-page-shell">
      <h1 style={{ fontFamily: FONT.title, fontSize: 26, fontWeight: 900, marginBottom: 6, color: brand.primary }}>🎰 Banca de Jogo</h1>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 14, fontFamily: FONT.body }}>
        Solicitações de pagamento de banca por influencer e operadora.
      </p>

      <div style={{ marginBottom: 20 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={prevMes} style={btnNavStyle} disabled={idxMesAtual >= MESES_OPCOES.length - 1} title="Mês anterior">
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Total" : (MESES_OPCOES.find((m) => m.value === mesFiltro)?.label ?? mesFiltro)}
            </span>
            <button type="button" onClick={nextMes} style={btnNavStyle} disabled={idxMesAtual <= 0} title="Próximo mês">
              <ChevronRight size={14} />
            </button>

            <button type="button" onClick={() => setHistorico((h) => !h)} style={chipBase(historico)}>
              Histórico
            </button>

            {showFiltroInfluencer && influencerListVisiveis.length > 0 ? (
              <InfluencerMultiSelect
                selected={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
                t={t}
              />
            ) : null}

            {showFiltroOperadoraExtra && operadorasList.length > 0 ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={13} />
                </span>
                <select
                  value={filterOperadora}
                  onChange={(e) => setFilterOperadora(e.target.value)}
                  style={{
                    padding: "6px 14px 6px 30px", borderRadius: 999,
                    border: `1px solid ${filterOperadora !== "todas" ? brand.accent : t.cardBorder}`,
                    background: filterOperadora !== "todas" ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BASE_COLORS.purple}22`) : (t.inputBg ?? t.cardBg),
                    color: filterOperadora !== "todas" ? brand.accent : t.textMuted,
                    fontSize: 13, fontWeight: filterOperadora !== "todas" ? 700 : 400,
                    fontFamily: FONT.body, cursor: "pointer", outline: "none", appearance: "none",
                  }}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>{o.nome}</option>
                    ))}
                </select>
              </div>
            ) : null}

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as "" | BancaStatus)}
              style={{
                padding: "6px 14px", borderRadius: 999,
                border: `1px solid ${statusFiltro ? brand.accent : t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: statusFiltro ? brand.accent : t.textMuted,
                fontSize: 13, fontFamily: FONT.body, cursor: "pointer", outline: "none",
              }}
            >
              <option value="">Todos os status</option>
              <option value="solicitado">Solicitado</option>
              <option value="aprovado">Aprovado</option>
              <option value="liberado">Liberado</option>
            </select>
          </div>
        </div>
      </div>

      <BlocoSolicitacoes
        filtros={filtros}
        rowsDb={ciclosRows}
        perfilMap={perfilMapSolicitacoes}
        staffPodeAcao={staffPodeAcao}
        staffPodeAprovar={staffPodeAprovar}
        podeExcluirLinha={podeExcluirLinha}
        onRecarregar={carregarDados}
        onPerfisAtualizados={() => void carregarPerfis()}
        influencerListAgencia={influencerListAgenciaModal}
        nomeUsuario={user?.name ?? ""}
      />

      <BlocoConsolidadoBanca
        filtros={filtros}
        rowsDb={ciclosRows}
        perfilMap={perfilMap}
        podeEditarStatusConta={staffPodeAcao}
        onPerfisAtualizados={() => void carregarPerfis()}
      />
    </div>
  );
}
