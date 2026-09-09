# Monitor de lobby — Donald Bet

Automação horária da posição das mesas Spin na grade **Todos os jogos** da DonaldBet (agregador **Good Game Labs** / Network Sports Club).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Donald Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = donald_bet`) |
| Valor | `data[].id` de `games/category/todos-os-jogos` |

IDs canônicos (conferir no F12 se a Donald alterar):

| Mesa | ID a cadastrar |
|------|----------------|
| Roleta / Roulette | `good-game-v2:live-roulette` |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` |
| Baccarat | `good-game-v2:live-baccarat` |
| Blackjack | `good-game-v2:live-blackjack` |

## API

- Página produto: `https://donald.bet.br/cassino/categoria/todos-os-jogos`
- Request: `GET https://donald.bet.br/api/games/category/todos-os-jogos?offset=0&limit=48`
- Response: `data`, `total`, `hasMore`, `lastPage`, `perPage`
- Ranking: posição = `offset + índice + 1` em `data[]`
- Paginação: até achar todos os IDs cadastrados ou esgotar o catálogo (teto 200 páginas / limit 48)
- Concorrentes: mesmo tipo de jogo na grade cujo `id` **não** está na lista Spin

**Nota (validado 2026-09):** mesas GG Labs podem existir em `/api/games/provider/goodgame` e **ainda não** aparecer na grade Todos os jogos. O monitor **só** usa a categoria Todos os jogos — até a curadoria incluir os títulos, o job pode gravar `parcial` / 0 encontradas.

**Atenção:** `casino-games/list`, `casino-games/filter` e `home-sections` **não** são a fonte deste monitor.

## Deploy

```bash
supabase functions deploy monitor-lobby-donald
```

Migration: `20260908120000_integrations_lobby_donald.sql` (slug `lobby_donald`).

Secret opcional: `MONITOR_LOBBY_DONALD_INGEST_SECRET`

## Produção

Job **Telecom** com `scripts/monitor-lobby-donald-run.mjs` + `scripts/lib/monitorLobbyGamesCategoryOffsetScan.mjs` (fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-DONALD.md`

## Pré-requisito Spin

1. Operadora `donald_bet` ativa em Gestão de Operadoras.
2. Nas mesas Network (Sports Club), preencher **ID Donald Bet** com os IDs da tabela acima.
3. Deploy da Edge + migration `integrations`.
4. Enviar pacote Telecom (handoff + `.mjs` + lib offset).
