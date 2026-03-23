import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { Pencil, Plus, X, Check } from "lucide-react";
import { GiNotebook } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  azul: "#1e36f8",
  azulLight: "rgba(30,54,248,0.12)",
  azulBorder: "rgba(30,54,248,0.3)",
  vermelho: "#e84025",
  vermelhoLight: "rgba(232,64,37,0.1)",
  vermelhoBorder: "rgba(232,64,37,0.3)",
  roxo: "#4a2082",
  roxoLight: "rgba(74,32,130,0.15)",
  roxoBorder: "rgba(74,32,130,0.35)",
  roxoVivo: "#7c3aed",
  ciano: "#70cae4",
  cianoLight: "rgba(112,202,228,0.1)",
  cianoBorder: "rgba(112,202,228,0.25)",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export type BlocoRoteiro = "abertura" | "durante_jogo" | "fechamento";
export type TipoSugestao = "script" | "orientacao" | "alerta";
export type JogoTag = "todos" | "blackjack" | "roleta" | "baccarat";

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

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const BLOCOS: { key: BlocoRoteiro; label: string }[] = [
  { key: "abertura", label: "Abertura" },
  { key: "durante_jogo", label: "Durante o Jogo" },
  { key: "fechamento", label: "Fechamento" },
];

const JOGOS: { key: JogoTag; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "blackjack", label: "BlackJack" },
  { key: "roleta", label: "Roleta" },
  { key: "baccarat", label: "Baccarat" },
];

const TIPOS: { key: TipoSugestao; label: string }[] = [
  { key: "script", label: "Script" },
  { key: "orientacao", label: "Orientação" },
  { key: "alerta", label: "Alerta" },
];

// ─── CONFIG VISUAL POR BLOCO ─────────────────────────────────────────────────
const BLOCO_CONFIG: Record<BlocoRoteiro, { accent: string; titleColor: (dark: boolean) => string; btnBg: string }> = {
  abertura: {
    accent: BRAND.azul,
    titleColor: (dark) => (dark ? "#7b95ff" : "#1e36f8"),
    btnBg: BRAND.azul,
  },
  durante_jogo: {
    accent: BRAND.vermelho,
    titleColor: (dark) => (dark ? "#ff8570" : "#c73520"),
    btnBg: BRAND.vermelho,
  },
  fechamento: {
    accent: BRAND.roxoVivo,
    titleColor: (dark) => (dark ? "#b08aee" : "#4a2082"),
    btnBg: BRAND.roxoVivo,
  },
};

// ─── CONFIG VISUAL POR TIPO ───────────────────────────────────────────────────
const TIPO_CONFIG: Record<TipoSugestao, {
  borderColor: string;
  bgColor: (dark: boolean) => string;
  textColor: (dark: boolean) => string;
  tagBg: string;
  tagColor: (dark: boolean) => string;
  tagBorder: string;
  label: string;
}> = {
  script: {
    borderColor: "rgba(30,54,248,0.45)",
    bgColor: (dark) => (dark ? "rgba(30,54,248,0.06)" : "rgba(30,54,248,0.04)"),
    textColor: (dark) => (dark ? "#d0d0ee" : "#1a1a3e"),
    tagBg: "rgba(30,54,248,0.1)",
    tagColor: (dark) => (dark ? "#7b95ff" : "#1e36f8"),
    tagBorder: "rgba(30,54,248,0.25)",
    label: "Script",
  },
  orientacao: {
    borderColor: "rgba(255,255,255,0.1)",
    bgColor: (dark) => (dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)"),
    textColor: (dark) => (dark ? "#9898be" : "#4a4a6a"),
    tagBg: "rgba(107,114,128,0.1)",
    tagColor: (dark) => (dark ? "#9898be" : "#4a4a6a"),
    tagBorder: "rgba(107,114,128,0.2)",
    label: "Orientação",
  },
  alerta: {
    borderColor: "rgba(232,64,37,0.4)",
    bgColor: (dark) => (dark ? "rgba(232,64,37,0.06)" : "rgba(232,64,37,0.04)"),
    textColor: (dark) => (dark ? "#ff9980" : "#c73520"),
    tagBg: "rgba(232,64,37,0.1)",
    tagColor: (dark) => (dark ? "#ff8570" : "#c73520"),
    tagBorder: "rgba(232,64,37,0.25)",
    label: "Alerta",
  },
};

