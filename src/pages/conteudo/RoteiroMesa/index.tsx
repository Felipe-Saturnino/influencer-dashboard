import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { Pencil, Plus, X, Check, BookOpen, Megaphone } from "lucide-react";
import { GiNotebook, GiShield } from "react-icons/gi";

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
    borderColor: "rgba(255,255,255,0.10)",
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

// ─── MODAL "+ ROTEIROS" (adicionar roteiro do bloco de filtro) ─────────────────
function ModalRoteirosNovo({ operadoraSlugInicial, operadoraLocked, operadorasList, onClose, onSalvo }: {
  operadoraSlugInicial: string;
  operadoraLocked: boolean;
  operadorasList: { slug: string; nome: string }[];
  onClose: () => void; onSalvo: () => void;
}) {
  const { theme: t, isDark } = useApp();
  const dark = isDark ?? false;
  const [operadoraSlug, setOperadoraSlug] = useState(operadoraSlugInicial && operadoraSlugInicial !== "todas" ? operadoraSlugInicial : (operadorasList[0]?.slug ?? ""));
  const [tipo,       setTipo]       = useState<TipoSugestao>("script");
  const [momento,    setMomento]    = useState<BlocoRoteiro>("abertura");
  const [jogos,      setJogos]      = useState<JogoTag[]>(["todos"]);
  const [texto,      setTexto]      = useState("");
  const [saving,     setSaving]    = useState(false);

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem  = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!texto.trim()) return;
    const opSlug = operadoraLocked || operadoraSlugInicial !== "todas" ? operadoraSlugInicial : operadoraSlug;
    if (!opSlug || opSlug === "todas") return;
    setSaving(true);
    const payload = { texto: texto.trim(), tipo, jogos, ordem: 0 };
    const { error } = await supabase.from("roteiro_mesa_sugestoes").insert({ operadora_slug: opSlug, bloco: momento, ...payload });
    if (error) console.error("[RoteiroMesa] insert roteiro:", error.message);
    setSaving(false); onSalvo(); onClose();
  };

  const opSlugEfetivo = operadoraLocked || operadoraSlugInicial !== "todas" ? operadoraSlugInicial : operadoraSlug;
  const podeSalvar = !!texto.trim() && opSlugEfetivo && opSlugEfetivo !== "todas";

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" as const, outline: "none" };
  const lbl = { fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 500, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND.azul, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>+ Roteiros</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        {!operadoraLocked && operadorasList.length > 1 && (
          <>
            <label style={lbl}>Operadora</label>
            <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={{ ...inp, marginBottom: 18, cursor: "pointer" }}>
              <option value="">Selecione uma operadora...</option>
              {operadorasList.map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
          </>
        )}

        <label style={lbl}>Tipo</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TIPOS.map(({ key, label }) => {
            const cfg = TIPO_CONFIG[key]; const isActive = tipo === key;
            return (
              <button key={key} onClick={() => setTipo(key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${isActive ? cfg.tagBorder : t.cardBorder}`, background: isActive ? cfg.tagBg : "transparent", color: isActive ? cfg.tagColor(dark) : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                {label}
              </button>
            );
          })}
        </div>

        <label style={lbl}>Momento</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {BLOCOS.map(({ key, label }) => {
            const cfg = BLOCO_CONFIG[key]; const isActive = momento === key;
            return (
              <button key={key} onClick={() => setMomento(key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${isActive ? cfg.accent + "80" : t.cardBorder}`, background: isActive ? cfg.accent + "18" : "transparent", color: isActive ? cfg.accent : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                {label}
              </button>
            );
          })}
        </div>

        <label style={lbl}>Aplicável ao(s) Jogo(s)</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const cfg = JOGO_TAG_CONFIG[key]; const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? cfg.border : t.cardBorder}`, background: isActive ? cfg.bg : "transparent", color: isActive ? cfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {isActive && <Check size={10} />}{label}
              </button>
            );
          })}
        </div>

        <label style={lbl}>Texto</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='Descreva o roteiro...' rows={4} style={{ ...inp, resize: "vertical", minHeight: 100 }} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!podeSalvar || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.azul, color: "#fff", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: podeSalvar && !saving ? "pointer" : "not-allowed", opacity: podeSalvar && !saving ? 1 : 0.55, transition: "opacity 0.15s" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL "NOVA CAMPANHA" (do bloco de filtro) ─────────────────────────────────
function ModalNovaCampanhaFiltro({ operadoraSlugInicial, operadoraLocked, operadorasList, onClose, onSalvo }: {
  operadoraSlugInicial: string;
  operadoraLocked: boolean;
  operadorasList: { slug: string; nome: string }[];
  onClose: () => void; onSalvo: () => void;
}) {
  const { theme: t, isDark } = useApp();
  const dark = isDark ?? false;
  const [operadoraSlug, setOperadoraSlug] = useState(operadoraSlugInicial && operadoraSlugInicial !== "todas" ? operadoraSlugInicial : (operadorasList[0]?.slug ?? ""));
  const [jogos,        setJogos]        = useState<JogoTag[]>(["todos"]);
  const [dataInicio,   setDataInicio]  = useState("");
  const [dataFim,      setDataFim]    = useState("");
  const [texto,        setTexto]       = useState("");
  const [saving,       setSaving]      = useState(false);

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem  = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!texto.trim()) return;
    const opSlug = operadoraLocked || operadoraSlugInicial !== "todas" ? operadoraSlugInicial : operadoraSlug;
    if (!opSlug || opSlug === "todas") return;
    setSaving(true);
    const titulo = texto.trim().slice(0, 60) || "Nova campanha";
    const payload = { titulo, texto: texto.trim(), jogos, data_inicio: dataInicio || null, data_fim: dataFim || null, ativo: true, ordem: 0 };
    const { error } = await supabase.from("roteiro_mesa_campanhas").insert({ operadora_slug: opSlug, ...payload });
    if (error) console.error("[RoteiroMesa] insert campanha:", error.message);
    setSaving(false); onSalvo(); onClose();
  };

  const opSlugEfetivo = operadoraLocked || operadoraSlugInicial !== "todas" ? operadoraSlugInicial : operadoraSlug;
  const podeSalvar = !!texto.trim() && opSlugEfetivo && opSlugEfetivo !== "todas";

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" as const, outline: "none" };
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

        {!operadoraLocked && operadorasList.length > 1 && (
          <>
            <label style={lbl}>Operadora</label>
            <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={{ ...inp, marginBottom: 18, cursor: "pointer" }}>
              <option value="">Selecione uma operadora...</option>
              {operadorasList.map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
          </>
        )}

        <label style={lbl}>Aplicável ao(s) Jogo(s)</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const cfg = JOGO_TAG_CONFIG[key]; const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? cfg.border : t.cardBorder}`, background: isActive ? cfg.bg : "transparent", color: isActive ? cfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {isActive && <Check size={10} />}{label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div>
            <label style={lbl}>Data de início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Data de fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inp} />
          </div>
        </div>

        <label style={lbl}>Texto</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='Descreva a campanha...' rows={4} style={{ ...inp, resize: "vertical", minHeight: 100 }} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!podeSalvar || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.ciano, color: "#0f6a8a", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: podeSalvar && !saving ? "pointer" : "not-allowed", opacity: podeSalvar && !saving ? 1 : 0.55, transition: "opacity 0.15s" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ROTEIRO (editar / adicionar de dentro do bloco) ──────────────────────
function ModalSugestao({ operadoraSlug, bloco, editando, onClose, onSalvo }: {
  operadoraSlug: string; bloco: BlocoRoteiro;
  editando: RoteiroSugestao | null;
  onClose: () => void; onSalvo: () => void;
}) {
  const { theme: t, isDark } = useApp();
  const dark = isDark ?? false;
  const [texto,  setTexto]  = useState(editando?.texto ?? "");
  const [tipo,   setTipo]   = useState<TipoSugestao>(editando?.tipo ?? "script");
  const [jogos,  setJogos]  = useState<JogoTag[]>(editando?.jogos ?? ["todos"]);
  const [saving, setSaving] = useState(false);

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem  = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    const payload = { texto: texto.trim(), tipo, jogos, updated_at: new Date().toISOString() };
    if (editando) {
      const { error } = await supabase.from("roteiro_mesa_sugestoes").update(payload).eq("id", editando.id);
      if (error) console.error("[RoteiroMesa] update:", error.message);
    } else {
      const { error } = await supabase.from("roteiro_mesa_sugestoes").insert({ operadora_slug: operadoraSlug, bloco, ordem: 0, ...payload });
      if (error) console.error("[RoteiroMesa] insert:", error.message);
    }
    setSaving(false); onSalvo(); onClose();
  };

  const blocoLabel  = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;
  const blocoAccent = BLOCO_CONFIG[bloco].accent;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 500, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: blocoAccent, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {editando ? "Editar" : "Adicionar"} — {blocoLabel}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Tipo</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TIPOS.map(({ key, label }) => {
            const cfg = TIPO_CONFIG[key]; const isActive = tipo === key;
            return (
              <button key={key} onClick={() => setTipo(key)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${isActive ? cfg.tagBorder : t.cardBorder}`, background: isActive ? cfg.tagBg : "transparent", color: isActive ? cfg.tagColor(dark) : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                {label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Aplicável a</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const cfg = JOGO_TAG_CONFIG[key]; const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? cfg.border : t.cardBorder}`, background: isActive ? cfg.bg : "transparent", color: isActive ? cfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {isActive && <Check size={10} />}{label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Texto</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={tipo === "script" ? '"Olá Jogadores, meu nome é [Nome]..."' : tipo === "alerta" ? "Descreva o alerta ou regra operacional..." : "Descreva a orientação para o dealer..."} rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", outline: "none" }} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!texto.trim() || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.azul, color: "#fff", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: texto.trim() && !saving ? "pointer" : "not-allowed", opacity: texto.trim() && !saving ? 1 : 0.55, transition: "opacity 0.15s" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CAMPANHA ───────────────────────────────────────────────────────────
function ModalCampanha({ operadoraSlug, editando, onClose, onSalvo }: {
  operadoraSlug: string;
  editando: RoteiroCampanha | null;
  onClose: () => void; onSalvo: () => void;
}) {
  const { theme: t, isDark } = useApp();
  const dark = isDark ?? false;
  const [titulo,     setTitulo]     = useState(editando?.titulo ?? "");
  const [texto,      setTexto]      = useState(editando?.texto ?? "");
  const [jogos,      setJogos]      = useState<JogoTag[]>(editando?.jogos ?? ["todos"]);
  const [dataInicio, setDataInicio] = useState(editando?.data_inicio ?? "");
  const [dataFim,    setDataFim]    = useState(editando?.data_fim ?? "");
  const [ativo,      setAtivo]      = useState(editando?.ativo ?? true);
  const [saving,     setSaving]     = useState(false);

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") { setJogos(["todos"]); return; }
    setJogos((prev) => {
      const sem  = prev.filter((j) => j !== "todos");
      const next = sem.includes(jogo) ? sem.filter((j) => j !== jogo) : [...sem, jogo];
      return next.length === 0 ? ["todos"] : next;
    });
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !texto.trim()) return;
    setSaving(true);
    const payload = { titulo: titulo.trim(), texto: texto.trim(), jogos, data_inicio: dataInicio || null, data_fim: dataFim || null, ativo, updated_at: new Date().toISOString() };
    if (editando) {
      const { error } = await supabase.from("roteiro_mesa_campanhas").update(payload).eq("id", editando.id);
      if (error) console.error("[RoteiroMesa] campanha update:", error.message);
    } else {
      const { error } = await supabase.from("roteiro_mesa_campanhas").insert({ operadora_slug: operadoraSlug, ordem: 0, ...payload });
      if (error) console.error("[RoteiroMesa] campanha insert:", error.message);
    }
    setSaving(false); onSalvo(); onClose();
  };

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" as const, outline: "none" };
  const lbl = { fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 520, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND.ciano, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>{editando ? "Editar" : "Nova"} Campanha</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        <label style={lbl}>Título da Campanha</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder='Ex: "Cashback na Mesa X — Blaze"' style={{ ...inp, marginBottom: 18 }} />

        <p style={lbl}>Aplicável a</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const cfg = JOGO_TAG_CONFIG[key]; const isActive = jogos.includes(key);
            return (
              <button key={key} onClick={() => toggleJogo(key)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${isActive ? cfg.border : t.cardBorder}`, background: isActive ? cfg.bg : "transparent", color: isActive ? cfg.color(dark) : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                {isActive && <Check size={10} />}{label}
              </button>
            );
          })}
        </div>

        <label style={lbl}>O que o dealer deve falar</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='"Para quem entrar na mesa X hoje da Blaze, poderá ter Cashback de 10%!"' rows={4} style={{ ...inp, resize: "vertical", marginBottom: 18 }} />

        <p style={lbl}>Período (opcional)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div>
            <p style={{ ...lbl, fontSize: 9, marginBottom: 5 }}>Data início</p>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inp} />
          </div>
          <div>
            <p style={{ ...lbl, fontSize: 9, marginBottom: 5 }}>Data fim</p>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setAtivo(!ativo)} style={{ width: 38, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: ativo ? BRAND.ciano : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"), position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: ativo ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </button>
          <span style={{ fontSize: 12, color: ativo ? BRAND.ciano : t.textMuted, fontFamily: FONT.body, fontWeight: 600 }}>{ativo ? "Campanha ativa" : "Campanha inativa"}</span>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSalvar} disabled={!titulo.trim() || !texto.trim() || saving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: BRAND.ciano, color: "#0f6a8a", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: titulo.trim() && texto.trim() && !saving ? "pointer" : "not-allowed", opacity: titulo.trim() && texto.trim() && !saving ? 1 : 0.55, transition: "opacity 0.15s" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL SELEÇÃO DE BLOCO ───────────────────────────────────────────────────
type BlocoOuCampanha = BlocoRoteiro | "campanha";

function ModalNovoRoteiro({ operadoraSlug, operadorasList, onClose, onSalvo, dark }: {
  operadoraSlug: string;
  operadorasList: { slug: string; nome: string }[];
  onClose: () => void; onSalvo: () => void; dark: boolean;
}) {
  const { theme: t } = useApp();
  const [etapa,    setEtapa]    = useState<"bloco" | "roteiro" | "campanha">("bloco");
  const [bloco,    setBloco]    = useState<BlocoOuCampanha>("abertura");
  const [opSlug,   setOpSlug]   = useState<string>(operadoraSlug !== "todas" ? operadoraSlug : (operadorasList[0]?.slug ?? ""));

  const OPCOES: { key: BlocoOuCampanha; label: string; accent: string; icon: React.ReactNode }[] = [
    { key: "abertura",     label: "Abertura",       accent: BRAND.azul,    icon: <BookOpen size={14} />  },
    { key: "durante_jogo", label: "Durante o Jogo", accent: BRAND.vermelho, icon: <BookOpen size={14} /> },
    { key: "fechamento",   label: "Fechamento",     accent: BRAND.roxo,    icon: <BookOpen size={14} />  },
    { key: "campanha",     label: "Campanha",       accent: BRAND.ciano,   icon: <Megaphone size={14} />},
  ];

  if (etapa === "roteiro" && bloco !== "campanha") {
    return <ModalSugestao operadoraSlug={opSlug} bloco={bloco as BlocoRoteiro} editando={null} onClose={onClose} onSalvo={onSalvo} />;
  }
  if (etapa === "campanha") {
    return <ModalCampanha operadoraSlug={opSlug} editando={null} onClose={onClose} onSalvo={onSalvo} />;
  }

  const accentAtual = OPCOES.find((o) => o.key === bloco)?.accent ?? BRAND.azul;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "24px 24px 20px", maxWidth: 440, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: BRAND.azul, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>Novo Roteiro</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
        </div>

        {operadoraSlug === "todas" && operadorasList.length > 1 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Operadora</p>
            <select value={opSlug} onChange={(e) => setOpSlug(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${opSlug ? BRAND.roxo + "80" : t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontWeight: 500, fontFamily: FONT.body, cursor: "pointer", outline: "none", marginBottom: 18 }}>
              <option value="">Selecione uma operadora...</option>
              {operadorasList.map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
          </>
        )}

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: FONT.body }}>Tipo de roteiro</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {OPCOES.map(({ key, label, accent, icon }) => {
            const isActive = bloco === key;
            return (
              <button key={key} onClick={() => setBloco(key)} style={{ padding: "12px 10px", borderRadius: 10, border: `1.5px solid ${isActive ? accent + "80" : t.cardBorder}`, background: isActive ? accent + "12" : "transparent", color: isActive ? accent : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                {icon}{label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => bloco === "campanha" ? setEtapa("campanha") : setEtapa("roteiro")} disabled={!opSlug} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: accentAtual, color: bloco === "campanha" ? "#0f6a8a" : "#fff", fontFamily: FONT.body, fontSize: 13, fontWeight: 700, cursor: opSlug ? "pointer" : "not-allowed", opacity: opSlug ? 1 : 0.5, transition: "opacity 0.15s" }}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM DE SUGESTÃO ─────────────────────────────────────────────────────────
function SugestaoItem({ sugestao, podeEditar, onEdit, dark, operadoraNome }: {
  sugestao: RoteiroSugestao; podeEditar: boolean;
  onEdit: (s: RoteiroSugestao) => void;
  dark: boolean; operadoraNome?: string;
}) {
  const tipo      = sugestao.tipo ?? "script";
  const jogosList = sugestao.jogos ?? ["todos"];
  const cfg       = TIPO_CONFIG[tipo];
  const [hover,   setHover] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, borderLeft: `3px solid ${cfg.borderColor}`, background: cfg.bgColor(dark), transition: "background 0.15s" }}>
      {tipo === "script" && (
        <span style={{ fontSize: 22, color: "rgba(30,54,248,0.3)", flexShrink: 0, fontFamily: "Georgia, serif", lineHeight: 1.1, marginTop: -2, userSelect: "none" }}>"</span>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: FONT.body, fontSize: tipo === "script" ? 14 : 13, color: cfg.textColor(dark), lineHeight: 1.55 }}>{sugestao.texto}</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {operadoraNome && <TagChip label={operadoraNome} bg="rgba(74,32,130,0.12)" color={dark ? "#b08aee" : "#3a1868"} border="rgba(74,32,130,0.25)" />}
          {jogosList.map((jogo) => {
            const jcfg = JOGO_TAG_CONFIG[jogo as JogoTag];
            const jogoLabel = JOGOS.find((j) => j.key === jogo)?.label ?? jogo;
            return jcfg ? <TagChip key={jogo} label={jogoLabel} bg={jcfg.bg} color={jcfg.color(dark)} border={jcfg.border} /> : null;
          })}
          <TagChip label={cfg.label} bg={cfg.tagBg} color={cfg.tagColor(dark)} border={cfg.tagBorder} />
        </div>
      </div>
      {podeEditar && (
        <button onClick={() => onEdit(sugestao)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Editar sugestão" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, border: `1px solid ${hover ? (dark ? "rgba(124,58,237,0.3)" : "rgba(74,32,130,0.2)") : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`, background: hover ? (dark ? "rgba(124,58,237,0.15)" : "rgba(74,32,130,0.08)") : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"), color: hover ? (dark ? "#b08aee" : "#4a2082") : (dark ? "#8888aa" : "#888"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

// ─── ITEM DE CAMPANHA ─────────────────────────────────────────────────────────
function CampanhaItem({ campanha, podeEditar, onEdit, dark, operadoraNome }: {
  campanha: RoteiroCampanha; podeEditar: boolean;
  onEdit: (c: RoteiroCampanha) => void;
  dark: boolean; operadoraNome?: string;
}) {
  const [hover,    setHover]    = useState(false);
  const cianoText = dark ? "#70cae4" : "#0f6a8a";
  const formatDate = (d?: string) => {
    if (!d) return null;
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, borderLeft: `3px solid ${BRAND.ciano}`, background: dark ? "rgba(112,202,228,0.05)" : "rgba(112,202,228,0.03)", transition: "background 0.15s" }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Megaphone size={16} color={campanha.ativo ? BRAND.ciano : (dark ? "#555" : "#bbb")} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 700, color: campanha.ativo ? cianoText : (dark ? "#555" : "#aaa") }}>{campanha.titulo}</span>
          {!campanha.ativo && <TagChip label="Inativa" bg="rgba(107,114,128,0.12)" color={dark ? "#666" : "#888"} border="rgba(107,114,128,0.20)" />}
        </div>
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#9898be" : "#4a4a6a", lineHeight: 1.55, fontStyle: "italic" }}>"{campanha.texto}"</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {operadoraNome && <TagChip label={operadoraNome} bg="rgba(74,32,130,0.12)" color={dark ? "#b08aee" : "#3a1868"} border="rgba(74,32,130,0.25)" />}
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
      {podeEditar && (
        <button onClick={() => onEdit(campanha)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Editar campanha" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, border: `1px solid ${hover ? "rgba(112,202,228,0.35)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`, background: hover ? "rgba(112,202,228,0.10)" : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"), color: hover ? cianoText : (dark ? "#8888aa" : "#888"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

// ─── BLOCO DE SUGESTÕES ───────────────────────────────────────────────────────
function BlocoSugestoes({ bloco, operadoraSlug, sugestoes, podeEditar, podeAdicionar, onCarregar, dark, operadorasList }: {
  bloco: BlocoRoteiro; operadoraSlug: string | null;
  sugestoes: RoteiroSugestao[]; podeEditar: boolean; podeAdicionar: boolean;
  onCarregar: () => void; dark: boolean; operadorasList: { slug: string; nome: string }[];
}) {
  const { theme: t } = useApp();
  const [modalEditando,  setModalEditando]  = useState<RoteiroSugestao | null>(null);
  const [modalAdicionar, setModalAdicionar] = useState(false);
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
          {podeAdicionar && (
            <button onClick={() => setModalAdicionar(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8, border: "none", background: cfg.btnBg, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", letterSpacing: "0.02em" }}>
              <Plus size={12} />Adicionar
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
              {podeAdicionar && (
                <button onClick={() => setModalAdicionar(true)} style={{ marginTop: 2, padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${cfg.accent}`, background: `${cfg.accent}10`, color: cfg.titleColor(dark), fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}>
                  <Plus size={12} />Criar primeira sugestão
                </button>
              )}
            </div>
          ) : (
            sugestoes.map((s) => (
              <SugestaoItem key={s.id} sugestao={s} podeEditar={podeEditar} onEdit={setModalEditando} dark={dark} operadoraNome={operadoraSlug === "todas" ? operadorasList.find((o) => o.slug === s.operadora_slug)?.nome : undefined} />
            ))
          )}
        </div>
      </div>
      {modalEditando && <ModalSugestao operadoraSlug={modalEditando.operadora_slug} bloco={bloco} editando={modalEditando} onClose={() => setModalEditando(null)} onSalvo={onCarregar} />}
      {modalAdicionar && operadoraSlug !== "todas" && <ModalSugestao operadoraSlug={operadoraSlug} bloco={bloco} editando={null} onClose={() => setModalAdicionar(false)} onSalvo={() => { setModalAdicionar(false); onCarregar(); }} />}
    </>
  );
}

// ─── BLOCO DE CAMPANHAS ───────────────────────────────────────────────────────
function BlocoCampanhas({ operadoraSlug, campanhas, podeEditar, podeAdicionar, onCarregar, dark, operadorasList }: {
  operadoraSlug: string | null; campanhas: RoteiroCampanha[];
  podeEditar: boolean; podeAdicionar: boolean;
  onCarregar: () => void; dark: boolean; operadorasList: { slug: string; nome: string }[];
}) {
  const { theme: t } = useApp();
  const [modalEditando,  setModalEditando]  = useState<RoteiroCampanha | null>(null);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const cianoTitle = dark ? "#70cae4" : "#0f6a8a";
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
          {podeAdicionar && (
            <button onClick={() => setModalAdicionar(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8, border: "none", background: BRAND.ciano, color: "#0f6a8a", fontSize: 11, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", letterSpacing: "0.02em" }}>
              <Plus size={12} />Adicionar
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
              {podeAdicionar && (
                <button onClick={() => setModalAdicionar(true)} style={{ marginTop: 2, padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${BRAND.ciano}`, background: `${BRAND.ciano}10`, color: cianoTitle, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}>
                  <Plus size={12} />Criar primeira campanha
                </button>
              )}
            </div>
          ) : (
            campanhas.map((c) => (
              <CampanhaItem key={c.id} campanha={c} podeEditar={podeEditar} onEdit={setModalEditando} dark={dark} operadoraNome={operadoraSlug === "todas" ? operadorasList.find((o) => o.slug === c.operadora_slug)?.nome : undefined} />
            ))
          )}
        </div>
      </div>
      {modalEditando && <ModalCampanha operadoraSlug={modalEditando.operadora_slug} editando={modalEditando} onClose={() => setModalEditando(null)} onSalvo={onCarregar} />}
      {modalAdicionar && operadoraSlug !== "todas" && <ModalCampanha operadoraSlug={operadoraSlug} editando={null} onClose={() => setModalAdicionar(false)} onSalvo={() => { setModalAdicionar(false); onCarregar(); }} />}
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

  const [operadorasList,  setOperadorasList]  = useState<{ slug: string; nome: string }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroJogo,      setFiltroJogo]      = useState<JogoTag | "todos">("todos");
  const [filtroTipo,      setFiltroTipo]      = useState<TipoSugestao | "todos">("todos");
  const [sugestoes,       setSugestoes]       = useState<RoteiroSugestao[]>([]);
  const [campanhas,       setCampanhas]       = useState<RoteiroCampanha[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [modalNovo,       setModalNovo]       = useState(false);
  const [modalRoteiros,   setModalRoteiros]   = useState(false);
  const [modalCampanha,   setModalCampanha]   = useState(false);

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
    supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome")
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

  const podeAdicionarGlobal =
    perm.canEditarOk && (operadoraSlugSelecionada !== "todas" || opcoesFiltro.length > 0);

  const slugParaModal =
    operadoraSlugSelecionada && operadoraSlugSelecionada !== "todas"
      ? operadoraSlugSelecionada
      : "todas";

  return (
    <div style={{ padding: "20px 24px 48px" }}>

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
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: brand.blockBg, padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            {/* Esquerda: Jogo + Tipo + Botões */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>Jogo</span>
                {JOGOS.map(({ key, label }) => {
                  const jcfg = JOGO_TAG_CONFIG[key];
                  return (
                    <FilterChip key={key} label={label} active={filtroJogo === key} activeColor={jcfg.color(dark)} activeBg={jcfg.bg} activeBorder={jcfg.border} onClick={() => setFiltroJogo(key)} dark={dark} />
                  );
                })}
              </div>
              <div style={{ width: 1, height: 24, background: t.cardBorder, flexShrink: 0 }} />
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
              {podeAdicionarGlobal && (
                <>
                  <div style={{ width: 1, height: 24, background: t.cardBorder, flexShrink: 0 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setModalRoteiros(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: brand.useBrand ? "var(--brand-accent)" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                      <Plus size={14} />+ Roteiros
                    </button>
                    <button onClick={() => setModalCampanha(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${BRAND.ciano}`, background: "rgba(112,202,228,0.12)", color: BRAND.ciano, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                      <Megaphone size={14} />Nova Campanha
                    </button>
                  </div>
                </>
              )}
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
            {BLOCOS.map(({ key }) => (
              <BlocoSugestoes
                key={key} bloco={key}
                operadoraSlug={operadoraSlugSelecionada}
                sugestoes={sugestoesPorBloco(key)}
                podeEditar={perm.canEditarOk}
                podeAdicionar={perm.canEditarOk && operadoraSlugSelecionada !== "todas"}
                onCarregar={carregarDados}
                dark={dark}
                operadorasList={operadorasList}
              />
            ))}
            <BlocoCampanhas
              operadoraSlug={operadoraSlugSelecionada}
              campanhas={filtrarCampanhas(campanhas)}
              podeEditar={perm.canEditarOk}
              podeAdicionar={perm.canEditarOk && operadoraSlugSelecionada !== "todas"}
              onCarregar={carregarDados}
              dark={dark}
              operadorasList={operadorasList}
            />
          </div>
        )
      )}

      {/* Modais do bloco de filtro */}
      {modalRoteiros && (
        <ModalRoteirosNovo
          operadoraSlugInicial={operadoraSlugSelecionada ?? ""}
          operadoraLocked={!!operadoraSlugsForcado?.length}
          operadorasList={opcoesFiltro}
          onClose={() => setModalRoteiros(false)}
          onSalvo={() => { setModalRoteiros(false); carregarDados(); }}
        />
      )}
      {modalCampanha && (
        <ModalNovaCampanhaFiltro
          operadoraSlugInicial={operadoraSlugSelecionada ?? ""}
          operadoraLocked={!!operadoraSlugsForcado?.length}
          operadorasList={opcoesFiltro}
          onClose={() => setModalCampanha(false)}
          onSalvo={() => { setModalCampanha(false); carregarDados(); }}
        />
      )}

      {/* Modal global (legado - Novo Roteiro) */}
      {modalNovo && (
        <ModalNovoRoteiro
          operadoraSlug={slugParaModal}
          operadorasList={opcoesFiltro}
          dark={dark}
          onClose={() => setModalNovo(false)}
          onSalvo={() => { setModalNovo(false); carregarDados(); }}
        />
      )}
    </div>
  );
}
