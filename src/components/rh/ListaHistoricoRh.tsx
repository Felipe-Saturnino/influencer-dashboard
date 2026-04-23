import { ExternalLink, Loader2, Paperclip } from "lucide-react";
import type { CSSProperties } from "react";
import { FONT } from "../../constants/theme";
import type { RhFuncionarioHistorico } from "../../types/rhFuncionario";

export const HIST_TIPO_LABEL: Record<string, string> = {
  revisao_contrato: "Revisão de Contrato",
  periodo_indisponibilidade: "Período de Indisponibilidade",
  retorno_indisponibilidade: "Retorno de Indisponibilidade",
  alinhamento_formal: "Alinhamento Formal",
  termino_prestacao: "Término da Prestação",
  reativacao_prestacao: "Reativação da Prestação",
  rh_talks: "RH Talks",
  anotacao_rh: "Anotação do RH",
  staff_gestao_edicao: "Edição (Gestão de Staff)",
  dados_cadastro_self: "Atualização — Dados de Cadastro",
};

const HIST_TIPO_SURFACE: Record<string, { bg: string; border: string }> = {
  revisao_contrato: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.38)" },
  periodo_indisponibilidade: { bg: "rgba(245, 158, 11, 0.14)", border: "rgba(245, 158, 11, 0.42)" },
  retorno_indisponibilidade: { bg: "rgba(167, 139, 250, 0.16)", border: "rgba(167, 139, 250, 0.42)" },
  alinhamento_formal: { bg: "rgba(249, 115, 22, 0.14)", border: "rgba(249, 115, 22, 0.4)" },
  termino_prestacao: { bg: "rgba(232, 64, 37, 0.1)", border: "rgba(232, 64, 37, 0.36)" },
  reativacao_prestacao: { bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.4)" },
  rh_talks: { bg: "rgba(107, 114, 128, 0.14)", border: "rgba(107, 114, 128, 0.42)" },
  anotacao_rh: { bg: "rgba(100, 116, 139, 0.12)", border: "rgba(100, 116, 139, 0.38)" },
  staff_gestao_edicao: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.36)" },
  dados_cadastro_self: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.34)" },
};

export function cardStyleHistoricoPorTipo(
  tipo: string,
  t: { cardBorder: string; inputBg: string },
): CSSProperties {
  const c = HIST_TIPO_SURFACE[tipo];
  return {
    marginBottom: 14,
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${c?.border ?? t.cardBorder}`,
    background: c?.bg ?? t.inputBg,
    fontFamily: FONT.body,
    fontSize: 13,
  };
}

/** Formata `YYYY-MM-DD` ou ISO para exibição pt-BR; vazio → "—". */
export function fmtDataIsoPtBr(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return "—";
  const s = String(iso).slice(0, 10);
  const p = s.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
  return s;
}

export function ListaHistoricoRh({
  items,
  loading,
  t,
}: {
  items: RhFuncionarioHistorico[];
  loading: boolean;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  if (loading) {
    return (
      <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
        Carregando histórico…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Sem dados para o período selecionado.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((h) => {
        const anexos = Array.isArray(h.anexos)
          ? (h.anexos as { name?: string; publicUrl: string }[]).filter((a) => a?.publicUrl)
          : [];
        const det = h.detalhes ?? {};
        const titulo = HIST_TIPO_LABEL[h.tipo] ?? h.tipo;
        const quando = new Date(h.created_at).toLocaleString("pt-BR");
        return (
          <li key={h.id} style={cardStyleHistoricoPorTipo(h.tipo, t)}>
            <div style={{ fontWeight: 800, color: t.text, marginBottom: 6 }}>{titulo}</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
              {quando}
              {det.usuario_label ? ` · ${String(det.usuario_label)}` : ""}
            </div>
            {"alteracoes" in det && Array.isArray(det.alteracoes) ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: t.text }}>
                {(det.alteracoes as { campo: string; antes: string; depois: string }[]).map((alt, j) => (
                  <li key={j} style={{ marginBottom: 4 }}>
                    <strong>{alt.campo}:</strong> {alt.antes} → {alt.depois}
                  </li>
                ))}
              </ul>
            ) : null}
            {h.tipo === "periodo_indisponibilidade" && "data_saida" in det ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <div>
                  <strong>Data de saída:</strong> {String(det.data_saida ?? "—")}
                </div>
                {det.data_retorno ? (
                  <div>
                    <strong>Data de retorno:</strong> {String(det.data_retorno)}
                  </div>
                ) : null}
                {det.observacao ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Observação:</strong> {String(det.observacao)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "termino_prestacao" && "data_termino" in det ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <div>
                  <strong>Data de término:</strong> {String(det.data_termino ?? "—")}
                </div>
                {det.observacao ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Observação:</strong> {String(det.observacao)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "retorno_indisponibilidade" && det.observacao ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <strong>Observação:</strong> {String(det.observacao)}
              </div>
            ) : null}
            {h.tipo === "alinhamento_formal" && det.observacao ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <strong>Observação:</strong> {String(det.observacao)}
              </div>
            ) : null}
            {h.tipo === "rh_talks" ? (
              <div style={{ color: t.text, marginTop: 6, lineHeight: 1.5 }}>
                {det.assunto ? (
                  <div>
                    <strong>Assunto:</strong> {String(det.assunto)}
                  </div>
                ) : null}
                {det.data_rh_talks ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Data do RH Talks:</strong> {fmtDataIsoPtBr(String(det.data_rh_talks))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "anotacao_rh" ? (
              <div style={{ color: t.text, marginTop: 6, lineHeight: 1.5 }}>
                {det.tipo_visibilidade ? (
                  <div>
                    <strong>Tipo:</strong> {String(det.tipo_visibilidade)}
                  </div>
                ) : null}
                {det.assunto ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Assunto:</strong> {String(det.assunto)}
                  </div>
                ) : null}
                {det.data_conversa ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Data da conversa:</strong> {fmtDataIsoPtBr(String(det.data_conversa))}
                  </div>
                ) : null}
                {det.ata_reuniao ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Ata da reunião:</strong>
                    <pre
                      style={{
                        margin: "6px 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        color: t.text,
                        maxHeight: 220,
                        overflow: "auto",
                        padding: 8,
                        borderRadius: 8,
                        background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                      }}
                    >
                      {String(det.ata_reuniao)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
            {anexos.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
                {anexos.map((a, k) => (
                  <a
                    key={k}
                    href={a.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--brand-action, #7c3aed)",
                      fontWeight: 600,
                    }}
                  >
                    <Paperclip size={14} aria-hidden />
                    {a.name || "Anexo"}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
