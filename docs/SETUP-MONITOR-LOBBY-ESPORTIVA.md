# Monitor de lobby — Esportiva Bet

Automação horária da posição das mesas Spin na prateleira **Cassino Ao Vivo** da **home** Esportiva Bet (CMS painel / agregador **Good Game Labs**).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Esportiva Bet | `mesas_spin_operadora_identificacao` (`operadora_slug = esportiva_bet`) |
| Valor | `child[].id` da seção home — **não** o título da UI, **não** o ranking do catálogo `casino-games/filter` |

IDs canônicos da home (conferir no F12 se a Esportiva alterar a curadoria):

| Mesa | ID a cadastrar |
|------|----------------|
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` |
| Roleta / Roulette | `good-game-v2:live-roulette` |
| Blackjack | `5685` (alias aceito: `good-game-v2:live-blackjack`) |
| Baccarat | `good-game-v2:live-baccarat` |

## API

- Base (F12): `https://painel.esportivabet.cloud/api/home-sections/public`
- Seção: `title` = **Cassino Ao Vivo** (`games-fixed`)
- Ranking: ordem de `child[]` (posição 1 = primeiro item)
- Concorrentes: mesmo tipo de jogo na prateleira cujo `id` **não** está na lista Spin

**Atenção:** «Ver todos» (`/games/category/cassino-ao-vivo/popular`) e o filter `casino-games/filter` **não** reproduzem a ordem da home — o monitor segue só o CMS `home-sections`.

## Deploy

```bash
supabase functions deploy monitor-lobby-esportiva
```

Migration: `20260804120000_integrations_lobby_esportiva.sql` (slug `lobby_esportiva`).

Secret opcional: `MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET`

## Produção

Job **Telecom** com `scripts/monitor-lobby-esportiva-run.mjs` (igual Blaze: fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-ESPORTIVA.md`
