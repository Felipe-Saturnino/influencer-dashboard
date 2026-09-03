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
| Por R$ 1,00 apostado na rodada | +100 |
| Rodada ganha (`net > 0`) | +1.000 |
| Por R$ 1,00 ganho (líquido positivo) | +150 |

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

## Participantes do evento (03/09/2026)

Nomes na UI são **travados** em `torneio_cda_participante.apelido` (não usam Screen Name do BKO). O sync só lê User Name + jogos.

| User Name | Nome na UI |
|-----------|------------|
| 2205336 | Alessandro Tomazelli |
| 2204772 | Eliane Luiza |
| 2204766 | Fernando Luis |
| 2204764 | Flavio Luis |
| 2204743 | Humberto dos Anjos |
| 2204823 | Pedro Alexandre |
| 2204769 | Flavio Hirata |
| 2204759 | Rodrigo Junqueira |
| 2207973 | Renato Dias |
| 2204755 | Luiz Viveiros |
| 2208185 | Miqueas Marcelo |
| 548736 | Rodrigo Simonini |
| 2208087 | Bruno Yela |
| 770840 | João Vitor |
| 2210427 | Luis Carlos |
| 2210442 | Matheus Tonetti |
| 2210443 | Bruno Hopf |
| 2210445 | Marcos Alexandre |

**Período do sync:** `2026-09-03T03:00:00.000Z` → `2026-09-04T02:59:59.999Z` (dia 03/09 inteiro em Brasília).

No dia: `UPDATE torneio_cda SET ativo = true WHERE slug = 'cda-vip-setembro-2026';` e sync sob demanda.

## API BKO (referência)

| Ação | Endpoint |
|------|----------|
| Buscar jogador | `GET /backoffice/api/players/search?exactMatch=true&pattern={userName}` → `screenName`, `playerId`, `externalName` |
| Rodadas do jogador | `GET /backoffice/api/players/search/player/games/{playerId}?offset=&limit=1000&from=&to=` |

Filtro de período: usar `from` / `to` em ISO UTC — **não** `dateFrom` / `dateTo`.
