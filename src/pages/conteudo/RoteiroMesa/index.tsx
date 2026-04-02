import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { BookOpen, Megaphone, Trash2, FileText, Info, AlertTriangle, Plus, X, Check } from "lucide-react";
import { GiNotebook, GiShield } from "react-icons/gi";
import OperadoraTag from "../../../components/OperadoraTag";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  azul:           "#1e36f8",
  azulLight:      "rgba(30,54,248,0.12)",
  azulBorder:     "rgba(30,54,248,0.30)",
  vermelho:       "#e84025",
  vermelhoLight:  "rgba(232,64,37,0.10)",
  vermelhoBorder: "rgba(232,64,37,0.30)",
  roxo:           "#4a2082",
  roxoLight:      "rgba(74,32,130,0.12)",
  roxoBorder:     "rgba(74,32,130,0.30)",
  ciano:          "#70cae4",
  cianoLight:     "rgba(112,202,228,0.12)",
  cianoBorder:    "rgba(112,202,228,0.30)",
} as const;

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export type BlocoRoteiro = "abertura" | "durante_jogo" | "fechamento";
export type TipoSugestao = "script" | "orientacao" | "alerta";
export type JogoTag      = "todos" | "blackjack" | "roleta" | "baccarat";

export interface RoteiroSugestao {
  id: string;
  operadora_slug: string;
  bloco: BlocoRoteiro;
  texto: string;
  tipo?: TipoSugestao;
  jogos?: JogoTag[];
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoteiroCampanha {
  id: string;
  operadora_slug: string;
  titulo: string;
  texto: string;
  jogos?: JogoTag[];
  data_inicio?: string;
  data_fim?: string;
  ativo: boolean;
  ordem: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const BLOCOS: { key: BlocoRoteiro; label: string }[] = [
  { key: "abertura",     label: "Abertura"       },
  { key: "durante_jogo", label: "Durante o Jogo" },
  { key: "fechamento",   label: "Fechamento"     },
];

const JOGOS: { key: JogoTag; label: string }[] = [
  { key: "todos",     label: "Todos os Jogos" },
  { key: "blackjack", label: "BlackJack"      },
  { key: "roleta",    label: "Roleta"         },
  { key: "baccarat",  label: "Baccarat"       },
];

const TIPOS: { key: TipoSugestao; label: string }[] = [
  { key: "script",     label: "Script"     },
  { key: "orientacao", label: "Orientação" },
  { key: "alerta",     label: "Alerta"     },
];

// ─── CONFIG VISUAL POR BLOCO ─────────────────────────────────────────────────
const BLOCO_CONFIG: Record<BlocoRoteiro, {
  accent: string;
  titleColor: (dark: boolean) => string;
  btnBg: string;
  emptyGradient: (dark: boolean) => string;
}> = {
  abertura: {
    accent:        BRAND.azul,
    titleColor:    (d) => d ? "#7b95ff" : "#1631c4",
    btnBg:         BRAND.azul,
    emptyGradient: (d) => d
      ? "linear-gradient(135deg,rgba(30,54,248,0.12) 0%,rgba(74,32,130,0.12) 100%)"
      : "linear-gradient(135deg,rgba(30,54,248,0.06) 0%,rgba(74,32,130,0.06) 100%)",
  },
  durante_jogo: {
    accent:        BRAND.vermelho,
    titleColor:    (d) => d ? "#ff8570" : "#b02a14",
    btnBg:         BRAND.vermelho,
    emptyGradient: (d) => d
      ? "linear-gradient(135deg,rgba(232,64,37,0.12) 0%,rgba(74,32,130,0.08) 100%)"
      : "linear-gradient(135deg,rgba(232,64,37,0.06) 0%,rgba(74,32,130,0.04) 100%)",
  },
  fechamento: {
    accent:        BRAND.roxo,
    titleColor:    (d) => d ? "#b08aee" : "#3a1868",
    btnBg:         BRAND.roxo,
    emptyGradient: (d) => d
      ? "linear-gradient(135deg,rgba(74,32,130,0.15) 0%,rgba(30,54,248,0.08) 100%)"
      : "linear-gradient(135deg,rgba(74,32,130,0.07) 0%,rgba(30,54,248,0.04) 100%)",
  },
};

// ─── CONFIG VISUAL POR TIPO ───────────────────────────────────────────────────
const TIPO_CONFIG: Record<TipoSugestao, {
  borderColor: string;
  bgColor:     (dark: boolean) => string;
  textColor:   (dark: boolean) => string;
  tagBg:       string;
  tagColor:    (dark: boolean) => string;
  tagBorder:   string;
  label:       string;
}> = {
  script: {
    borderColor: "rgba(30,54,248,0.45)",
    bgColor:     (d) => d ? "rgba(30,54,248,0.06)" : "rgba(30,54,248,0.03)",
    textColor:   (d) => d ? "#d0d0ee" : "#1a1a3e",
    tagBg:       "rgba(30,54,248,0.12)",
    tagColor:    (d) => d ? "#7b95ff" : "#1631c4",
    tagBorder:   "rgba(30,54,248,0.30)",
    label:       "Script",
  },
  orientacao: {
    borderColor: "rgba(107,114,128,0.55)",
    bgColor:     (d) => d ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
    textColor:   (d) => d ? "#9898be" : "#4a4a6a",
    tagBg:       "rgba(107,114,128,0.15)",
    tagColor:    (d) => d ? "#b0b0cc" : "#3a3a5a",
    tagBorder:   "rgba(107,114,128,0.30)",
    label:       "Orientação",
  },
  alerta: {
    borderColor: "rgba(232,64,37,0.40)",
    bgColor:     (d) => d ? "rgba(232,64,37,0.06)" : "rgba(232,64,37,0.03)",
    textColor:   (d) => d ? "#ff9980" : "#b02a14",
    tagBg:       "rgba(232,64,37,0.12)",
    tagColor:    (d) => d ? "#ff8570" : "#b02a14",
    tagBorder:   "rgba(232,64,37,0.30)",
    label:       "Alerta",
  },
};

const TIPO_ICON: Record<TipoSugestao, typeof FileText> = {
  script:      FileText,
  orientacao:  Info,
  alerta:      AlertTriangle,
};

/** Coluna fixa ícone + rótulo do tipo: mesmo alinhamento do texto em Script / Alerta / Orientação */
const ROTEIRO_IDENT_COL_PX = 108;
const ROTEIRO_TIPO_ICON_SIZE = 20;

// ─── CONFIG VISUAL POR JOGO ───────────────────────────────────────────────────
const JOGO_TAG_CONFIG: Record<JogoTag, { bg: string; color: (d: boolean) => string; border: string }> = {
  todos:     { bg: "rgba(74,32,130,0.12)",   color: (d) => d ? "#b08aee" : "#3a1868", border: "rgba(74,32,130,0.28)"   },
  blackjack: { bg: "rgba(30,54,248,0.12)",   color: (d) => d ? "#7b95ff" : "#1631c4", border: "rgba(30,54,248,0.28)"   },
  roleta:    { bg: "rgba(232,64,37,0.12)",   color: (d) => d ? "#ff8570" : "#b02a14", border: "rgba(232,64,37,0.28)"   },
  baccarat:  { bg: "rgba(112,202,228,0.12)", color: (d) => d ? "#70cae4" : "#0f6a8a", border: "rgba(112,202,228,0.28)" },
};

// ─── TAG CHIP ─────────────────────────────────────────────────────────────────
function TagChip({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
      textTransform: "uppercase", letterSpacing: "0.06em",
      background: bg, color, border: `1px solid ${border}`,
      whiteSpace: "nowrap", fontFamily: FONT.body,
    }}>
      {label}
    </span>
  );
}

