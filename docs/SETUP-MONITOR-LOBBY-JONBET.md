# Monitor de lobby — Jonbet

Automação horária da posição das mesas Spin no Cassino Ao Vivo da Jonbet (SoftSwiss — igual Blaze).

## Identificadores

| Mesa | `mesa_identificacao_operadora` (ID Jonbet) |
|------|--------------------------------------------|
| Baccarat Sports Club | `67416` |
| Blackjack Sports Club | `67415` |
| Roleta Brasileira Sports Club | `67418` |
| Futebol Brasileiro Sports Club | `67417` |

Slug da operadora: **`jonbet`** (Gestão de Operadoras + Gestão de Estúdios).

## API

- `https://jonbet.bet.br/api/games/search` — query `game_category_slugs=live-casino`
- Match: `String(record.id)` ↔ ID na Gestão
- Concorrentes: `provider.slug !== "spin"` (mesmo tipo)

## Deploy

```bash
supabase functions deploy monitor-lobby-jonbet
```

Migration: `20260805140000_integrations_lobby_jonbet.sql` (slug `lobby_jonbet`).

Secret opcional: `MONITOR_LOBBY_JONBET_INGEST_SECRET`

## Produção

Job Telecom: `scripts/monitor-lobby-jonbet-run.mjs` — handoff `docs/TELECOM-MONITOR-LOBBY-JONBET.md`
