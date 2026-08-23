export type LobbyPosRow = {
  mesa_identificacao: string
  nome_mesa: string
  posicao: number | null
}

export function normNomeMesa(s: string): string {
  return s.trim().toLocaleLowerCase('pt-BR')
}

export function indexPosicoesLobby(rows: LobbyPosRow[]): {
  byId: Map<string, number | null>
  byNome: Map<string, number | null>
} {
  const byId = new Map<string, number | null>()
  const byNome = new Map<string, number | null>()
  for (const r of rows) {
    const id = (r.mesa_identificacao ?? '').trim()
    const nome = (r.nome_mesa ?? '').trim()
    const pos = r.posicao != null && Number.isFinite(Number(r.posicao))
      ? Number(r.posicao)
      : null
    if (id) {
      if (pos != null || !byId.has(id)) byId.set(id, pos)
    }
    if (nome && pos != null) {
      const key = normNomeMesa(nome)
      if (!byNome.has(key)) byNome.set(key, pos)
    }
  }
  return { byId, byNome }
}

/** Posição só por ID Spin (sem fallback por nome — evita misturar Network com Dedicado). */
export function posicaoLobbyPorSpinIds(
  idx: ReturnType<typeof indexPosicoesLobby>,
  spinIds: readonly string[],
): number | null {
  for (const id of spinIds) {
    const key = id.trim()
    if (!key) continue
    const p = idx.byId.get(key)
    if (p != null) return p
  }
  return null
}

/**
 * Legado: IDs preferidos → fallback IDs → nome normalizado.
 * Usar apenas onde o match por nome é intencional (não no bloco Mesas Dedicadas).
 */
export function posicaoLobbyParaMesa(
  idx: ReturnType<typeof indexPosicoesLobby>,
  opts: {
    nomeKey: string
    spinIdsPreferidos: readonly string[]
    spinIdsFallback: readonly string[]
  },
): number | null {
  for (const id of opts.spinIdsPreferidos) {
    const p = idx.byId.get(id.trim())
    if (p != null) return p
  }
  for (const id of opts.spinIdsFallback) {
    const p = idx.byId.get(id.trim())
    if (p != null) return p
  }
  return idx.byNome.get(opts.nomeKey) ?? null
}
