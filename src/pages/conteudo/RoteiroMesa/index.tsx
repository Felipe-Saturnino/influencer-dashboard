import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { Pencil, Plus, X } from "lucide-react";
import { GiNotebook } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  verde: "#22c55e",
  cinza: "#6b7280",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

export type BlocoRoteiro = "abertura" | "durante_jogo" | "fechamento";

export interface RoteiroSugestao {
  id: string;
  operadora_slug: string;
  bloco: BlocoRoteiro;
  texto: string;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

const BLOCOS: { key: BlocoRoteiro; label: string }[] = [
  { key: "abertura", label: "Abertura" },
  { key: "durante_jogo", label: "Durante Jogo" },
  { key: "fechamento", label: "Fechamento" },
];

// ─── Modal Adicionar/Editar ───────────────────────────────────────────────────
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
  const { theme: t } = useApp();
  const [texto, setTexto] = useState(editando?.texto ?? "");
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    if (editando) {
      const { error } = await supabase
        .from("roteiro_mesa_sugestoes")
        .update({ texto: texto.trim(), updated_at: new Date().toISOString() })
        .eq("id", editando.id);
      if (error) console.error("[RoteiroMesa] Erro ao atualizar:", error.message);
    } else {
      const { error } = await supabase.from("roteiro_mesa_sugestoes").insert({
        operadora_slug: operadoraSlug,
        bloco,
        texto: texto.trim(),
        ordem: 0,
      });
      if (error) console.error("[RoteiroMesa] Erro ao inserir:", error.message);
    }
    setSaving(false);
    onSalvo();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: 24,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: t.text, fontFamily: FONT_TITLE }}>
          {editando ? "Editar sugestão" : "Adicionar sugestão"}
        </h3>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite o texto da sugestão..."
          rows={5}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.inputBorder}`,
            background: t.inputBg,
            color: t.inputText,
            fontFamily: FONT.body,
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.textMuted,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!texto.trim() || saving}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              border: "none",
              background: BRAND.roxoVivo,
              color: "#fff",
              fontFamily: FONT.body,
              fontWeight: 600,
              cursor: texto.trim() && !saving ? "pointer" : "not-allowed",
              opacity: texto.trim() && !saving ? 1 : 0.6,
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bloco de sugestões (Abertura, Durante Jogo, Fechamento) ───────────────────
function BlocoSugestoes({
  bloco,
  operadoraSlug,
  sugestoes,
  perm,
  onCarregar,
}: {
  bloco: BlocoRoteiro;
  operadoraSlug: string | null;
  sugestoes: RoteiroSugestao[];
  perm: ReturnType<typeof usePermission>;
  onCarregar: () => void;
}) {
  const { theme: t } = useApp();
  const [modalEditando, setModalEditando] = useState<RoteiroSugestao | null>(null);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const label = BLOCOS.find((b) => b.key === bloco)?.label ?? bloco;

  const podeEditar = perm.canEditarOk;

  if (!operadoraSlug) return null;

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: t.text,
            fontFamily: FONT_TITLE,
            textTransform: "uppercase",
          }}
        >
          {label}
        </h3>
        {podeEditar && (
          <button
            onClick={() => setModalAdicionar(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: BRAND.roxoVivo,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Adicionar
          </button>
        )}
      </div>
      {sugestoes.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Nenhuma sugestão cadastrada. Clique em "Adicionar" para criar a primeira.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sugestoes.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 14,
                background: "rgba(74,32,130,0.06)",
                borderRadius: 12,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <div style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: t.text, lineHeight: 1.5 }}>
                {s.texto}
              </div>
              {podeEditar && (
                <button
                  onClick={() => setModalEditando(s)}
                  title="Editar"
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    color: t.textMuted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {modalEditando && (
        <ModalSugestao
          operadoraSlug={operadoraSlug}
          bloco={bloco}
          editando={modalEditando}
          onClose={() => setModalEditando(null)}
          onSalvo={onCarregar}
        />
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
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RoteiroMesa() {
  const { theme: t, user, podeVerOperadora } = useApp();
  const {
    showFiltroOperadora,
    operadoraSlugsForcado,
    escoposVisiveis,
  } = useDashboardFiltros();
  const perm = usePermission("roteiro_mesa");

  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [sugestoes, setSugestoes] = useState<RoteiroSugestao[]>([]);
  const [loading, setLoading] = useState(true);

  // Operador com "Próprios": vê apenas suas operadoras. Se 1, usa direto; se 2+, usa filtro.
  // Admin/Gestor/Executivo: mostra filtro e usa o selecionado.
  const mostrarFiltro =
    showFiltroOperadora || (operadoraSlugsForcado != null && operadoraSlugsForcado.length > 1);
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

  // Auto-selecionar operadora: operador com 1 op usa direto; com 2+ inicia no primeiro
  useEffect(() => {
    if (operadoraSlugsForcado?.length && filtroOperadora === "todas") {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [operadoraSlugsForcado]);

  const sugestoesPorBloco = (bloco: BlocoRoteiro) =>
    sugestoes.filter((s) => s.bloco === bloco);

  if (perm.canView === "nao") {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        Você não tem permissão para visualizar Roteiro de Mesa.
      </div>
    );
  }

  const opcoesFiltro = operadorasList.filter(
    (o) =>
      escoposVisiveis.semRestricaoEscopo ||
      escoposVisiveis.operadorasVisiveis.length === 0 ||
      escoposVisiveis.operadorasVisiveis.includes(o.slug)
  );

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: BRAND.roxo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 3,
          }}
        >
          <GiNotebook size={14} color="#fff" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: t.text,
              fontFamily: FONT_TITLE,
              margin: 0,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Roteiro de Mesa
          </h1>
          <p
            style={{
              color: t.textMuted,
              marginTop: 5,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            Sugestões de texto para abertura, durante o jogo e fechamento, por operadora.
          </p>
        </div>
      </div>

      {/* Bloco 1 - Filtro de Operadora */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            fontWeight: 700,
            color: t.textMuted,
            fontFamily: FONT.body,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Filtro de Operadora
        </h3>
        {mostrarFiltro && opcoesFiltro.length > 0 ? (
          <select
            value={filtroOperadora}
            onChange={(e) => setFiltroOperadora(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1.5px solid ${filtroOperadora !== "todas" ? BRAND.roxoVivo : t.cardBorder}`,
              background: filtroOperadora !== "todas" ? `${BRAND.roxoVivo}18` : (t.inputBg ?? t.cardBg),
              color: filtroOperadora !== "todas" ? BRAND.roxoVivo : t.textMuted,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT.body,
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              minWidth: 200,
            }}
          >
            {!operadoraSlugsForcado?.length && <option value="todas">Todas as operadoras</option>}
            {[...opcoesFiltro]
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.nome}
                </option>
              ))}
          </select>
        ) : operadoraSlugsForcado?.length ? (
          <div style={{ fontSize: 14, color: t.text, fontFamily: FONT.body }}>
            Operadora:{" "}
            <strong>
              {operadorasList.find((o) => o.slug === operadoraSlugSelecionada)?.nome ??
                operadoraSlugSelecionada}
            </strong>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
            Nenhuma operadora disponível no seu escopo.
          </div>
        )}
      </div>

      {/* Mensagem quando nenhuma operadora selecionada */}
      {!operadoraSlugSelecionada && opcoesFiltro.length > 0 && (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 14,
          }}
        >
          Selecione uma operadora para ver e gerenciar os roteiros.
        </div>
      )}

      {/* Blocos 2, 3, 4 - Abertura, Durante Jogo, Fechamento */}
      {operadoraSlugSelecionada && (
        <>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              Carregando...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {BLOCOS.map(({ key }) => (
                <BlocoSugestoes
                  key={key}
                  bloco={key}
                  operadoraSlug={operadoraSlugSelecionada}
                  sugestoes={sugestoesPorBloco(key)}
                  perm={perm}
                  onCarregar={carregarSugestoes}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
