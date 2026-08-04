/**
 * Movimentações de turno (Marketplace) para Overview Prestador —
 * snapshot de contraparte por célula (funcionario|dia).
 */

export type OverviewPrestadorMovimentacaoTipo = "compra" | "venda" | "troca";

/** Tipo da oferta aceita — distingue turno vendido de folga vendida. */
export type OverviewPrestadorTipoOferta = "venda_turno" | "venda_folga" | "oferta_troca";

export type OverviewPrestadorMovimentacaoCelula = {
  tipo: OverviewPrestadorMovimentacaoTipo;
  /** Presente após migração `…_tipo_oferta`; ausente em cache legado. */
  tipoOferta: OverviewPrestadorTipoOferta | null;
  contraparteNome: string;
  turnoTrabalhar: string | null;
  estudioTrabalhar: string | null;
};

export function chaveMovimentacaoCelula(funcionarioId: string, diaIso: string): string {
  return `${funcionarioId}|${diaIso}`;
}

function parseTipoOferta(raw: unknown): OverviewPrestadorTipoOferta | null {
  const t = String(raw ?? "").trim();
  if (t === "venda_turno" || t === "venda_folga" || t === "oferta_troca") return t;
  return null;
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
      tipoOferta: parseTipoOferta(row.tipo_oferta),
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

/**
 * Troca aceita grava o par na grade como `Venda` (dia liberado) + `Compra - Turno`
 * (dia assumido) — só o snapshot do Marketplace identifica a movimentação como troca.
 */
export function movimentacaoEhTroca(
  snap: OverviewPrestadorMovimentacaoCelula | undefined,
): boolean {
  return snap?.tipo === "troca" || snap?.tipoOferta === "oferta_troca";
}

/** Célula `Venda` de oferta venda_turno (quem saiu do turno). */
export function movimentacaoEhTurnoVendido(
  situacao: string,
  snap: OverviewPrestadorMovimentacaoCelula | undefined,
): boolean {
  if (situacao !== "Venda" || movimentacaoEhTroca(snap)) return false;
  if (snap?.tipoOferta === "venda_folga") return false;
  // Sem tipo_oferta (RPC antiga): trata Venda não-troca como turno vendido.
  return snap?.tipoOferta === "venda_turno" || snap?.tipoOferta == null;
}

/** Célula `Venda` de oferta venda_folga (interessado libera o turno ao aceitar a folga). */
export function movimentacaoEhFolgaVendida(
  situacao: string,
  snap: OverviewPrestadorMovimentacaoCelula | undefined,
): boolean {
  if (situacao !== "Venda" || movimentacaoEhTroca(snap)) return false;
  return snap?.tipoOferta === "venda_folga";
}

/** Copy PT-BR do Detalhamento — usa a situação da grade; snapshot só enriquece. */
export function formatarDetalheMovimentacao(
  ocorrencia: "Troca" | "Venda" | "Compra" | "Folga Vendida",
  snap: OverviewPrestadorMovimentacaoCelula | undefined,
): string {
  if (!snap?.contraparteNome) return "—";
  const nome = snap.contraparteNome;
  if (ocorrencia === "Venda") return `Vendido para ${nome}`;
  if (ocorrencia === "Folga Vendida") return `Folga vendida · ${nome}`;

  const extras = [snap.turnoTrabalhar, snap.estudioTrabalhar].filter(
    (x): x is string => Boolean(x && x !== "—"),
  );
  const sufixo = extras.length > 0 ? ` · ${extras.join(" · ")}` : "";

  if (ocorrencia === "Compra") return `Comprado de ${nome}${sufixo}`;
  return `Troca com ${nome}${sufixo}`;
}
