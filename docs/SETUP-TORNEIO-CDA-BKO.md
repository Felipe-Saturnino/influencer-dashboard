# Torneio Live CDA — sync BKO → Supabase

Ranking ao vivo do torneio **Casa de Apostas × Spin Gaming**. Sem API própria: atualização **sob demanda** (várias vezes durante as horas do evento), no mesmo espírito de Grafana / Superset.

| Item | Valor |
|------|--------|
| Origem | PLS Backoffice (`bo2.sg.onairent.live`) |
| Participantes | User Name CDA (`1990329`, …) → `playerId` + **Screen Name** (`screenName` na busca BKO) |
| Mesas | `tableSG6134`, `tableSG6131`, `tableSG6132`, `bacSG6133`, `roSG6130` |
| Destino | `torneio_cda_*` no Supabase |
| Script | `scripts/torneio-cda-bko-sync.mjs` |

## Pré-requisitos

1. Aplicar a migração `supabase/migrations/20260901180000_torneio_cda_live.sql`.
2. Ajustar no Supabase o registro `torneio_cda` (`periodo_inicio`, `periodo_fim`, `ativo = true` no dia do torneio).
3. `.env` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

## Modo preferido — navegador (agente / você logado)

1. Abrir o BKO logado: `https://bo2.sg.onairent.live/backoffice/static/bo/find-players`
2. Console → colar `scripts/torneio-cda-bko-extract-browser.js` (ajustar `PERIODO` se necessário).
3. Salvar o JSON em `tmp/torneio-cda-bko.json`.
4. Gravar no Supabase:

```powershell
node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026 --arquivo=tmp/torneio-cda-bko.json --dry-run
node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026 --arquivo=tmp/torneio-cda-bko.json
```

**Durante o torneio:** repetir passos 2–4 a cada X minutos (ex.: a cada 2–5 min).

O agente no Cursor pode executar a extração via sessão do browser (CDP) e rodar o script — peça: *«atualiza o torneio CDA»*.

## Modo cookie (fallback)

1. Copie `scripts/env.bko-pls.example` → `.env.bko-pls`
2. Cole `BKO_PLS_COOKIE` (DevTools → Network → request ao BKO → Cookie).
3. Busca + grava em um comando:

```powershell
node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026
```

Só extrair JSON sem gravar: `--fetch-only`.

## Pontuação (igual ao mockup)

| Regra | Pontos |
|-------|--------|
| Rodada jogada (mesa CDA) | 500 |
| Por R$ 1,00 apostado na rodada | +10 |
| Rodada ganha (`net > 0`) | +1.000 |
| Por R$ 1,00 ganho (líquido positivo) | +15 |

## Tabelas Supabase

| Tabela | Conteúdo |
|--------|----------|
| `torneio_cda` | Config (slug, período, ativo) |
| `torneio_cda_participante` | User Names + Screen Name BKO (cache em `apelido`) |
| `torneio_cda_ranking` | Snapshot atual — coluna `apelido` = Screen Name na página |
| `torneio_cda_consolidado` | KPIs totais + `sincronizado_em` |
| `torneio_cda_atividade` | Últimas vitórias (upsert por `game_id`) |

RLS: leitura **anon** apenas quando `torneio_cda.ativo = true`.

## Página pública

| Item | Valor |
|------|--------|
| URL | `/TorneioCDA` (mesmo domínio da plataforma, sem login) |
| Componente | `src/pages/public/TorneioCdaLivePage.tsx` |
| Polling | 30 s (ranking, KPIs, atividades) |

## Participantes seed (User Name — teste)

Cadastre só o **User Name** (`user_name`). O **Screen Name** vem do BKO a cada sync.

| User Name | Screen Name BKO (exemplo) |
|-----------|---------------------------|
| 1990329 | Nathan |
| 1989697 | Daci |
| 1713222 | Gusti |
| 2152775 | Matrix00 |
| 2032222 | DG |

## API BKO (referência)

| Ação | Endpoint |
|------|----------|
| Buscar jogador | `GET /backoffice/api/players/search?exactMatch=true&pattern={userName}` → `screenName`, `playerId`, `externalName` |
| Rodadas do jogador | `GET /backoffice/api/players/search/player/games/{playerId}?offset=&limit=1000&from=&to=` |

Filtro de período: usar `from` / `to` em ISO UTC — **não** `dateFrom` / `dateTo`.
