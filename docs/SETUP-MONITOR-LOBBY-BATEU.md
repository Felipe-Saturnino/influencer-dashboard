# Monitor de lobby — Bateu Bet

Automação horária da posição das mesas Spin na grade **Todos os jogos** da Bateu.bet (agregador **Good Game Labs** / Network Sports Club).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Bateu Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = bateu_bet`) |
| Valor | `data[].id` de `casino-games/list` na categoria `todos-os-jogos` |

IDs canônicos (conferir no F12 se a Bateu alterar):

| Mesa | ID a cadastrar |
|------|----------------|
| Roleta / Roulette | `good-game-v2:live-roulette` |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` |
| Baccarat | `good-game-v2:live-baccarat` |
| Blackjack | `good-game-v2:live-blackjack` |

## API

- Página produto: `https://bateu.bet.br/games/category/todos-os-jogos`
- Request: `GET https://bateu.bet.br/api/casino-games/list/?categories[]=todos-os-jogos&page=1&per_page=24`
- Ranking: ordem paginada de `data[]` (posição 1 = primeiro item da página 1)
- Paginação: até achar todos os IDs cadastrados ou esgotar `last_page` (teto 200)
- Concorrentes: mesmo tipo de jogo na grade cujo `id` **não** está na lista Spin

**Atenção:** `casino-games/filter?categories[]=cassino-ao-vivo` e `home-sections` **não** são a fonte deste monitor.

## Deploy

```bash
supabase functions deploy monitor-lobby-bateu
```

Migration: `20260907140000_integrations_lobby_bateu.sql` (slug `lobby_bateu`).

Secret opcional: `MONITOR_LOBBY_BATEU_INGEST_SECRET`

## Produção

Job **Telecom** com `scripts/monitor-lobby-bateu-run.mjs` (fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-BATEU.md`

## Pré-requisito Spin

1. Operadora `bateu_bet` ativa em Gestão de Operadoras.
2. Nas 4 mesas Network (Sports Club), preencher **ID Bateu Bet** com os IDs da tabela acima.
3. Deploy da Edge + migration `integrations`.
4. Enviar pacote Telecom (handoff + `.mjs`).