// ─── CONFIG VISUAL POR JOGO ───────────────────────────────────────────────────
const JOGO_TAG_CONFIG: Record<JogoTag, { bg: string; color: (dark: boolean) => string; border: string }> = {
  todos: { bg: "rgba(74,32,130,0.12)", color: (d) => (d ? "#b08aee" : "#4a2082"), border: "rgba(74,32,130,0.25)" },
  blackjack: { bg: "rgba(30,54,248,0.1)", color: (d) => (d ? "#7b95ff" : "#1e36f8"), border: "rgba(30,54,248,0.25)" },
  roleta: { bg: "rgba(232,64,37,0.1)", color: (d) => (d ? "#ff8570" : "#c73520"), border: "rgba(232,64,37,0.25)" },
  baccarat: { bg: "rgba(112,202,228,0.1)", color: (d) => (d ? "#70cae4" : "#1a7fa0"), border: "rgba(112,202,228,0.25)" },
};

// ─── TAG CHIP ─────────────────────────────────────────────────────────────────
function TagChip({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 20,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        background: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
        fontFamily: FONT.body,
      }}
    >
      {label}
    </span>
  );
}

// ─── FILTER CHIP (nos blocos de filtro) ───────────────────────────────────────
function FilterChip({
  label,
  active,
  activeColor,
  activeBg,
  activeBorder,
  onClick,
  dark,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        border: `1.5px solid ${active ? activeBorder : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        background: active ? activeBg : "transparent",
        color: active ? activeColor : dark ? "#7c7c9e" : "#888",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: FONT.body,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── MODAL ADICIONAR/EDITAR ───────────────────────────────────────────────────
function ModalSugestao({
  operadoraSlug,
  bloco,
  editando,
  onClose,
  onSalvo,
}: {
  operadoraSlug: string;
  bloco: BlocoRoteiro;
  editando: RoteiroSugestao | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, isDark } = useApp();
  const dark = isDark ?? false;

  const [texto, setTexto] = useState(editando?.texto ?? "");
  const [tipo, setTipo] = useState<TipoSugestao>(editando?.tipo ?? "script");
  const [jogos, setJogos] = useState<JogoTag[]>(editando?.jogos ?? ["todos"]);
  const [saving, setSaving] = useState(false);

  const toggleJogo = (jogo: JogoTag) => {
    if (jogo === "todos") {
      setJogos(["todos"]);
      return;
    }
    setJogos((prev) => {
      const sem = prev.filter((j) => j !== "todos");
      return sem.includes(jogo) ? sem.filter((j) => j !== jogo) || ["todos"] : [...sem, jogo];
    });
  };

  useEffect(() => {
    if (jogos.length === 0) setJogos(["todos"]);
  }, [jogos]);

  const handleSalvar = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    const payload = {
      texto: texto.trim(),
      tipo,
      jogos,
      updated_at: new Date().toISOString(),
    };
    if (editando) {
      const { error } = await supabase
        .from("roteiro_mesa_sugestoes")
        .update(payload)
        .eq("id", editando.id);
      if (error) console.error("[RoteiroMesa] Erro ao atualizar:", error.message);
    } else {
      const { error } = await supabase.from("roteiro_mesa_sugestoes").insert({
        operadora_slug: operadoraSlug,
        bloco,
        ordem: 0,
        ...payload,
      });
      if (error) console.error("[RoteiroMesa] Erro ao inserir:", error.message);
    }
    setSaving(false);
    onSalvo();
    onClose();
  };

  const blocoLabel = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;
  const blocoAccent = BLOCO_CONFIG[bloco].accent;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "24px 24px 20px",
          maxWidth: 500,
          width: "92%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: blocoAccent, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {editando ? "Editar" : "Adicionar"} — {blocoLabel}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Tipo</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TIPOS.map(({ key, label }) => {
            const cfg = TIPO_CONFIG[key];
            const isActive = tipo === key;
            return (
              <button
                key={key}
                onClick={() => setTipo(key)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 10,
                  border: `1.5px solid ${isActive ? cfg.tagBorder : t.cardBorder}`,
                  background: isActive ? cfg.tagBg : "transparent",
                  color: isActive ? cfg.tagColor(dark) : t.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Aplicável a</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {JOGOS.map(({ key, label }) => {
            const cfg = JOGO_TAG_CONFIG[key];
            const isActive = jogos.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleJogo(key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: `1.5px solid ${isActive ? cfg.border : t.cardBorder}`,
                  background: isActive ? cfg.bg : "transparent",
                  color: isActive ? cfg.color(dark) : t.textMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s",
                }}
              >
                {isActive && <Check size={10} />}
                {label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: FONT.body }}>Texto</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={tipo === "script" ? '"Olá Jogadores, meu nome é [Nome]..."' : tipo === "alerta" ? "Descreva o alerta ou regra operacional..." : "Descreva a orientação para o dealer..."}
          rows={4}
          style={{
            width: "100%",
            padding: "11px 13px",
            borderRadius: 10,
            border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.inputText ?? t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            lineHeight: 1.5,
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontFamily: FONT.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!texto.trim() || saving}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: blocoAccent,
              color: "#fff",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              cursor: texto.trim() && !saving ? "pointer" : "not-allowed",
              opacity: texto.trim() && !saving ? 1 : 0.55,
              transition: "opacity 0.15s",
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM DE SUGESTÃO ─────────────────────────────────────────────────────────
function SugestaoItem({
  sugestao,
  podeEditar,
  onEdit,
  dark,
}: {
  sugestao: RoteiroSugestao;
  podeEditar: boolean;
  onEdit: (s: RoteiroSugestao) => void;
  dark: boolean;
}) {
  const tipo = sugestao.tipo ?? "script";
  const jogosList = sugestao.jogos ?? ["todos"];
  const cfg = TIPO_CONFIG[tipo];
  const [hoverEdit, setHoverEdit] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 13px",
        borderRadius: 10,
        border: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        borderLeft: `3px solid ${cfg.borderColor}`,
        background: cfg.bgColor(dark),
        transition: "background 0.15s",
      }}
    >
      {tipo === "script" && (
        <span style={{ fontSize: 22, color: "rgba(30,54,248,0.3)", flexShrink: 0, fontFamily: "Georgia, serif", lineHeight: 1.1, marginTop: -2, userSelect: "none" }}>"</span>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: FONT.body, fontSize: tipo === "script" ? 14 : 13, color: cfg.textColor(dark), lineHeight: 1.55 }}>
          {sugestao.texto}
        </span>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {jogosList.map((jogo) => {
            const jcfg = JOGO_TAG_CONFIG[jogo as JogoTag];
            const jogoLabel = JOGOS.find((j) => j.key === jogo)?.label ?? jogo;
            return jcfg ? <TagChip key={jogo} label={jogoLabel} bg={jcfg.bg} color={jcfg.color(dark)} border={jcfg.border} /> : null;
          })}
          <TagChip label={cfg.label} bg={cfg.tagBg} color={cfg.tagColor(dark)} border={cfg.tagBorder} />
        </div>
      </div>

      {podeEditar && (
        <button
          onClick={() => onEdit(sugestao)}
          onMouseEnter={() => setHoverEdit(true)}
          onMouseLeave={() => setHoverEdit(false)}
          title="Editar"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "none",
            background: hoverEdit ? (dark ? "rgba(124,58,237,0.15)" : "rgba(74,32,130,0.08)") : "transparent",
            color: hoverEdit ? (dark ? "#b08aee" : "#4a2082") : dark ? "#5a5a7e" : "#aaa",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

// ─── BLOCO DE SUGESTÕES ───────────────────────────────────────────────────────
function BlocoSugestoes({
  bloco,
  operadoraSlug,
  sugestoes,
  podeEditar,
  onCarregar,
  dark,
}: {
  bloco: BlocoRoteiro;
  operadoraSlug: string | null;
  sugestoes: RoteiroSugestao[];
  podeEditar: boolean;
  onCarregar: () => void;
  dark: boolean;
}) {
  const { theme: t } = useApp();
  const [modalEditando, setModalEditando] = useState<RoteiroSugestao | null>(null);
  const [modalAdicionar, setModalAdicionar] = useState(false);

  const label = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;
  const cfg = BLOCO_CONFIG[bloco];

  if (!operadoraSlug) return null;

  return (
    <>
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${t.cardBorder}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: cfg.accent, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cfg.titleColor(dark), fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {label}
            </h3>
            <span style={{ fontSize: 11, color: t.textMuted, background: "rgba(74,32,130,0.08)", borderRadius: 10, padding: "2px 8px", fontFamily: FONT.body }}>
              {sugestoes.length} {sugestoes.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {podeEditar && (
            <button
              onClick={() => setModalAdicionar(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 13px",
                borderRadius: 8,
                border: "none",
                background: cfg.btnBg,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              <Plus size={12} />
              Adicionar
            </button>
          )}
        </div>

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {sugestoes.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <GiNotebook size={28} color={t.textMuted} />
              <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>
                Nenhuma sugestão cadastrada.
              </p>
              {podeEditar && (
                <button
                  onClick={() => setModalAdicionar(true)}
                  style={{
                    marginTop: 4,
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: `1.5px dashed ${cfg.accent}`,
                    background: "transparent",
                    color: cfg.titleColor(dark),
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={12} />
                  Criar primeira sugestão
                </button>
              )}
            </div>
          ) : (
            sugestoes.map((s) => (
              <SugestaoItem key={s.id} sugestao={s} podeEditar={podeEditar} onEdit={setModalEditando} dark={dark} />
            ))
          )}
        </div>
      </div>

      {modalEditando && (
        <ModalSugestao operadoraSlug={operadoraSlug} bloco={bloco} editando={modalEditando} onClose={() => setModalEditando(null)} onSalvo={onCarregar} />
      )}
      {modalAdicionar && (
        <ModalSugestao
          operadoraSlug={operadoraSlug}
          bloco={bloco}
          editando={null}
          onClose={() => setModalAdicionar(false)}
          onSalvo={() => {
            setModalAdicionar(false);
            onCarregar();
          }}
        />
      )}
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function RoteiroMesa() {
  const { theme: t, podeVerOperadora, isDark } = useApp();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("roteiro_mesa");
  const dark = isDark ?? false;

  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroJogo, setFiltroJogo] = useState<JogoTag | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoSugestao | "todos">("todos");
  const [sugestoes, setSugestoes] = useState<RoteiroSugestao[]>([]);
  const [loading, setLoading] = useState(true);

  const mostrarFiltroOp = showFiltroOperadora || (operadoraSlugsForcado != null && operadoraSlugsForcado.length > 1);

  const operadoraSlugSelecionada =
    operadoraSlugsForcado?.length === 1
      ? operadoraSlugsForcado[0]
      : operadoraSlugsForcado?.length
        ? filtroOperadora !== "todas" && operadoraSlugsForcado.includes(filtroOperadora)
          ? filtroOperadora
          : operadoraSlugsForcado[0]
        : filtroOperadora !== "todas"
          ? filtroOperadora
          : null;

  const carregarSugestoes = useCallback(async () => {
    if (!operadoraSlugSelecionada) {
      setSugestoes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("roteiro_mesa_sugestoes")
      .select("*")
      .eq("operadora_slug", operadoraSlugSelecionada)
      .order("bloco")
      .order("ordem");
    setSugestoes((data ?? []) as RoteiroSugestao[]);
    setLoading(false);
  }, [operadoraSlugSelecionada]);

  useEffect(() => {
    carregarSugestoes();
  }, [carregarSugestoes]);

  useEffect(() => {
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
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

  const sugestoesPorBloco = (bloco: BlocoRoteiro) => filtrarSugestoes(sugestoes.filter((s) => s.bloco === bloco));

  return (
    <div style={{ padding: "20px 24px 48px" }}>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 28 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(180deg, #2d1b4e 0%, #0a0a0f 100%)",
            border: `1px solid ${BRAND.roxoBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <GiNotebook size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: "0 0 4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Roteiro de Mesa
          </h1>
          <p style={{ color: t.textMuted, margin: 0, fontFamily: FONT.body, fontSize: 13 }}>
            Sugestões de texto para abertura, durante o jogo e fechamento.
          </p>
        </div>
      </div>

      <div
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, minWidth: 72 }}>
            Operadora
          </span>

          {mostrarFiltroOp && opcoesFiltro.length > 0 ? (
            <select
              value={filtroOperadora}
              onChange={(e) => setFiltroOperadora(e.target.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: `1.5px solid ${filtroOperadora !== "todas" ? BRAND.roxoVivo : t.cardBorder}`,
                background: filtroOperadora !== "todas" ? `${BRAND.roxoVivo}18` : (t.inputBg ?? t.cardBg),
                color: filtroOperadora !== "todas" ? BRAND.roxoVivo : t.textMuted,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                minWidth: 180,
              }}
            >
              {!operadoraSlugsForcado?.length && <option value="todas">Todas as operadoras</option>}
              {[...opcoesFiltro]
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((o) => (
                  <option key={o.slug} value={o.slug}>{o.nome}</option>
                ))}
            </select>
          ) : operadoraSlugsForcado?.length ? (
            <span style={{ fontSize: 13, color: t.text, fontFamily: FONT.body, fontWeight: 600 }}>
              {operadorasList.find((o) => o.slug === operadoraSlugSelecionada)?.nome ?? operadoraSlugSelecionada}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhuma operadora disponível no seu escopo.
            </span>
          )}
        </div>

        <div style={{ height: 1, background: t.cardBorder }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, minWidth: 72 }}>
            Jogo
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {JOGOS.map(({ key, label }) => {
              const jcfg = JOGO_TAG_CONFIG[key];
              return (
                <FilterChip
                  key={key}
                  label={label}
                  active={filtroJogo === key}
                  activeColor={jcfg.color(dark)}
                  activeBg={jcfg.bg}
                  activeBorder={jcfg.border}
                  onClick={() => setFiltroJogo(key)}
                  dark={dark}
                />
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: t.cardBorder }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, minWidth: 72 }}>
            Tipo
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterChip
              label="Todos"
              active={filtroTipo === "todos"}
              activeColor={dark ? "#b08aee" : "#4a2082"}
              activeBg="rgba(74,32,130,0.15)"
              activeBorder={BRAND.roxoBorder}
              onClick={() => setFiltroTipo("todos")}
              dark={dark}
            />
            {TIPOS.map(({ key, label }) => {
              const cfg = TIPO_CONFIG[key];
              return (
                <FilterChip
                  key={key}
                  label={label}
                  active={filtroTipo === key}
                  activeColor={cfg.tagColor(dark)}
                  activeBg={cfg.tagBg}
                  activeBorder={cfg.tagBorder}
                  onClick={() => setFiltroTipo(key)}
                  dark={dark}
                />
              );
            })}
          </div>
        </div>
      </div>

      {!operadoraSlugSelecionada && opcoesFiltro.length > 0 && (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <GiNotebook size={32} color={t.textMuted} />
          <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 14, margin: 0 }}>
            Selecione uma operadora para ver e gerenciar os roteiros.
          </p>
        </div>
      )}

      {operadoraSlugSelecionada &&
        (loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
            Carregando...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {BLOCOS.map(({ key }) => (
              <BlocoSugestoes
                key={key}
                bloco={key}
                operadoraSlug={operadoraSlugSelecionada}
                sugestoes={sugestoesPorBloco(key)}
                podeEditar={perm.canEditarOk}
                onCarregar={carregarSugestoes}
                dark={dark}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
