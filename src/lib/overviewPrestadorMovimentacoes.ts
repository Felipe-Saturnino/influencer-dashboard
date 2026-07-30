/**
 * Movimentações de turno (Marketplace) para Overview Prestador —
 * snapshot de contraparte por célula (funcionario|dia).
 */

export type OverviewPrestadorMovimentacaoTipo = "compra" | "venda" | "troca";

export type OverviewPrestadorMovimentacaoCelula = {
  tipo: OverviewPrestadorMovimentacaoTipo;
  contraparteNome: string;
  turnoTrabalhar: string | null;
  estudioTrabalhar: string | null;
};

export function chaveMovimentacaoCelula(funcionarioId: string, diaIso: string): string {
  return `${funcionarioId}|${diaIso}`;
}

/** Normaliza payload jsonb da RPC `dash_overview_prestador_movimentacoes_mes`. */
export function mapOverviewPrestadorMovimentacoes(
  data: unknown,
): Map<string, OverviewPrestadorMovimentacaoCelula> {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return new Map();
    }
  }
  if (!Array.isArray(payload)) return new Map();

  const out = new Map<string, OverviewPrestadorMovimentacaoCelula>();
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const funcionarioId = String(row.funcionario_id ?? "").trim();
    const diaIso = String(row.dia_iso ?? "").slice(0, 10);
    const tipo = String(row.tipo ?? "").trim();
    const contraparteNome = String(row.contraparte_nome ?? "").trim();
    if (
      !funcionarioId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(diaIso) ||
      !["compra", "venda", "troca"].includes(tipo) ||
      !contraparteNome
    ) {
      continue;
    }
    out.set(chaveMovimentacaoCelula(funcionarioId, diaIso), {
      tipo: tipo as OverviewPrestadorMovimentacaoTipo,
      contraparteNome,
      turnoTrabalhar: row.turno_trabalhar == null ? null : String(row.turno_trabalhar).trim() || null,
      estudioTrabalhar:
        row.estudio_trabalhar == null ? null : String(row.estudio_trabalhar).trim() || null,
    });
  }
  return out;
}

export function situacaoEhCompraMarketplace(situacao: string): boolean {
  return situacao === "Compra" || situacao.startsWith("Compra - ");
}

/** Copy PT-BR do Detalhamento — usa a situação da grade; snapshot só enriquece. */
export function formatarDetalheMovimentacao(
  ocorrencia: "Troca" | "Venda" | "Compra",
  snap: OverviewPrestadorMovimentacaoCelula | undefined,
): string {
  if (!snap?.contraparteNome) return "—";
  const nome = snap.contraparteNome;
  if (ocorrencia === "Venda") return `Vendido para ${nome}`;

  const extras = [snap.turnoTrabalhar, snap.estudioTrabalhar].filter(
    (x): x is string => Boolean(x && x !== "—"),
  );
  const sufixo = extras.length > 0 ? ` · ${extras.join(" · ")}` : "";

  if (ocorrencia === "Compra") return `Comprado de ${nome}${sufixo}`;
  return `Troca com ${nome}${sufixo}`;
}
