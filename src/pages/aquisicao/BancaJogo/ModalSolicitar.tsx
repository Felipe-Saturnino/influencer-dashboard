import { useEffect, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import type { Role } from "../../../types"
import { roleParidadeInfluencer } from "../../../lib/staffRoles"

export function ModalSolicitar({
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
  const [infSel, setInfSel] = useState(roleParidadeInfluencer(userRole as Role) ? userId : "");
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
    if (!roleParidadeInfluencer(userRole as Role) || !userId) return;
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
      if (c.erroVerificacao) {
        setAgenciaElegivel(false);
      } else if (c.perfilIncompleto) {
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
  const escopoOk = roleParidadeInfluencer(userRole as Role) || !!infSel;
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
    const influencerAlvo = roleParidadeInfluencer(userRole as Role) ? userId : infSel;
    const check = await verificarElegibilidadeAgendaLive(influencerAlvo);
    if (check.erroVerificacao) {
      setErr("Não foi possível verificar o cadastro e o Playbook. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
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
        {roleParidadeInfluencer(userRole as Role) && (
          <div>
            <label style={labelStyle}>Influencer</label>
            <input value={nomeInfluencerLocked ?? ""} readOnly disabled style={{ ...inputStyle, opacity: 0.85, cursor: "not-allowed" }} />
          </div>
        )}
        {userRole === "agencia" && (
          <div>
            <label style={labelStyle}>
              Influencer
              <CampoObrigatorioMark />
            </label>
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
          <label style={labelStyle}>
            ID da operadora (ativo)
            <CampoObrigatorioMark />
          </label>
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
          <label style={labelStyle}>
            Valor solicitado (R$)
            <CampoObrigatorioMark />
          </label>
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
