import { useCallback, useEffect, useState } from "react";
import { Clock, FileText, History } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { MarcaAnotacao, MarcaHistorico, PipelineMarcaRow } from "./types";
import { fmtDataHora, historicoDisplayValor } from "./helpers";
import { HISTORICO_CAMPO_LABEL } from "./constants";

type RegTab = "anotacoes" | "historico";

export function ModalRegistroMarca({
  marca,
  onClose,
  canEditar,
  userId,
  userName,
}: {
  marca: PipelineMarcaRow;
  onClose: () => void;
  canEditar: boolean;
  userId: string | undefined;
  userName: string | undefined;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [tab, setTab] = useState<RegTab>("anotacoes");
  const [anotacoes, setAnotacoes] = useState<MarcaAnotacao[]>([]);
  const [historico, setHistorico] = useState<MarcaHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [anotRes, histRes] = await Promise.all([
      supabase
        .from("comercial_marca_anotacoes")
        .select("id, marca_id, texto, created_at, usuario_id")
        .eq("marca_id", marca.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("comercial_marca_historico")
        .select("id, marca_id, campo, valor_anterior, valor_novo, created_at, usuario_id")
        .eq("marca_id", marca.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const userIds = new Set<string>();
    (anotRes.data ?? []).forEach((a) => a.usuario_id && userIds.add(a.usuario_id));
    (histRes.data ?? []).forEach((h) => h.usuario_id && userIds.add(h.usuario_id));
    let names: Record<string, string> = {};
    if (userIds.size) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", [...userIds]);
      names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name ?? ""]));
    }

    setAnotacoes(
      (anotRes.data ?? []).map((a) => ({
        ...a,
        usuario_nome: a.usuario_id ? names[a.usuario_id] ?? null : null,
      })),
    );
    setHistorico(
      (histRes.data ?? []).map((h) => ({
        ...h,
        usuario_nome: h.usuario_id ? names[h.usuario_id] ?? null : null,
      })),
    );
    setLoading(false);
  }, [marca.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function salvarAnotacao() {
    const trimmed = texto.trim();
    if (!trimmed) {
      setErr("Digite o texto da anotação.");
      return;
    }
    if (!canEditar) return;
    setSalvando(true);
    setErr(null);
    const { error } = await supabase.from("comercial_marca_anotacoes").insert({
      marca_id: marca.id,
      texto: trimmed,
      usuario_id: userId ?? null,
    });
    setSalvando(false);
    if (error) {
      console.error(error);
      setErr("Não foi possível salvar a anotação. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    setTexto("");
    void load();
  }

  const tabKeys: RegTab[] = ["anotacoes", "historico"];

  return (
    <ModalBase onClose={onClose} maxWidth={640} zIndex={1000}>
      <ModalHeader
        title={`Registro — ${marca.nome}`}
        subtitle={`${marca.empresa.razao_social} · CNPJ ${marca.empresa.cnpj}`}
        onClose={onClose}
      />
      <div
        role="tablist"
        aria-label="Abas do registro da marca"
        style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, setTab, (k) => `tab-reg-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-reg-anotacoes"
          active={tab === "anotacoes"}
          aria-controls="panel-reg-anotacoes"
          onClick={() => setTab("anotacoes")}
          icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Anotações
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id="tab-reg-historico"
          active={tab === "historico"}
          aria-controls="panel-reg-historico"
          onClick={() => setTab("historico")}
          icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Histórico
        </FiltroBarTabButton>
      </div>

      {tab === "anotacoes" ? (
        <div id="panel-reg-anotacoes" role="tabpanel" aria-labelledby="tab-reg-anotacoes">
          {canEditar ? (
            <>
              <label htmlFor="registroNovaAnotacao" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>
                Nova anotação
              </label>
              <textarea
                id="registroNovaAnotacao"
                rows={3}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  if (err) setErr(null);
                }}
                placeholder="Registre uma observação sobre esta marca..."
                style={{
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
                }}
              />
              {err ? (
                <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginTop: 8, fontFamily: FONT.body }}>
                  {err}
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvarAnotacao()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: getCtaCriarGradient(brand),
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: salvando ? "wait" : "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 16px" }}>
              Você não tem permissão de Editar para registrar novas anotações.
            </p>
          )}
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: t.textMuted, fontSize: 13, marginTop: 16 }}>
              <Clock size={12} aria-hidden /> Carregando…
            </div>
          ) : anotacoes.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted, textAlign: "center", padding: "24px 0", fontFamily: FONT.body }}>
              Nenhuma anotação registrada.
            </p>
          ) : (
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {anotacoes.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, fontFamily: FONT.body }}>{a.texto}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, fontFamily: FONT.body }}>
                    {a.usuario_nome ?? userName ?? "—"} · {fmtDataHora(a.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div id="panel-reg-historico" role="tabpanel" aria-labelledby="tab-reg-historico">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: t.textMuted, fontSize: 13 }}>
              <Clock size={12} aria-hidden /> Carregando…
            </div>
          ) : historico.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted, textAlign: "center", padding: "24px 0", fontFamily: FONT.body }}>
              Nenhuma alteração registrada.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historico.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    textAlign: "left",
                    fontSize: 13,
                    fontFamily: FONT.body,
                    color: t.text,
                  }}
                >
                  <strong>{HISTORICO_CAMPO_LABEL[h.campo] ?? h.campo}</strong>
                  {" — "}
                  {historicoDisplayValor(h.campo, h.valor_anterior)} → {historicoDisplayValor(h.campo, h.valor_novo)}
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
                    {h.usuario_nome ?? "—"} · {fmtDataHora(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ModalBase>
  );
}
