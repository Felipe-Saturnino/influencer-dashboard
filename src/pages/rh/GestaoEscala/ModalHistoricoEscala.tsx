import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { supabase } from "../../../lib/supabase";

export type EscalaHistoricoAcao =
  | "sugestao"
  | "salvar"
  | "aprovar"
  | "nova_escala"
  | "alterar_escala";

export type EscalaHistoricoDetalhes = {
  prestador_nome?: string;
  dia_iso?: string;
  observacao?: string | null;
};

export type EscalaHistoricoRow = {
  id: string;
  acao: EscalaHistoricoAcao;
  realizada_em: string;
  realizada_por_nome: string;
  detalhes: EscalaHistoricoDetalhes;
};

const ACAO_LABEL: Record<EscalaHistoricoAcao, string> = {
  sugestao: "Sugestão de Escala",
  salvar: "Salvar Alterações",
  aprovar: "Aprovar Escala",
  nova_escala: "Nova Escala",
  alterar_escala: "Alterar Escala",
};

function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fmtDiaIso(iso: string | undefined): string {
  if (!iso) return "—";
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function parseDetalhes(raw: unknown): EscalaHistoricoDetalhes {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    prestador_nome: typeof o.prestador_nome === "string" ? o.prestador_nome : undefined,
    dia_iso: typeof o.dia_iso === "string" ? o.dia_iso : undefined,
    observacao:
      o.observacao === null || typeof o.observacao === "string" ? (o.observacao as string | null) : undefined,
  };
}

type ModalHistoricoEscalaProps = {
  refMesIso: string;
  areaKey: string;
  areaLabel: string;
  tituloMes: string;
  onClose: () => void;
};

export function ModalHistoricoEscala({
  refMesIso,
  areaKey,
  areaLabel,
  tituloMes,
  onClose,
}: ModalHistoricoEscalaProps) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<EscalaHistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("rh_gestao_escala_historico_listar", {
          p_ref_mes: refMesIso,
          p_area_key: areaKey,
        });
        if (cancelled) return;
        if (error) throw error;
        const rows = (data ?? []) as {
          id: string;
          acao: string;
          realizada_em: string;
          realizada_por_nome: string | null;
          detalhes: unknown;
        }[];
        setItens(
          rows.map((r) => ({
            id: r.id,
            acao: r.acao as EscalaHistoricoAcao,
            realizada_em: r.realizada_em,
            realizada_por_nome: (r.realizada_por_nome ?? "").trim() || "Usuário",
            detalhes: parseDetalhes(r.detalhes),
          })),
        );
      } catch {
        if (!cancelled) {
          setErr("Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.");
          setItens([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refMesIso, areaKey]);

  const linhaMuted = { color: t.textMuted, fontSize: 11, lineHeight: 1.45 };
  const linhaTexto = { color: t.text, fontSize: 12, lineHeight: 1.45 };

  return (
    <ModalBase maxWidth={560} onClose={onClose}>
      <ModalHeader title="Histórico" onClose={onClose} />
      <div style={{ fontFamily: FONT.body }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
          {tituloMes} · {areaLabel}
        </p>

        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "32px 0",
              color: t.textMuted,
              fontSize: 13,
            }}
          >
            <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            Carregando…
          </div>
        ) : itens.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
            Nenhum registro no histórico para este mês e área.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              maxHeight: "55dvh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {itens.map((item) => {
              const det = item.detalhes;
              const obs = (det.observacao ?? "").trim();
              const isAlterar = item.acao === "alterar_escala";

              return (
                <li
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg,
                  }}
                >
                  <div style={linhaTexto}>
                    <span style={linhaMuted}>Data/hora: </span>
                    {fmtDataHora(item.realizada_em)}
                  </div>
                  <div style={{ ...linhaTexto, marginTop: 4 }}>
                    <span style={linhaMuted}>Usuário: </span>
                    {item.realizada_por_nome}
                  </div>

                  {isAlterar ? (
                    <>
                      <div style={{ ...linhaTexto, marginTop: 4 }}>
                        <span style={linhaMuted}>Prestador: </span>
                        {det.prestador_nome ?? "—"}
                      </div>
                      <div style={{ ...linhaTexto, marginTop: 4 }}>
                        <span style={linhaMuted}>Dia: </span>
                        {fmtDiaIso(det.dia_iso)}
                      </div>
                      {obs ? (
                        <div style={{ ...linhaTexto, marginTop: 4 }}>
                          <span style={linhaMuted}>Observação: </span>
                          {obs}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ ...linhaTexto, marginTop: 4 }}>
                      <span style={linhaMuted}>Ação: </span>
                      {ACAO_LABEL[item.acao] ?? item.acao}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalBase>
  );
}
