# Telecom — Monitor Lobby Jonbet

Job horário que lê o Cassino Ao Vivo da Jonbet (`jonbet.bet.br/api/games/search`) e envia o snapshot para a Edge `monitor-lobby-jonbet`.

**Stack:** SoftSwiss (mesmo padrão da Blaze). Mesas Spin: `provider.slug = spin`.

## IDs Spin (Gestão de Estúdios — ID Jonbet)

| Mesa | ID (`records[].id`) |
|------|---------------------|
| Baccarat Sports Club | `67416` |
| Blackjack Sports Club | `67415` |
| Roleta Brasileira Sports Club | `67418` |
| Futebol Brasileiro Sports Club | `67417` |

Cadastro na Spin; a Telecom **não** mantém lista de IDs.

## Endpoint

```
https://jonbet.bet.br/api/games/search?page=1&limit=30&search=&game_category_slugs=live-casino&xp_enabled=false&game_provider_slugs=&bonus_betting_enabled=false
```

**Atenção no F12:** se a URL mostrar `game_category_slugs=[object Object],…` é bug do front — use só `live-casino` (como acima). Página: `https://jonbet.bet.br/pt/games/category/live-casino`.

## Pacote Telecom

| Item | Valor |
|------|--------|
| Script | `scripts/monitor-lobby-jonbet-run.mjs` |
| Wrapper | `scripts/run-monitor-lobby-jonbet.ps1` |
| Cron | A cada **1 hora** (`America/Sao_Paulo`) |
| Env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mesmo `.env.monitor` do Blaze) |
| Cookie | **Não** precisa |

## Teste

```bash
node scripts/monitor-lobby-jonbet-run.mjs --dry-run
```

Esperado: `mesas_encontradas` = 4 (ou o total cadastrado).

Setup Spin: `docs/SETUP-MONITOR-LOBBY-JONBET.md`
