# Monitor de lobby — Rico Bet

Automação horária da posição das mesas Spin na grade **Todos os jogos** (`/games/category/all`) da RicoBet (Good Game Labs / Network).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Rico Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = rico_bet`) |
| Valor | `data[].id` de `casino-games/filter` na página `/games/category/all` |

| Mesa | ID a cadastrar |
|------|----------------|
| Roleta / Roulette | `good-game-v2:live-roulette` |
| Blackjack | `good-game-v2:live-blackjack` |
| Baccarat | `good-game-v2:live-baccarat` |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` |

**Nota:** mesmos IDs da Bateu / BRX.

## API

- Página: `https://rico.bet.br/games/category/all`
- Request: `GET https://rico.bet.br/api/casino-games/filter?sort=&per_page=24&page=1&term=`
- Ranking: ordem paginada de `data[]`
- Paginação: até achar todos os IDs ou esgotar `last_page` (teto 300)

## Deploy

```bash
supabase functions deploy monitor-lobby-rico
```

Migration: `20260907143000_integrations_lobby_rico.sql` (slug `lobby_rico`).

Secret opcional: `MONITOR_LOBBY_RICO_INGEST_SECRET`

## Produção

Job Telecom: `scripts/monitor-lobby-rico-run.mjs` + `scripts/lib/monitorLobbySoftGamingsFilterScan.mjs`.

Handoff: `docs/TELECOM-MONITOR-LOBBY-RICO.md`
