# Monitor de lobby — Esportiva Bet

Automação horária da posição das mesas Spin no Cassino ao Vivo da Esportiva Bet (agregador **Good Game Labs** / API BS2Bet).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Esportiva Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = esportiva_bet`) |
| Valor | `data[].id` da API (ex.: `good-game-v2:live-roulette`) — **não** o `slug` |

## API

- Base (F12 no site): `https://esportiva.bet.br/api/casino-games/filter`
- Query: `categories[]=cassino-ao-vivo&per_page=50` (**não** `jogos-crash`)
- Mesas Spin: provider **Good Game Labs** (`goodgame`), ids `good-game-v2:live-*`
- Ranking: campo `order` (menor = mais à frente) → posição 1…N no conjunto Cassino ao Vivo
- Concorrentes: mesmo tipo de jogo cujo `id` **não** está na lista Spin

**Atenção:** o tile na home pode dizer “Roleta Brasileira / Blackjack VIP” com logo Spin; na API o nome costuma ser `Roulette` / `Blackjack` / `Baccarat` sob Good Game Labs. Cadastre o campo **`id`**, não o título da UI.

## Deploy

```bash
supabase functions deploy monitor-lobby-esportiva
```

Migration: `20260804120000_integrations_lobby_esportiva.sql` (slug `lobby_esportiva`).

Secret opcional: `MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET`

## Produção

Job **Telecom** com `scripts/monitor-lobby-esportiva-run.mjs` (igual Blaze: fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-ESPORTIVA.md`
