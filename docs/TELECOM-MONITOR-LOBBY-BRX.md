# Job Telecom — Monitor de lobby BRX Bet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin na grade **Todos os jogos** da BrxBet (`/games/category/all`).

O script **só busca a grade** na BRX e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-brx`.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID BRX em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Bateu:** a BRX usa `casino-games/filter` (não `/list`) na página `/games/category/all`. Os **IDs das mesas Spin são os mesmos** da Bateu/Rico (Good Game Labs).

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Paginar `GET https://brx.bet.br/api/casino-games/filter?sort=&per_page=24&page=…&term=`.
2. Continuar até achar **todos** os IDs cadastrados na Spin **ou** esgotar o catálogo.
3. Enviar o snapshot para a Spin (`monitor-lobby-brx`).
4. A plataforma cruza com os IDs e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-brx-run.mjs` | Script Node.js principal |
| `scripts/lib/monitorLobbySoftGamingsFilterScan.mjs` | Helper de paginação (**obrigatório**) |

**Requisito:** Node.js **18+**.

**Rede:** escritório / IP Brasil (recomendado).

**Agendador:** `node` + env — **sem** `.ps1` / `.bat`.

---

## 3. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `MONITOR_LOBBY_BRX_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-brx-secret` |
| `BRX_LOBBY_FILTER_URL` | Não | Default: URL abaixo |
| `BRX_LOBBY_PER_PAGE` | Não | Default: `24` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Só se a Spin pedir |

**Cookie de login:** **não** é necessário.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script (correta)

| Item | Valor |
|------|--------|
| Página | `https://brx.bet.br/games/category/all` |
| Request | `GET /api/casino-games/filter` |
| Query | `sort=` · `per_page=24` · `page` · `term=` |
| URL exemplo | `https://brx.bet.br/api/casino-games/filter?sort=&per_page=24&page=1&term=` |
| Ordem / posição | `(page − 1) × 24 + índice` em `data[]` (1-based) |

### Como validar no DevTools

1. Abrir `https://brx.bet.br/games/category/all`.
2. F12 → **Rede** → limpar → filtrar: `casino-games/filter`.
3. Recarregar / rolar a lista.
4. Conferir path **`/filter`** e `per_page=24`.
5. Em `data[]`, mesas Spin: `provider.name` = **Good Game Labs**; campo = **`id`**.

Referência (aprox.; ranking muda):

| Mesa | ID | Posição típica |
|------|-----|----------------|
| Roleta | `good-game-v2:live-roulette` | ~P3452 |
| Blackjack | `good-game-v2:live-blackjack` | ~P3453 |
| Baccarat | `good-game-v2:live-baccarat` | ~P3454 |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` | ~P3455 |

Mesas no **fim** do catálogo (~página 144 de ~152) — timeout alto obrigatório.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID BRX Bet** = `data[].id` |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

| ID a cadastrar | Nome | Slug URL |
|----------------|------|----------|
| `good-game-v2:live-roulette` | Roulette | `goodgame/roulette` |
| `good-game-v2:live-blackjack` | Blackjack | `goodgame/blackjack` |
| `good-game-v2:live-baccarat` | Baccarat | `goodgame/baccarat` |
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro | `goodgame/futebol-brasileiro` |

Operadora no DI: slug **`brx_bet`**.

---

## 6. Comandos

```bash
node scripts/monitor-lobby-brx-run.mjs --dry-run
node scripts/monitor-lobby-brx-run.mjs
```

**Sucesso:** `Edge HTTP 200`, `scan=v1-category-all-filter-all-ids-or-exhaust`, `IDs encontrados: 4/4` (ou total cadastrado).

**Exit code:** `0` = OK.

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ **600 s** (~150 páginas até achar Network no fim) |
| Retentativas | 2 ×, intervalo 5 min |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `Nenhuma mesa com ID BRX` | Spin ainda não cadastrou — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret |
| `status: parcial` | IDs desatualizados — avisar Spin |
| Timeout | Aumentar timeout (≥ 600 s) |
| `Lobby: 24 jogos, 1 página` | Script incompleto — conferir `scan=v1-…` e pasta `scripts/lib/` |

**Contato:** Spin / Data Intelligence. Telecom: operação do job e rede.
