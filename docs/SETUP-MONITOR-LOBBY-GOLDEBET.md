# Monitor de lobby — Goldebet

Automação horária da posição das mesas Spin na grade **Cassino Ao Vivo (Live)** da Goldebet (agregador **GG Labs** / Network Sports Club).

## Identificadores

| Fonte | Uso |
|-------|-----|
| Gestão de Estúdios → ID Goldebet | `mesas_spin_operadora_identificacao` (`operadora_slug = goldebet`) |
| Valor | `String(data[].id)` de `v2/casino-games` com `casino_game_category_ids[]=2` e `order=clicks` |

IDs canônicos (validação **2026-09-21**; conferir no F12 se a Goldebet alterar):

| Mesa | ID a cadastrar | ~posição (`order=clicks`) |
|------|----------------|---------------------------|
| Live BlackJack | `12778` | ~P350 |
| Futebol Brasileiro | `12777` | ~P419 |
| Roulette | `12776` | ~P457 |
| Baccarat | `12775` | ~P489 |

**Atenção:** IDs são **numéricos**. Não usar `good-game-v2:*` (formato Bateu/Donald).

## API

- Página produto: `https://goldebet.bet.br/casino/live`
- Request: `GET https://goldebet.bet.br/v2/casino-games?page=1&casino_game_category_ids[]=2&order=clicks`
- Resposta: `{ data, links, meta }` — normalizar `meta.last_page`, `meta.per_page` (20), `meta.total` (~690)
- Ranking: ordem paginada de `data[]` (posição 1 = primeiro item da página 1)
- Posição: `(page − 1) × per_page + índice` (1-based)
- Paginação: até achar todos os IDs cadastrados ou esgotar `meta.last_page` (teto 200)
- Concorrentes: mesmo tipo de jogo na grade cujo `id` **não** está na lista Spin

**Atenção:** outras categorias / ordenações **não** são a fonte deste monitor.

## Deploy

```bash
supabase functions deploy monitor-lobby-goldebet
```

Migration: `20260921120000_integrations_lobby_goldebet.sql` (slug `lobby_goldebet`, nome `Lobby Goldebet`).

Secret opcional: `MONITOR_LOBBY_GOLDEBET_INGEST_SECRET` (header `x-monitor-lobby-goldebet-secret`).

Body ingest (Telecom): `{ dry_run?, goldebet_lobby, goldebet_paginas_lidas? }`.

## Produção

Job **Telecom** com `scripts/monitor-lobby-goldebet-run.mjs` (já existente — fetch fora da Edge + ingest no body).

Handoff: `docs/TELECOM-MONITOR-LOBBY-GOLDEBET.md`

## Pré-requisito Spin

1. Operadora `goldebet` ativa em Gestão de Operadoras.
2. Nas mesas Network (Sports Club), preencher **ID Goldebet** com os IDs numéricos da tabela acima.
3. Deploy da Edge + migration `integrations`.
4. Enviar pacote Telecom (handoff + `.mjs`).
