import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Dealer, DealerGenero, DealerTurno, DealerJogo, Operadora } from "../../../types";
import { X, Eye, Pencil, MessageSquare, Upload, Trash2 } from "lucide-react";
import { GiCardRandom } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
  cinza:    "#6b7280",
} as const;

// ─── Constantes ───────────────────────────────────────────────────────────────
const GENERO_OPTS: { value: DealerGenero; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
];

const TURNO_OPTS: { value: DealerTurno; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const JOGOS_OPTS: { value: DealerJogo; label: string }[] = [
  { value: "blackjack", label: "Blackjack" },
  { value: "roleta", label: "Roleta" },
  { value: "baccarat", label: "Baccarat" },
  { value: "mesa_vip", label: "Mesa VIP" },
];

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────
interface DealerObservacao {
  id: string;
  dealer_id: string;
  usuario_id: string | null;
  texto: string;
  created_at: string;
  usuario_nome?: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GestaoDealers() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("gestao_dealers");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalVer, setModalVer] = useState<Dealer | null>(null);
  const [modalEditar, setModalEditar] = useState<Dealer | null>(null);
  const [modalObs, setModalObs] = useState<Dealer | null>(null);

  // Filtros
  const [filtroGenero, setFiltroGenero] = useState<string>("todos");
  const [filtroTurno, setFiltroTurno] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [filtroJogos, setFiltroJogos] = useState<string>("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [dealersRes, operadorasRes] = await Promise.all([
      supabase.from("dealers").select("*").order("nickname"),
      supabase.from("operadoras").select("slug, nome").order("nome").eq("ativo", true),
    ]);
    setDealers((dealersRes.data ?? []) as Dealer[]);
    setOperadoras((operadorasRes.data ?? []) as Operadora[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Filtrar dealers
  const filtered = dealers.filter((d) => {
    if (filtroGenero !== "todos" && d.genero !== filtroGenero) return false;
    if (filtroTurno !== "todos" && d.turno !== filtroTurno) return false;
    if (filtroOperadora === "nenhuma") {
      if (d.operadora_slug) return false;
    } else if (filtroOperadora !== "todas" && d.operadora_slug !== filtroOperadora) return false;
    if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogo)) return false;
    return true;
  });

  // Consolidados
  const totalDealers = dealers.length;
  const porTurno: Record<string, number> = { manha: 0, tarde: 0, noite: 0 };
  const porGenero: Record<string, number> = { feminino: 0, masculino: 0 };
  const porJogo: Record<string, number> = { blackjack: 0, roleta: 0, baccarat: 0, mesa_vip: 0 };
  dealers.forEach((d) => {
    porTurno[d.turno] = (porTurno[d.turno] ?? 0) + 1;
    porGenero[d.genero] = (porGenero[d.genero] ?? 0) + 1;
    (d.jogos ?? []).forEach((j) => { porJogo[j] = (porJogo[j] ?? 0) + 1; });
  });

  const selectStyle: React.CSSProperties = {
    flex: 1, minWidth: 140, padding: "8px 12px", borderRadius: 10,
    border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg,
    color: t.text, fontSize: 12, fontFamily: FONT.body, cursor: "pointer", outline: "none",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Gestão de Dealers.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 48px" }}>

      {/* ─── Header — primária ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: brand.primaryIconBg, border: brand.primaryIconBorder, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: brand.primaryIconColor }}>
            <GiCardRandom size={14} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Gestão de Dealers
            </h1>
            <p style={{ color: t.textMuted, marginTop: 5, fontFamily: FONT.body, fontSize: 13 }}>
              Gerencie o elenco de dealers de casino.
            </p>
          </div>
        </div>
        {perm.canCriarOk && (
          <button
            onClick={() => setModalCriar(true)}
            style={{
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 18px", cursor: "pointer",
              fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
            }}
          >
            + Adicionar Dealer
          </button>
        )}
      </div>

      {/* ─── Bloco 1: Filtros ─────────────────────────────────────────────────── */}
      <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "18px 20px", marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>Filtros</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select value={filtroGenero} onChange={(e) => setFiltroGenero(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os gêneros</option>
            {[...GENERO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os turnos</option>
            {[...TURNO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroOperadora} onChange={(e) => setFiltroOperadora(e.target.value)} style={selectStyle}>
            <option value="todas">Todas as operadoras</option>
            <option value="nenhuma">Nenhuma operadora</option>
            {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => <option key={op.slug} value={op.slug}>{op.nome}</option>)}
          </select>
          <select value={filtroJogos} onChange={(e) => setFiltroJogos(e.target.value)} style={selectStyle}>
            <option value="todos">Todos os jogos</option>
            {[...JOGOS_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ─── Bloco 2: Quadros consolidados ───────────────────────────────────── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${brand.accent}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body, marginBottom: 6 }}>Dealers</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>{totalDealers}</div>
          </div>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${brand.secondary}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body, marginBottom: 6 }}>Turnos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {TURNO_OPTS.map((o) => (
                <span key={o.value} style={{ fontSize: 12, fontWeight: 700, color: brand.accent, fontFamily: FONT.body }}>
                  {o.label}: {porTurno[o.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${BRAND.verde}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>Gênero</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {GENERO_OPTS.map((o) => (
                <span key={o.value} style={{ fontSize: 12, fontWeight: 700, color: BRAND.verde, fontFamily: FONT.body }}>
                  {o.label}: {porGenero[o.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderLeft: `4px solid ${BRAND.amarelo}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>Jogos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {JOGOS_OPTS.map((o) => (
                <span key={o.value} style={{ fontSize: 12, fontWeight: 700, color: BRAND.amarelo, fontFamily: FONT.body }}>
                  {o.label}: {porJogo[o.value] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Bloco 3: Elenco completo ────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 14 }}>
        <span style={{ color: brand.accent, fontWeight: 700 }}>{filtered.length}</span> {filtered.length === 1 ? "dealer" : "dealers"}
      </div>
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Nenhum dealer encontrado.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {filtered.map((d) => (
            <DealerCard
              key={d.id}
              dealer={d}
              operadoras={operadoras}
              brand={brand}
              onVer={() => setModalVer(d)}
              onEditar={() => setModalEditar(d)}
              onObservacoes={() => setModalObs(d)}
              canEditar={perm.canEditarOk}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {modalCriar && <ModalDealer operadoras={operadoras} editando={null} onClose={() => setModalCriar(false)} onSalvo={() => { setModalCriar(false); carregar(); }} />}
      {modalEditar && <ModalDealer operadoras={operadoras} editando={modalEditar} onClose={() => setModalEditar(null)} onSalvo={() => { setModalEditar(null); carregar(); }} />}
      {modalVer && <ModalVer dealer={modalVer} operadoras={operadoras} onClose={() => setModalVer(null)} />}
      {modalObs && <ModalObservacoes dealer={modalObs} onClose={() => setModalObs(null)} />}
    </div>
  );
}

// ─── DealerCard ────────────────────────────────────────────────────────────────
function DealerCard({
  dealer,
  operadoras,
  brand,
  onVer,
  onEditar,
  onObservacoes,
  canEditar,
}: {
  dealer: Dealer;
  operadoras: Operadora[];
  brand: ReturnType<typeof useDashboardBrand>;
  onVer: () => void;
  onEditar: () => void;
  onObservacoes: () => void;
  canEditar: boolean;
}) {
  const { theme: t } = useApp();
  const fotoUrl = (dealer.fotos ?? [])[0];
  const op = operadoras.find((o) => o.slug === dealer.operadora_slug);

  return (
    <div style={{
      background: brand.blockBg,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
    }}>
      {/* Área da foto */}
      <div style={{
        aspectRatio: "16/10",
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {fotoUrl ? (
          <img src={fotoUrl} alt={dealer.nickname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 48, color: "rgba(255,255,255,0.2)", fontWeight: 800, fontFamily: FONT.body }}>
            {(dealer.nickname || "?")[0]?.toUpperCase()}
          </div>
        )}
        {/* Badges sobre a foto */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dealer.status === "aprovado" && (
            <span style={{ background: BRAND.verde, color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>APROVADO</span>
          )}
          {dealer.vip && (
            <span style={{ background: BRAND.amarelo, color: "#1a1a2e", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>★ VIP</span>
          )}
        </div>
        <div style={{ position: "absolute", bottom: 10, left: 10 }}>
          <span style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body, textTransform: "uppercase" }}>
            {TURNO_OPTS.find((o) => o.value === dealer.turno)?.label ?? dealer.turno}
          </span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "16px 18px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {dealer.nickname}
        </h3>
        <p style={{ margin: "4px 0 10px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          {dealer.nome_real}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {(dealer.jogos ?? []).map((j) => (
            <span key={j} style={{
              background: `${BRAND.vermelho}22`, border: `1px solid ${BRAND.vermelho}66`,
              color: BRAND.vermelho, padding: "3px 10px", borderRadius: 20,
              fontSize: 11, fontWeight: 700, fontFamily: FONT.body, textTransform: "uppercase",
            }}>
              {JOGOS_OPTS.find((o) => o.value === j)?.label ?? j}
            </span>
          ))}
        </div>
        {dealer.perfil_influencer && (
          <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {dealer.perfil_influencer}
          </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ background: `${BRAND.roxoVivo}22`, color: BRAND.roxoVivo, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: FONT.body }}>
            {GENERO_OPTS.find((o) => o.value === dealer.genero)?.label ?? dealer.genero}
          </span>
          {op && (
            <span style={{ background: `${BRAND.azul}22`, color: BRAND.azul, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: FONT.body }}>
              {op.nome}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onVer} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            <Eye size={13} /> Ver
          </button>
          {canEditar && (
            <>
              <button onClick={onEditar} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                <Pencil size={13} /> Editar
              </button>
              <button onClick={onObservacoes} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                <MessageSquare size={13} /> Observações
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ver ────────────────────────────────────────────────────────────────
function ModalVer({ dealer, operadoras, onClose }: { dealer: Dealer; operadoras: Operadora[]; onClose: () => void }) {
  const { theme: t } = useApp();
  const op = operadoras.find((o) => o.slug === dealer.operadora_slug);
  const fotoUrl = (dealer.fotos ?? [])[0];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{dealer.nickname}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {fotoUrl && (
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20, aspectRatio: "16/10" }}>
            <img src={fotoUrl} alt={dealer.nickname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT.body }}>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Nome Real</span><br /><span style={{ fontSize: 14, color: t.text }}>{dealer.nome_real}</span></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Gênero</span><br /><span style={{ fontSize: 14, color: t.text }}>{GENERO_OPTS.find((o) => o.value === dealer.genero)?.label}</span></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Turno</span><br /><span style={{ fontSize: 14, color: t.text }}>{TURNO_OPTS.find((o) => o.value === dealer.turno)?.label}</span></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Jogos</span><br /><span style={{ fontSize: 14, color: t.text }}>{(dealer.jogos ?? []).map((j) => JOGOS_OPTS.find((o) => o.value === j)?.label).join(", ") || "—"}</span></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Operadora</span><br /><span style={{ fontSize: 14, color: t.text }}>{op?.nome ?? "Nenhuma"}</span></div>
          {dealer.perfil_influencer && (
            <div><span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Perfil do Influencer</span><br /><span style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap" }}>{dealer.perfil_influencer}</span></div>
          )}
        </div>
        <div style={{ marginTop: 20 }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            VER PERFIL &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Observações ─────────────────────────────────────────────────────────
function ModalObservacoes({ dealer, onClose }: { dealer: Dealer; onClose: () => void }) {
  const { theme: t, user } = useApp();
  const [obs, setObs] = useState<DealerObservacao[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("dealer_observacoes").select("id, dealer_id, usuario_id, texto, created_at").eq("dealer_id", dealer.id).order("created_at", { ascending: false }).then(({ data }) => {
      const lista = (data ?? []) as DealerObservacao[];
      const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
      if (ids.length > 0) {
        supabase.from("profiles").select("id, name").in("id", ids).then(({ data: profs }) => {
          const map: Record<string, string> = {};
          (profs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name ?? p.id; });
          setObs(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
        });
      } else setObs(lista);
      setLoading(false);
    });
  }, [dealer.id]);

  const adicionar = async () => {
    if (!novoTexto.trim()) return;
    const { data, error } = await supabase.from("dealer_observacoes").insert({ dealer_id: dealer.id, usuario_id: user?.id ?? null, texto: novoTexto.trim() }).select("id, dealer_id, usuario_id, texto, created_at").single();
    if (!error && data) {
      setObs((prev) => [{ ...data, usuario_nome: user?.name }, ...prev]);
      setNovoTexto("");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, borderRadius: 20, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Observações — {dealer.nickname}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <textarea value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} placeholder="Nova observação..." style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontFamily: FONT.body, outline: "none", boxSizing: "border-box" }} />
          <button onClick={adicionar} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            Adicionar
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando...</span> : obs.length === 0 ? <span style={{ color: t.textMuted, fontSize: 13 }}>Nenhuma observação.</span> : obs.map((o) => (
            <div key={o.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, fontSize: 13, fontFamily: FONT.body }}>
              <div style={{ color: t.text }}>{o.texto}</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{o.usuario_nome ?? "—"} • {new Date(o.created_at).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Criar/Editar Dealer ─────────────────────────────────────────────────
function ModalDealer({
  operadoras,
  editando,
  onClose,
  onSalvo,
}: {
  operadoras: Operadora[];
  editando: Dealer | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const [nomeReal, setNomeReal] = useState(editando?.nome_real ?? "");
  const [nickname, setNickname] = useState(editando?.nickname ?? "");
  const [fotos, setFotos] = useState<string[]>(editando?.fotos ?? []);
  const [genero, setGenero] = useState<DealerGenero>(editando?.genero ?? "feminino");
  const [turno, setTurno] = useState<DealerTurno>(editando?.turno ?? "noite");
  const [jogos, setJogos] = useState<DealerJogo[]>(editando?.jogos ?? []);
  const [operadoraSlug, setOperadoraSlug] = useState<string>(editando?.operadora_slug ?? "");
  const [perfilInfluencer, setPerfilInfluencer] = useState(editando?.perfil_influencer ?? "");
  const [status, setStatus] = useState<"aprovado" | "pendente">(editando?.status ?? "aprovado");
  const [vip, setVip] = useState(editando?.vip ?? false);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const toggleJogo = (j: DealerJogo) => {
    setJogos((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setErro("");
    try {
      const novas: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${editando?.id ?? "new"}-${Date.now()}-${i}.${ext}`;
        const { data, error } = await supabase.storage.from("dealer-photos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("dealer-photos").getPublicUrl(data.path);
        novas.push(urlData.publicUrl);
      }
      setFotos((prev) => [...prev, ...novas]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar foto. Verifique se o bucket dealer-photos existe no Storage.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removerFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    setErro("");
    if (!nomeReal.trim()) { setErro("Nome real é obrigatório."); return; }
    if (!nickname.trim()) { setErro("Nickname é obrigatório."); return; }
    if (jogos.length === 0) { setErro("Selecione pelo menos um jogo."); return; }

    setSalvando(true);
    try {
      const payload = {
        nome_real: nomeReal.trim(),
        nickname: nickname.trim(),
        fotos,
        genero,
        turno,
        jogos,
        operadora_slug: operadoraSlug || null,
        perfil_influencer: perfilInfluencer.trim() || null,
        status,
        vip,
      };
      if (editando) {
        const { error } = await supabase.from("dealers").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealers").insert(payload);
        if (error) throw error;
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 10, padding: "10px 14px", color: t.text, fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box", outline: "none",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" };
  const fieldStyle: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget && !salvando) onClose(); }}>
      <div style={{ background: t.cardBg, borderRadius: 20, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${t.cardBorder}` }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 800, color: t.text, margin: 0 }}>
            {editando ? "Editar Dealer" : "Novo Dealer"}
          </h2>
          <button onClick={() => { if (!salvando) onClose(); }} style={{ background: "none", border: "none", cursor: salvando ? "not-allowed" : "pointer", color: t.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Nome Real</label>
          <input style={inputStyle} value={nomeReal} onChange={(e) => setNomeReal(e.target.value)} placeholder="Ex: Maria Silva" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Nickname</label>
          <input style={inputStyle} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: YARA" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Fotos</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {fotos.map((url, idx) => (
              <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removerFoto(idx)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: BRAND.vermelho, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px dashed ${t.cardBorder}`, cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
            <Upload size={16} />
            {uploading ? "Enviando..." : "Adicionar fotos"}
            <input type="file" accept="image/*" multiple hidden onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        <div style={{ ...fieldStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Gênero</label>
            <select value={genero} onChange={(e) => setGenero(e.target.value as DealerGenero)} style={inputStyle}>
              {[...GENERO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value as DealerTurno)} style={inputStyle}>
              {[...TURNO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Jogos</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {JOGOS_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleJogo(o.value)}
                style={{
                  padding: "8px 14px", borderRadius: 20, border: `1px solid ${jogos.includes(o.value) ? BRAND.roxoVivo : t.cardBorder}`,
                  background: jogos.includes(o.value) ? `${BRAND.roxoVivo}22` : "transparent",
                  color: jogos.includes(o.value) ? BRAND.roxoVivo : t.textMuted,
                  fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Operadora</label>
          <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={inputStyle}>
            <option value="">Nenhuma</option>
            {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => <option key={op.slug} value={op.slug}>{op.nome}</option>)}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Perfil do Influencer</label>
          <textarea value={perfilInfluencer} onChange={(e) => setPerfilInfluencer(e.target.value)} placeholder="Descrição, carisma, resenha..." style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
        </div>

        {editando && (
          <div style={{ ...fieldStyle, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Status</label>
            <button type="button" onClick={() => setStatus("aprovado")} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${status === "aprovado" ? BRAND.verde : t.cardBorder}`, background: status === "aprovado" ? `${BRAND.verde}22` : "transparent", color: status === "aprovado" ? BRAND.verde : t.textMuted, fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Aprovado</button>
            <button type="button" onClick={() => setStatus("pendente")} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${status === "pendente" ? BRAND.amarelo : t.cardBorder}`, background: status === "pendente" ? `${BRAND.amarelo}22` : "transparent", color: status === "pendente" ? BRAND.amarelo : t.textMuted, fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Pendente</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, fontFamily: FONT.body, fontSize: 13, color: t.text, cursor: "pointer" }}>
              <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} />
              VIP
            </label>
          </div>
        )}

        {erro && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: BRAND.vermelho, marginBottom: 16, fontFamily: FONT.body }}>
            {erro}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => { if (!salvando) onClose(); }} style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.text }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{
            background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
            color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body, fontSize: 13, fontWeight: 700, opacity: salvando ? 0.7 : 1,
          }}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar dealer"}
          </button>
        </div>
      </div>
    </div>
  );
}
