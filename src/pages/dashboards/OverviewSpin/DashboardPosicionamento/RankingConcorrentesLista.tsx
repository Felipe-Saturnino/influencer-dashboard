import { FONT } from "../../../../constants/theme";
import type { Theme } from "../../../../constants/theme";
import { TabelaPaginacaoBar } from "../../../../components/TabelaPaginacaoBar";
import { useTabelaPaginacao } from "../../../../hooks/useTabelaPaginacao";
import { TABELA_PAGE_SIZE } from "../../../../lib/tablePagination";
import {
  fmtPosicao,
  posicaoBgColor,
  posicaoTextColor,
  type ConcorrenteLobby,
} from "../../../../lib/lobbyMonitorHelpers";

type Props = {
  items: ConcorrenteLobby[];
  t: Theme;
  resetKey: string;
};

/**
 * Ranking de concorrentes — vista paginada (20). Totais/KPIs usam o array completo no pai.
 * Paginação explícita (hook + barra) para não depender só do render-prop de TabelaComPaginacao.
 */
export function RankingConcorrentesLista({ items, t, resetKey }: Props) {
  const pag = useTabelaPaginacao(items, resetKey);
  /** Defesa: nunca renderizar mais que TABELA_PAGE_SIZE na vista. */
  const vista =
    pag.linhasPagina.length > TABELA_PAGE_SIZE
      ? pag.linhasPagina.slice(0, TABELA_PAGE_SIZE)
      : pag.linhasPagina;

  return (
    <div data-testid="ranking-concorrentes">
      <ul
        style={{ listStyle: "none", margin: 0, padding: 0 }}
        aria-label={`Ranking de concorrentes — mostrando ${vista.length} de ${items.length}`}
      >
        {vista.map((j) => (
          <li
            key={j.game_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: `1px solid ${t.cardBorder}`,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <span
              style={{
                minWidth: 40,
                padding: "4px 8px",
                borderRadius: 8,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 12,
                background: posicaoBgColor(j.posicao),
                color: posicaoTextColor(j.posicao),
              }}
            >
              {fmtPosicao(j.posicao)}
            </span>
            <span
              style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }}
              title={j.name}
            >
              {j.name}
            </span>
            <span
              style={{
                color: t.textMuted,
                fontSize: 12,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={j.provider_name}
            >
              {j.provider_name}
            </span>
          </li>
        ))}
      </ul>
      <TabelaPaginacaoBar
        t={t}
        page={pag.paginaSafe}
        pageSize={pag.pageSize}
        totalItems={pag.totalItems}
        onPageChange={pag.setPagina}
        hideIfSinglePage={items.length <= TABELA_PAGE_SIZE}
      />
    </div>
  );
}
