# Job Telecom — Monitor de lobby BetPontoBet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin na grade **Todos os jogos** da BetPontoBet.

O script **só busca a grade** na BetPontoBet e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-betponto`.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID BetPontoBet em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Bateu:** API **`/api/games/category/{slug}?offset=&limit=`** (não SoftGamings `casino-games/list`). Página em `/cassino/categoria/todos-os-jogos`.

**Diferença vs Blaze:** não é SoftSwiss (`/api/games/search`).

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Paginar `GET https://betpontobet.bet.br/api/games/category/todos-os-jogos?offset=…&limit=48`.
2. Continuar até achar **todos** os IDs cadastrados na Spin **ou** esgotar o catálogo (`hasMore` / `total`).
3. Enviar o snapshot para a Spin (`monitor-lobby-betponto`).
4. A plataforma cruza com os IDs e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-betponto-run.mjs` | Script Node.js (único ficheiro do job) |
| `scripts/lib/monitorLobbyGamesCategoryOffsetScan.mjs` | Lib de paginação offset/limit (incluir no pacote) |

**Requisito:** Node.js **18+** (`fetch` nativo).

**Rede:** escritório / IP Brasil (recomendado).

**Agendador:** chamar `node` diretamente com env injetado — **sem** `.ps1` / `.bat`.

---

## 3. Variáveis de ambiente

Pode reutilizar o mesmo **`.env.monitor`** das outras operadoras.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `MONITOR_LOBBY_BETPONTO_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-betponto-secret` |
| `BETPONTO_LOBBY_CATEGORY_URL` | Não | Default: `https://betpontobet.bet.br/api/games/category/todos-os-jogos` |
| `BETPONTO_LOBBY_CATEGORY` | Não | Default: `todos-os-jogos` |
| `BETPONTO_LOBBY_LIMIT` | Não | Default: `48` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Só se a Spin pedir |

**Cookie de login:** **não** é necessário.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script (correta)

| Item | Valor |
|------|--------|
| Página | `https://betpontobet.bet.br/cassino/categoria/todos-os-jogos` |
| Request | `GET /api/games/category/todos-os-jogos` |
| Query | `offset` · `limit=48` |
| URL exemplo | `https://betpontobet.bet.br/api/games/category/todos-os-jogos?offset=0&limit=48` |
| Response | `data`, `total`, `hasMore`, `lastPage`, `perPage` |
| Ordem / posição | `offset + índice + 1` em `data[]` (1-based) |

### Não usar

```text
GET …/api/casino-games/list?…
GET …/api/casino-games/filter?…
GET …/api/home-sections/public
GET …/api/games/provider/goodgame   ← catálogo do provedor, NÃO a grade Todos os jogos
```

### Nota — GG Labs vs grade Todos os jogos (validado 2026-09)

As mesas Spin (Good Game Labs) usam IDs `good-game-v2:*` e **já podem existir** em `/api/games/provider/goodgame`. Porém, **podem ainda não estar** na grade **Todos os jogos** (`/api/games/category/todos-os-jogos`). Nesse caso o job grava `status: parcial` / 0 encontradas até a operadora incluir os títulos nessa categoria. **Não** trocar a fonte do job para o endpoint do provedor — a métrica de produto é a grade Todos os jogos.

### Como validar no DevTools

1. Abrir `https://betpontobet.bet.br/cassino/categoria/todos-os-jogos`.
2. F12 → **Rede** → limpar → filtrar: `games/category` ou `todos-os-jogos`.
3. Recarregar / rolar a lista («Carregar mais»).
4. Conferir Query: `offset` + `limit` e path **`/api/games/category/todos-os-jogos`**.
5. Em `data[]`, mesas Spin (quando na grade): `provider.name` = **Good Game Labs**; campo a cruzar = **`id`** (ex. `good-game-v2:live-roulette`).

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID BetPontoBet** = `data[].id` |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual (conferência; fonte da verdade = plataforma):

| ID a cadastrar | Nome típico |
|----------------|-------------|
| `good-game-v2:live-roulette` | Roulette / Roleta |
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro |
| `good-game-v2:live-baccarat` | Baccarat |
| `good-game-v2:live-blackjack` | Blackjack |

Operadora no DI: slug **`betponto_bet`**.

---

## 6. Comandos

Diretório: raiz do pacote (onde está `scripts/`).

### Teste (não grava)

```bash
node scripts/monitor-lobby-betponto-run.mjs --dry-run
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"dry_run": true`
- `"mesas_encontradas"` = quantidade cadastrada **quando** as mesas estiverem na grade Todos os jogos
- Stdout com `scan=v1-games-category-offset-all-ids-or-exhaust`

Se as mesas ainda não estiverem na grade: `parcial` / `0/N` é esperado (ver nota §4) — avisar Spin.

### Produção

```bash
node scripts/monitor-lobby-betponto-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador.

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ **300 s** |
| Retentativas | 2 ×, intervalo 5 min (falha de rede) |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `Nenhuma mesa com ID BetPontoBet` | Spin ainda não cadastrou IDs — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret de ingest |
| `status: parcial` / 0 encontradas | IDs fora da grade Todos os jogos (comum em 2026-09) ou IDs desatualizados — avisar Spin |
| Timeout | Aumentar timeout (≥ 300 s) |

### Como validar que o script novo está rodando (stdout)

```text
Buscando lobby BetPontoBet (4 mesas no cadastro)...
IDs: good-game-v2:live-baccarat, good-game-v2:live-blackjack, …
BetPontoBet scan=v1-games-category-offset-all-ids-or-exhaust
GET https://betpontobet.bet.br/api/games/category/todos-os-jogos offset/limit=48
```

**Contato:** Spin / Data Intelligence (cadastro, Supabase, dashboard). Telecom: operação do job e rede.