// ─── MODAL ROTEIRO (+ Roteiro) ───────────────────────────────────────────────
function ModalRoteiro({ operadoraSlug, operadorasList, bloco, onClose, onSalvo, podeVerOperadora }: {
  operadoraSlug: string;
  operadorasList: { slug: string; nome: string }[];
  bloco: BlocoRoteiro;
  onClose: () => void;
  onSalvo: () => void;
  podeVerOperadora: (slug: string) => boolean;
}) {
  const { theme: t, user, isDark } = useApp();
  const dark = isDark ?? false;
  const mostraCampoOperadora = user?.role === "gestor" || user?.role === "admin";
  const [tipo, setTipo] = useState<TipoSugestao>("script");
  const [jogos, setJogos] = useState<JogoTag[]>(["todos"]);
  const [texto, setTexto] = useState("");
  const [operadoraSlugModal, setOperadoraSlugModal] = useState(operadoraSlug === "todas" ? "" : operadoraSlug);
  const [saving, setSaving] = useState(false);

  const operadorasFiltradas = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const operadoraFinal = mostraCampoOperadora ? operadoraSlugModal : operadoraSlug;

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!texto.trim() || !operadoraFinal || operadoraFinal === "todas") return;
    setSaving(true);
    const payload = { texto: texto.trim(), tipo, jogos, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("roteiro_mesa_sugestoes").insert({ operadora_slug: operadoraFinal, bloco, ordem: 0, ...payload });
    if (error) console.error("[RoteiroMesa] insert roteiro:", error.message);
    setSaving(false);
    if (!error) { onSalvo(); onClose(); }
  };

  const podeSalvar = texto.trim().length > 0 && operadoraFinal && operadoraFinal !== "todas";
  const blocoLabel = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;
  const cfg = BLOCO_CONFIG[bloco];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 500, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: cfg.accent, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>Novo Roteiro — {blocoLabel}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        {mostraCampoOperadora && operadorasFiltradas.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Operadora *</p>
            <select value={operadoraSlugModal} onChange={(e) => setOperadoraSlugModal(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontFamily: FONT.body, fontSize: 13, marginBottom: 18, outline: "none" }}>
              <option value="">Selecione a operadora</option>
              {[...operadorasFiltradas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome}</option>
              ))}
            </select>
          </>
        )}

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Tipo *</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TIPOS.map(({ key, label }) => {
            const tcfg = TIPO_CONFIG[key];
            const isActive = tipo === key;
            return (
              <button key={key} onClick={() => setTipo(key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${isActive ? tcfg.tagBorder : t.cardBorder}`, background: isActive ? tcfg.tagBg : "transparent", color: isActive ? tcfg.tagColor(dark) : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>{label}</button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Jogos *</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const jcfg = JOGO_TAG_CONFIG[key];
            const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? jcfg.border : t.cardBorder}`, background: isActive ? jcfg.bg : "transparent", color: isActive ? jcfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>{isActive && <Check size={10} />}{label}</button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Texto *</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={tipo === "script" ? "Olá Jogadores, meu nome é [Nome]..." : tipo === "alerta" ? "Descreva o alerta ou regra operacional..." : "Descreva a orientação para o dealer..."} rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", outline: "none", marginBottom: 18 }} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!podeSalvar || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.azul, color: "#fff", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: podeSalvar && !saving ? "pointer" : "not-allowed", opacity: podeSalvar && !saving ? 1 : 0.55 }}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CAMPANHA (Nova Campanha) ───────────────────────────────────────────
function ModalCampanha({ operadoraSlug, operadorasList, onClose, onSalvo, podeVerOperadora }: {
  operadoraSlug: string;
  operadorasList: { slug: string; nome: string }[];
  onClose: () => void;
  onSalvo: () => void;
  podeVerOperadora: (slug: string) => boolean;
}) {
  const { theme: t, user, isDark } = useApp();
  const dark = isDark ?? false;
  const mostraCampoOperadora = user?.role === "gestor" || user?.role === "admin";
  const [titulo, setTitulo] = useState("");
  const [jogos, setJogos] = useState<JogoTag[]>(["todos"]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [texto, setTexto] = useState("");
  const [operadoraSlugModal, setOperadoraSlugModal] = useState(operadoraSlug === "todas" ? "" : operadoraSlug);
  const [saving, setSaving] = useState(false);

  const operadorasFiltradas = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const operadoraFinal = mostraCampoOperadora ? operadoraSlugModal : operadoraSlug;

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !texto.trim() || !dataInicio || !dataFim || !operadoraFinal || operadoraFinal === "todas") return;
    setSaving(true);
    const payload = { titulo: titulo.trim(), texto: texto.trim(), jogos, data_inicio: dataInicio, data_fim: dataFim, ativo: true, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("roteiro_mesa_campanhas").insert({
      operadora_slug: operadoraFinal,
      ordem: 0,
      created_by: user?.id ?? null,
      ...payload,
    });
    if (error) console.error("[RoteiroMesa] insert campanha:", error.message);
    setSaving(false);
    if (!error) { onSalvo(); onClose(); }
  };

  const podeSalvar = titulo.trim().length > 0 && texto.trim().length > 0 && dataInicio && dataFim && operadoraFinal && operadoraFinal !== "todas";
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, boxSizing: "border-box" as const, outline: "none" };
  const lbl = { fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 520, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND.ciano, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nova Campanha</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        {mostraCampoOperadora && operadorasFiltradas.length > 0 && (
          <>
            <label style={lbl}>Operadora *</label>
            <select value={operadoraSlugModal} onChange={(e) => setOperadoraSlugModal(e.target.value)} style={{ ...inp, marginBottom: 18 }}>
              <option value="">Selecione a operadora</option>
              {[...operadorasFiltradas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome}</option>
              ))}
            </select>
          </>
        )}

        <label style={lbl}>Título *</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder='Ex: "Cashback na Mesa X — Blaze"' style={{ ...inp, marginBottom: 18 }} />

        <p style={lbl}>Jogos *</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const jcfg = JOGO_TAG_CONFIG[key];
            const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? jcfg.border : t.cardBorder}`, background: isActive ? jcfg.bg : "transparent", color: isActive ? jcfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>{isActive && <Check size={10} />}{label}</button>
            );
          })}
        </div>

        <p style={lbl}>Data início *</p>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ ...inp, marginBottom: 18 }} />

        <p style={lbl}>Data fim *</p>
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ ...inp, marginBottom: 18 }} />

        <label style={lbl}>Texto *</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='O que o dealer deve falar...' rows={4} style={{ ...inp, resize: "vertical", marginBottom: 18 }} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!podeSalvar || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.ciano, color: "#0f6a8a", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: podeSalvar && !saving ? "pointer" : "not-allowed", opacity: podeSalvar && !saving ? 1 : 0.55 }}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── FILTER CHIP ─────────────────────────────────────────────────────────────
function FilterChip({ label, active, activeColor, activeBg, activeBorder, onClick, dark }: {
  label: string; active: boolean;
  activeColor: string; activeBg: string; activeBorder: string;
  onClick: () => void; dark: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 13px", borderRadius: 20,
      border: `1.5px solid ${active ? activeBorder : dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
      background: active ? activeBg : "transparent",
      color: active ? activeColor : dark ? "#7c7c9e" : "#666",
      fontSize: 11, fontWeight: 700, fontFamily: FONT.body,
      textTransform: "uppercase", letterSpacing: "0.06em",
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

// ─── ITEM DE SUGESTÃO ─────────────────────────────────────────────────────────
function SugestaoItem({ sugestao, podeExcluir, onExcluir, dark, operadoraNome, operadoraCor }: {
  sugestao: RoteiroSugestao; podeExcluir: boolean;
  onExcluir: (s: RoteiroSugestao) => void;
  dark: boolean; operadoraNome?: string; operadoraCor?: string | null;
}) {
  const tipo      = sugestao.tipo ?? "script";
  const jogosList = sugestao.jogos ?? ["todos"];
  const cfg       = TIPO_CONFIG[tipo];
  const [hover,   setHover] = useState(false);
  const IconComponent = TIPO_ICON[tipo];
  const isOrientacao = tipo === "orientacao";
  const rowBg = isOrientacao
    ? (dark ? "rgba(150,150,170,0.08)" : "rgba(0,0,0,0.04)")
    : cfg.bgColor(dark);
  const borderRightOrientacao = isOrientacao ? `3px solid ${dark ? "rgba(150,150,170,0.40)" : "rgba(107,114,128,0.35)"}` : undefined;

  const identCol: React.CSSProperties = {
    width: ROTEIRO_IDENT_COL_PX,
    minWidth: ROTEIRO_IDENT_COL_PX,
    maxWidth: ROTEIRO_IDENT_COL_PX,
    flex: `0 0 ${ROTEIRO_IDENT_COL_PX}px`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    paddingTop: 2,
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, borderLeft: `3px solid ${cfg.borderColor}`, ...(borderRightOrientacao && { borderRight: borderRightOrientacao }), background: rowBg, transition: "background 0.15s" }}>
      <div style={identCol}>
        <IconComponent size={ROTEIRO_TIPO_ICON_SIZE} color={cfg.tagColor(dark)} strokeWidth={2} aria-hidden />
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: cfg.tagColor(dark),
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: FONT.body,
          textAlign: "center",
          lineHeight: 1.2,
          width: "100%",
          wordBreak: "break-word",
        }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: cfg.textColor(dark), lineHeight: 1.55 }}>{sugestao.texto}</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {operadoraNome && <OperadoraTag label={operadoraNome} corPrimaria={operadoraCor} />}
          {jogosList.map((jogo) => {
            const jcfg = JOGO_TAG_CONFIG[jogo as JogoTag];
            const jogoLabel = JOGOS.find((j) => j.key === jogo)?.label ?? jogo;
            return jcfg ? <TagChip key={jogo} label={jogoLabel} bg={jcfg.bg} color={jcfg.color(dark)} border={jcfg.border} /> : null;
          })}
        </div>
      </div>
      {podeExcluir && (
        <button onClick={() => onExcluir(sugestao)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Excluir sugestão" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, border: `1px solid ${hover ? "rgba(232,64,37,0.4)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`, background: hover ? "rgba(232,64,37,0.12)" : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"), color: hover ? BRAND.vermelho : (dark ? "#8888aa" : "#888"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ─── ITEM DE CAMPANHA ─────────────────────────────────────────────────────────
function CampanhaItem({ campanha, podeExcluir, onExcluir, dark, operadoraNome, operadoraCor }: {
  campanha: RoteiroCampanha; podeExcluir: boolean;
  onExcluir: (c: RoteiroCampanha) => void;
  dark: boolean; operadoraNome?: string; operadoraCor?: string | null;
}) {
  const [hover,    setHover]    = useState(false);
  const cianoText = dark ? "#70cae4" : "#0f6a8a";
  const formatDate = (d?: string) => {
    if (!d) return null;
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, borderLeft: `3px solid ${BRAND.ciano}`, background: dark ? "rgba(112,202,228,0.05)" : "rgba(112,202,228,0.03)", transition: "background 0.15s" }}>
      <div style={{
        width: ROTEIRO_IDENT_COL_PX,
        minWidth: ROTEIRO_IDENT_COL_PX,
        maxWidth: ROTEIRO_IDENT_COL_PX,
        flex: `0 0 ${ROTEIRO_IDENT_COL_PX}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 6,
        paddingTop: 2,
        boxSizing: "border-box",
      }}>
        <Megaphone size={ROTEIRO_TIPO_ICON_SIZE} color={campanha.ativo ? BRAND.ciano : (dark ? "#555" : "#bbb")} strokeWidth={2} aria-hidden />
        <span style={{ fontSize: 9, fontWeight: 700, color: cianoText, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.body, textAlign: "center", lineHeight: 1.2, width: "100%" }}>
          Campanha
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 700, color: campanha.ativo ? cianoText : (dark ? "#555" : "#aaa") }}>{campanha.titulo}</span>
          {!campanha.ativo && <TagChip label="Inativa" bg="rgba(107,114,128,0.12)" color={dark ? "#666" : "#888"} border="rgba(107,114,128,0.20)" />}
        </div>
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#9898be" : "#4a4a6a", lineHeight: 1.55, fontStyle: "italic" }}>"{campanha.texto}"</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {operadoraNome && <OperadoraTag label={operadoraNome} corPrimaria={operadoraCor} />}
          {(campanha.jogos ?? ["todos"]).map((jogo) => {
            const jcfg = JOGO_TAG_CONFIG[jogo as JogoTag];
            const jogoLabel = JOGOS.find((j) => j.key === jogo)?.label ?? jogo;
            return jcfg ? <TagChip key={jogo} label={jogoLabel} bg={jcfg.bg} color={jcfg.color(dark)} border={jcfg.border} /> : null;
          })}
          {(campanha.data_inicio || campanha.data_fim) && (
            <TagChip label={`${formatDate(campanha.data_inicio) ?? "?"} → ${formatDate(campanha.data_fim) ?? "?"}`} bg="rgba(112,202,228,0.10)" color={cianoText} border="rgba(112,202,228,0.25)" />
          )}
        </div>
      </div>
      {podeExcluir && (
        <button onClick={() => onExcluir(campanha)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Excluir campanha" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, border: `1px solid ${hover ? "rgba(232,64,37,0.4)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`, background: hover ? "rgba(232,64,37,0.12)" : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"), color: hover ? BRAND.vermelho : (dark ? "#8888aa" : "#888"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ─── BLOCO DE SUGESTÕES ───────────────────────────────────────────────────────
function BlocoSugestoes({ bloco, operadoraSlug, sugestoes, podeExcluir, podeCriar, onCarregar, dark, operadorasList, podeVerOperadora }: {
  bloco: BlocoRoteiro; operadoraSlug: string | null;
  sugestoes: RoteiroSugestao[]; podeExcluir: boolean; podeCriar: boolean;
  onCarregar: () => void; dark: boolean; operadorasList: { slug: string; nome: string; cor_primaria?: string | null }[];
  podeVerOperadora: (slug: string) => boolean;
}) {
  const { theme: t } = useApp();
  const [modalAberto, setModalAberto] = useState(false);

  const handleExcluir = async (s: RoteiroSugestao) => {
    if (!window.confirm("Excluir este roteiro?")) return;
    const { error } = await supabase.from("roteiro_mesa_sugestoes").delete().eq("id", s.id);
    if (!error) onCarregar();
  };

  const label = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;
  const cfg   = BLOCO_CONFIG[bloco];
  if (!operadoraSlug) return null;

  return (
    <>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: cfg.accent, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cfg.titleColor(dark), fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</h3>
            <span style={{ fontSize: 11, color: t.textMuted, background: dark ? "rgba(74,32,130,0.10)" : "rgba(74,32,130,0.06)", borderRadius: 10, padding: "2px 8px", fontFamily: FONT.body }}>
              {sugestoes.length} {sugestoes.length === 1 ? "item" : "itens"}
            </span>
          </div>
          {podeCriar && (
            <button onClick={() => setModalAberto(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8, border: "none", background: cfg.btnBg, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", letterSpacing: "0.02em" }}>
              <Plus size={12} /> Roteiro
            </button>
          )}
        </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {sugestoes.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: cfg.emptyGradient(dark), border: `1px solid ${cfg.accent}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} color={cfg.accent} strokeWidth={1.5} />
            </div>
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>Nenhuma sugestão cadastrada para este bloco.</p>
          </div>
        ) : (
          sugestoes.map((s) => {
            const op = operadoraSlug === "todas" ? operadorasList.find((o) => o.slug === s.operadora_slug) : undefined;
            return (
              <SugestaoItem key={s.id} sugestao={s} podeExcluir={podeExcluir} onExcluir={handleExcluir} dark={dark} operadoraNome={op?.nome} operadoraCor={op?.cor_primaria} />
            );
          })
        )}
      </div>
    </div>
    {modalAberto && <ModalRoteiro operadoraSlug={operadoraSlug} operadorasList={operadorasList} bloco={bloco} onClose={() => setModalAberto(false)} onSalvo={() => { setModalAberto(false); onCarregar(); }} podeVerOperadora={podeVerOperadora} />}
    </>
  );
}

