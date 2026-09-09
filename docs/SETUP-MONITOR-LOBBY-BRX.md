# Monitor de lobby — BRX Bet

Automação horária da posição das mesas Spin na grade **Todos os jogos** (`/games/category/all`) da BrxBet (Good Game Labs / Network).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID BRX Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = brx_bet`) |
| Valor | `data[].id` de `casino-games/filter` na página `/games/category/all` |

| Mesa | ID a cadastrar |
|------|----------------|
| Roleta / Roulette | `good-game-v2:live-roulette` |
| Blackjack | `good-game-v2:live-blackjack` |
| Baccarat | `good-game-v2:live-baccarat` |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` |

**Nota:** mesmos IDs da Bateu / Rico.

## API

- Página: `https://brx.bet.br/games/category/all`
- Request: `GET https://brx.bet.br/api/casino-games/filter?sort=&per_page=24&page=1&term=`
- Ranking: ordem paginada de `data[]`
- Paginação: até achar todos os IDs ou esgotar `last_page` (teto 300)

## Deploy

```bash
supabase functions deploy monitor-lobby-brx
```

Migration: `20260907143100_integrations_lobby_brx.sql` (slug `lobby_brx`).

Secret opcional: `MONITOR_LOBBY_BRX_INGEST_SECRET`

## Produção

Job Telecom: `scripts/monitor-lobby-brx-run.mjs` + `scripts/lib/monitorLobbySoftGamingsFilterScan.mjs`.

Handoff: `docs/TELECOM-MONITOR-LOBBY-BRX.md`
