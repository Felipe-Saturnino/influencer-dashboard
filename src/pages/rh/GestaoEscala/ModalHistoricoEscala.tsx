import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
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

/** Cores dos botões da toolbar Escala Diária (Global § paleta semântica + marca na sugestão). */
const HISTORICO_ACAO_COR: Record<EscalaHistoricoAcao, string> = {
  sugestao: "#7c3aed",
  salvar: "#1e36f8",
  aprovar: "#22c55e",
  nova_escala: "#e84025",
  alterar_escala: "#1e36f8",
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

function historicoCardStyle(acao: EscalaHistoricoAcao, brandAccent: string, useBrand: boolean): CSSProperties {
  const corBase =
    acao === "sugestao" && useBrand ? brandAccent : HISTORICO_ACAO_COR[acao];
  const corMix =
    acao === "sugestao" && useBrand
      ? "var(--brand-action, #7c3aed)"
      : HISTORICO_ACAO_COR[acao];
  return {
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${corBase}`,
    background: `color-mix(in srgb, ${corMix} 22%, transparent)`,
  };
}

function CampoHistorico({
  label,
  valor,
  t,
  accent,
  first,
}: {
  label: string;
  valor: ReactNode;
  t: { text: string; textMuted: string };
  accent: string;
  first?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        lineHeight: 1.45,
        color: t.text,
        marginTop: first ? 0 : 4,
      }}
    >
      <span style={{ color: t.textMuted, fontSize: 11 }}>{label}: </span>
      <span style={{ fontWeight: 600, color: accent }}>{valor}</span>
    </div>
  );
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
  const brand = useDashboardBrand();
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
              const accent =
                item.acao === "sugestao" && brand.useBrand
                  ? brand.accent
                  : HISTORICO_ACAO_COR[item.acao];

              return (
                <li key={item.id} style={historicoCardStyle(item.acao, brand.accent, brand.useBrand)}>
                  <CampoHistorico
                    label="Ação"
                    valor={ACAO_LABEL[item.acao] ?? item.acao}
                    t={t}
                    accent={accent}
                    first
                  />
                  <CampoHistorico
                    label="Data/hora"
                    valor={fmtDataHora(item.realizada_em)}
                    t={t}
                    accent={t.text}
                  />
                  <CampoHistorico label="Usuário" valor={item.realizada_por_nome} t={t} accent={t.text} />
                  {isAlterar ? (
                    <>
                      <CampoHistorico
                        label="Prestador Alterado"
                        valor={det.prestador_nome ?? "—"}
                        t={t}
                        accent={t.text}
                      />
                      <CampoHistorico
                        label="Dia Alterado"
                        valor={fmtDiaIso(det.dia_iso)}
                        t={t}
                        accent={t.text}
                      />
                      <CampoHistorico label="Observação" valor={obs || "—"} t={t} accent={t.text} />
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalBase>
  );
}
