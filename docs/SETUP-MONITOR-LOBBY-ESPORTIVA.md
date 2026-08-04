# Monitor de lobby — Esportiva Bet

Automação horária da posição das mesas Spin no Cassino ao Vivo da Esportiva Bet (agregador **Good Game Labs** / API BS2Bet).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Esportiva Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = esportiva_bet`) |
| Valor | `data[].id` da API (ex.: `good-game-v2:live-roulette`) — **não** o `slug` |

## API

- Base: `https://api-esportiva-betbr.bs2bet.com/v2/casino-games/filter`
- Ranking: campo `order` (menor = mais à frente) → posição 1…N
- Concorrentes: mesmo tipo de jogo cujo `id` **não** está na lista Spin (tudo é GG Labs)

## Deploy

```bash
supabase functions deploy monitor-lobby-esportiva
```

Migration: `20260804120000_integrations_lobby_esportiva.sql` (slug `lobby_esportiva`).

Secret opcional: `MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET`

## Produção

Job **Telecom** com `scripts/monitor-lobby-esportiva-run.mjs` (igual Blaze: fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-ESPORTIVA.md`
