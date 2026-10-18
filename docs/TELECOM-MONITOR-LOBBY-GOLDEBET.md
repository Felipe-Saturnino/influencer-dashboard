# Job Telecom — Monitor de lobby Goldebet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin na grade **Cassino Ao Vivo (Live)** da Goldebet.

O script **só busca a grade** na Goldebet e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-goldebet`.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID Goldebet em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Bateu / Rico:** a métrica **não** é a grade «Todos os jogos». É a lista **Live** (`v2/casino-games` + `casino_game_category_ids[]=2` + `order=clicks`) — a mesma de [goldebet.bet.br/casino/live](https://goldebet.bet.br/casino/live).

**IDs:** numéricos (`data[].id`), **não** o formato `good-game-v2:*` da Bateu.

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Paginar `GET https://goldebet.bet.br/v2/casino-games?page=…&casino_game_category_ids[]=2&order=clicks`.
2. Continuar até achar **todos** os IDs cadastrados na Spin **ou** esgotar o catálogo (`meta.last_page`).
3. Enviar o snapshot para a Spin (`monitor-lobby-goldebet`).
4. A plataforma cruza com os IDs e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-goldebet-run.mjs` | Script Node.js (único ficheiro do job) |

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
| `MONITOR_LOBBY_GOLDEBET_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-goldebet-secret` |
| `GOLDEBET_LOBBY_GAMES_URL` | Não | Default: `https://goldebet.bet.br/v2/casino-games` |
| `GOLDEBET_LOBBY_CATEGORY_ID` | Não | Default: `2` (Cassino Ao Vivo) |
| `GOLDEBET_LOBBY_ORDER` | Não | Default: `clicks` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Só se a Spin pedir |

**Cookie de login:** **não** é necessário.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script (correta)

| Item | Valor |
|------|--------|
| Página | `https://goldebet.bet.br/casino/live` |
| Request | `GET /v2/casino-games` |
| Query | `page` · `casino_game_category_ids[]=2` · `order=clicks` |
| URL exemplo | `https://goldebet.bet.br/v2/casino-games?page=1&casino_game_category_ids[]=2&order=clicks` |
| Resposta | `{ data, links, meta }` — `meta.last_page`, `meta.per_page` (20), `meta.total` (~690) |
| Ordem / posição | `(page − 1) × per_page + índice` em `data[]` (1-based) |

### Não usar

```text
GET …/v2/casino-games?… sem category 2 / sem order=clicks
GET …/casino-games/list (padrão Bateu)
GET …/casino-games/filter (padrão Rico/BRX)
```

Outra categoria ou outra ordenação muda o ranking — **não** é a fonte deste job.

### Como validar no DevTools

1. Abrir `https://goldebet.bet.br/casino/live`.
2. F12 → **Rede** → limpar → filtrar: `casino-games` ou `v2/casino-games`.
3. Recarregar / rolar a lista Live.
4. Conferir Query: `casino_game_category_ids[]` = **`2`**, `order` = **`clicks`**.
5. Em `data[]`, campo a cruzar = **`id`** (número, ex. `12778`).

Referência de posições (validação **2026-09-21**, `order=clicks`; muda com a curadoria):

| Mesa | ID | Posição típica |
|------|-----|----------------|
| Live BlackJack | `12778` | ~P350 |
| Futebol Brasileiro | `12777` | ~P419 |
| Roulette | `12776` | ~P457 |
| Baccarat | `12775` | ~P489 |

O script **não** para na 1ª página: Baccarat (~P489) pode exigir ~25 páginas (`per_page=20`).

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID Goldebet** = `String(data[].id)` |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual (conferência; fonte da verdade = plataforma):

| ID a cadastrar | Nome na Goldebet |
|----------------|------------------|
| `12778` | Live BlackJack |
| `12777` | Futebol Brasileiro |
| `12776` | Roulette |
| `12775` | Baccarat |

Operadora no DI: slug **`goldebet`**.

---

## 6. Comandos

Diretório: raiz do pacote (onde está `scripts/`).

### Teste (não grava)

```bash
node scripts/monitor-lobby-goldebet-run.mjs --dry-run
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"dry_run": true`
- `"mesas_encontradas"` = quantidade cadastrada (ex. 4)
- `"status": "ok"`
- Stdout com várias páginas, `IDs encontrados: 4/4` (ou o total cadastrado)

### Produção

```bash
node scripts/monitor-lobby-goldebet-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador.

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ **180 s** (catálogo Live ~690 jogos; Baccarat ~P489) |
| Retentativas | 2 ×, intervalo 5 min (falha de rede) |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `Nenhuma mesa com ID Goldebet` | Spin ainda não cadastrou IDs — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret de ingest |
| `status: parcial` | IDs desatualizados ou mesa fora da grade Live — avisar Spin |
| Timeout | Aumentar timeout (≥ 180 s); stdout deve mostrar dezenas de páginas se Baccarat estiver cadastrado |
| `Lobby: 20 jogos, 1 página` com 4 IDs | Script antigo / API truncada — substituir o `.mjs` e conferir paginação até achar todos |

### Como validar que o script novo está rodando (stdout)

```text
Buscando lobby Goldebet Live (4 mesas no cadastro)...
IDs: 12775, 12776, 12777, 12778
GET https://goldebet.bet.br/v2/casino-games category=2 order=clicks
Goldebet meta: last_page=35 total=690 per_page=20
Todas as 4 mesas cadastradas encontradas (até página 25).
IDs encontrados: 4/4
Lobby: 500 jogos, 25 página(s).
```

Números de página/total variam; o importante é achar `4/4` (ou o total cadastrado) e o path `v2/casino-games` com `category=2` + `order=clicks`.

**Contato:** Spin / Data Intelligence (cadastro, Supabase, dashboard). Telecom: operação do job e rede.