// ─── BLOCO DE CAMPANHAS ───────────────────────────────────────────────────────
function BlocoCampanhas({ operadoraSlug, campanhas, podeExcluir, podeCriar, onCarregar, dark, operadorasList, podeVerOperadora }: {
  operadoraSlug: string | null; campanhas: RoteiroCampanha[];
  podeExcluir: boolean; podeCriar: boolean;
  onCarregar: () => void; dark: boolean; operadorasList: { slug: string; nome: string; cor_primaria?: string | null }[];
  podeVerOperadora: (slug: string) => boolean;
}) {
  const { theme: t } = useApp();
  const cianoTitle = dark ? "#70cae4" : "#0f6a8a";
  const [modalAberto, setModalAberto] = useState(false);

  const handleExcluir = async (c: RoteiroCampanha) => {
    if (!window.confirm("Excluir esta campanha?")) return;
    const { error } = await supabase.from("roteiro_mesa_campanhas").delete().eq("id", c.id);
    if (!error) onCarregar();
  };

  if (!operadoraSlug) return null;

  return (
    <>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND.ciano, flexShrink: 0 }} />
            <Megaphone size={14} color={cianoTitle} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cianoTitle, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>Campanhas</h3>
            <span style={{ fontSize: 11, color: t.textMuted, background: dark ? "rgba(112,202,228,0.08)" : "rgba(112,202,228,0.06)", borderRadius: 10, padding: "2px 8px", fontFamily: FONT.body }}>
              {campanhas.length} {campanhas.length === 1 ? "item" : "itens"}
            </span>
          </div>
          {podeCriar && (
            <button onClick={() => setModalAberto(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8, border: "none", background: BRAND.ciano, color: "#0f6a8a", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", letterSpacing: "0.02em" }}>
              <Plus size={12} />Nova Campanha
            </button>
          )}
        </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {campanhas.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: dark ? "linear-gradient(135deg,rgba(112,202,228,0.12) 0%,rgba(74,32,130,0.10) 100%)" : "linear-gradient(135deg,rgba(112,202,228,0.07) 0%,rgba(74,32,130,0.05) 100%)", border: `1px solid ${BRAND.ciano}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Megaphone size={20} color={BRAND.ciano} strokeWidth={1.5} />
            </div>
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>Nenhuma campanha cadastrada.</p>
          </div>
        ) : (
          campanhas.map((c) => {
            const op = operadoraSlug === "todas" ? operadorasList.find((o) => o.slug === c.operadora_slug) : undefined;
            return (
              <CampanhaItem key={c.id} campanha={c} podeExcluir={podeExcluir} onExcluir={handleExcluir} dark={dark} operadoraNome={op?.nome} operadoraCor={op?.cor_primaria} />
            );
          })
        )}
      </div>
    </div>
    {modalAberto && <ModalCampanha operadoraSlug={operadoraSlug} operadorasList={operadorasList} onClose={() => setModalAberto(false)} onSalvo={() => { setModalAberto(false); onCarregar(); }} podeVerOperadora={podeVerOperadora} />}
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function RoteiroMesa() {
  const { theme: t, podeVerOperadora, isDark } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("roteiro_mesa");
  const dark = isDark ?? false;

  const [operadorasList,  setOperadorasList]  = useState<{ slug: string; nome: string; cor_primaria?: string | null }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroJogo,      setFiltroJogo]      = useState<JogoTag | "todos">("todos");
  const [filtroTipo,      setFiltroTipo]      = useState<TipoSugestao | "todos">("todos");
  const [sugestoes,       setSugestoes]       = useState<RoteiroSugestao[]>([]);
  const [campanhas,       setCampanhas]       = useState<RoteiroCampanha[]>([]);
  const [loading,         setLoading]         = useState(true);

  const mostrarFiltroOp = showFiltroOperadora;

  const operadoraSlugSelecionada: string | null =
    operadoraSlugsForcado?.length === 1
      ? operadoraSlugsForcado[0]
      : operadoraSlugsForcado?.length
        ? filtroOperadora !== "todas" && operadoraSlugsForcado.includes(filtroOperadora)
          ? filtroOperadora
          : operadoraSlugsForcado[0]
        : filtroOperadora;

  const carregarDados = useCallback(async () => {
    if (!operadoraSlugSelecionada) { setSugestoes([]); setCampanhas([]); setLoading(false); return; }
    setLoading(true);

    let qSug = supabase.from("roteiro_mesa_sugestoes").select("*").order("bloco").order("ordem");
    if (operadoraSlugSelecionada !== "todas") qSug = qSug.eq("operadora_slug", operadoraSlugSelecionada);
    const { data: dataSug } = await qSug;
    setSugestoes((dataSug ?? []) as RoteiroSugestao[]);

    let qCamp = supabase.from("roteiro_mesa_campanhas").select("*").order("ordem");
    if (operadoraSlugSelecionada !== "todas") qCamp = qCamp.eq("operadora_slug", operadoraSlugSelecionada);
    const { data: dataCamp } = await qCamp;
    setCampanhas((dataCamp ?? []) as RoteiroCampanha[]);

    setLoading(false);
  }, [operadoraSlugSelecionada]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome, cor_primaria").eq("ativo", true).order("nome")
      .then(({ data }) => setOperadorasList(data ?? []));
  }, []);

  useEffect(() => {
    if (operadoraSlugsForcado?.length && filtroOperadora === "todas") {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [operadoraSlugsForcado]);

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Roteiro de Mesa.
      </div>
    );
  }

  const opcoesFiltro = operadorasList.filter((o) => podeVerOperadora(o.slug));

  const filtrarSugestoes = (lista: RoteiroSugestao[]) =>
    lista.filter((s) => {
      const jogosList = s.jogos ?? ["todos"];
      const passaJogo = filtroJogo === "todos" || jogosList.includes(filtroJogo) || jogosList.includes("todos");
      const passaTipo = filtroTipo === "todos" || (s.tipo ?? "script") === filtroTipo;
      return passaJogo && passaTipo;
    });

  const filtrarCampanhas = (lista: RoteiroCampanha[]) =>
    lista.filter((c) => {
      const jogosList = c.jogos ?? ["todos"];
      return filtroJogo === "todos" || jogosList.includes(filtroJogo) || jogosList.includes("todos");
    });

  const sugestoesPorBloco = (bloco: BlocoRoteiro) =>
    filtrarSugestoes(sugestoes.filter((s) => s.bloco === bloco));

  return (
    <div className="app-page-shell">

      {/* ── HEADER — idêntico ao padrão Agenda de Lives ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: brand.primaryIconColor, flexShrink: 0,
          }}>
            <GiNotebook size={16} />
          </span>
          <h1 style={{
            fontSize: 18, fontWeight: 800, color: brand.primary,
            fontFamily: FONT_TITLE, margin: 0,
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            Roteiro de Mesa
          </h1>
        </div>

      </div>

      {/* ── BLOCO DE FILTROS — tudo em uma linha, operadora à direita com ícone ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ borderRadius: 14, border: brand.primaryTransparentBorder, background: brand.primaryTransparentBg, padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            {/* Centro: Jogo + Tipo centralizados; Operadora à direita */}
            <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", flex: 1, justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>Jogo</span>
                {JOGOS.map(({ key, label }) => {
                  const jcfg = JOGO_TAG_CONFIG[key];
                  return (
                    <FilterChip key={key} label={label} active={filtroJogo === key} activeColor={jcfg.color(dark)} activeBg={jcfg.bg} activeBorder={jcfg.border} onClick={() => setFiltroJogo(key)} dark={dark} />
                  );
                })}
              </div>
              <div style={{ width: 1, height: 24, background: t.cardBorder, flexShrink: 0, margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>Tipo</span>
                <FilterChip label="Todos" active={filtroTipo === "todos"} activeColor={dark ? "#b08aee" : "#3a1868"} activeBg="rgba(74,32,130,0.15)" activeBorder={BRAND.roxoBorder} onClick={() => setFiltroTipo("todos")} dark={dark} />
                {TIPOS.map(({ key, label }) => {
                  const cfg = TIPO_CONFIG[key];
                  return (
                    <FilterChip key={key} label={label} active={filtroTipo === key} activeColor={cfg.tagColor(dark)} activeBg={cfg.tagBg} activeBorder={cfg.tagBorder} onClick={() => setFiltroTipo(key)} dark={dark} />
                  );
                })}
              </div>
            </div>
            {/* Direita: Operadora (só quando showFiltroOperadora; não aparece para perfil Operador) */}
            {mostrarFiltroOp && opcoesFiltro.length > 0 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={15} />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={{
                    padding: "6px 14px 6px 32px", borderRadius: 999,
                    border: `1px solid ${filtroOperadora !== "todas" ? brand.accent : t.cardBorder}`,
                    background: filtroOperadora !== "todas" ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxo}18`) : (t.inputBg ?? t.cardBg),
                    color: filtroOperadora !== "todas" ? brand.accent : t.textMuted,
                    fontSize: 13, fontWeight: filtroOperadora !== "todas" ? 700 : 400,
                    fontFamily: FONT.body, cursor: "pointer", outline: "none", appearance: "none",
                  }}
                >
                  {!operadoraSlugsForcado?.length && <option value="todas">Todas as operadoras</option>}
                  {[...opcoesFiltro]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ESTADO: SEM OPERADORA ── */}
      {!operadoraSlugSelecionada && opcoesFiltro.length > 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: dark ? "linear-gradient(135deg,rgba(30,54,248,0.15) 0%,rgba(74,32,130,0.15) 100%)" : "linear-gradient(135deg,rgba(30,54,248,0.07) 0%,rgba(74,32,130,0.07) 100%)", border: `1px solid ${BRAND.azulBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={22} color={dark ? "#7b95ff" : BRAND.azul} strokeWidth={1.5} />
          </div>
          <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 14, margin: 0 }}>
            Selecione uma operadora para ver e gerenciar os roteiros.
          </p>
        </div>
      )}

      {/* ── BLOCOS DE CONTEÚDO ── */}
      {operadoraSlugSelecionada && (
        loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <BlocoCampanhas
              operadoraSlug={operadoraSlugSelecionada}
              campanhas={filtrarCampanhas(campanhas)}
              podeExcluir={perm.canExcluirOk}
              podeCriar={perm.canCriarOk}
              onCarregar={carregarDados}
              dark={dark}
              operadorasList={operadorasList}
              podeVerOperadora={podeVerOperadora}
            />
            {BLOCOS.map(({ key }) => (
              <BlocoSugestoes
                key={key} bloco={key}
                operadoraSlug={operadoraSlugSelecionada}
                sugestoes={sugestoesPorBloco(key)}
                podeExcluir={perm.canExcluirOk}
                podeCriar={perm.canCriarOk}
                onCarregar={carregarDados}
                dark={dark}
                operadorasList={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            ))}
          </div>
        )
      )}

    </div>
  );
}
