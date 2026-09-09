# Job Telecom — Monitor de lobby Bateu Bet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin na grade **Todos os jogos** da Bateu.bet.

O script **só busca a grade** na Bateu e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-bateu`.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID Bateu em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Esportiva:** a métrica **não** é a prateleira da home (`home-sections`). É a grade **Todos os jogos** (`casino-games/list` + `categories[]=todos-os-jogos`) — a mesma lista de [bateu.bet.br/games/category/todos-os-jogos](https://bateu.bet.br/games/category/todos-os-jogos).

**Diferença vs Blaze:** API SoftGamings (`/list`), não SoftSwiss (`/api/games/search`).

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Paginar `GET https://bateu.bet.br/api/casino-games/list/?categories[]=todos-os-jogos&page=…&per_page=24`.
2. Continuar até achar **todos** os IDs cadastrados na Spin **ou** esgotar o catálogo.
3. Enviar o snapshot para a Spin (`monitor-lobby-bateu`).
4. A plataforma cruza com os IDs e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-bateu-run.mjs` | Script Node.js (único ficheiro do job) |

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
| `MONITOR_LOBBY_BATEU_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-bateu-secret` |
| `BATEU_LOBBY_LIST_URL` | Não | Default: `https://bateu.bet.br/api/casino-games/list/` |
| `BATEU_LOBBY_CATEGORY` | Não | Default: `todos-os-jogos` |
| `BATEU_LOBBY_PER_PAGE` | Não | Default: `24` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Só se a Spin pedir |

**Cookie de login:** **não** é necessário.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script (correta)

| Item | Valor |
|------|--------|
| Página | `https://bateu.bet.br/games/category/todos-os-jogos` |
| Request | `GET /api/casino-games/list/` |
| Query | `categories[]=todos-os-jogos` · `page` · `per_page=24` |
| URL exemplo | `https://bateu.bet.br/api/casino-games/list/?categories[]=todos-os-jogos&page=1&per_page=24` |
| Ordem / posição | `(page − 1) × 24 + índice` em `data[]` (1-based) |

### Não usar

```text
GET …/api/casino-games/filter?categories[]=cassino-ao-vivo&…
GET …/api/home-sections/public
```

`filter` + `cassino-ao-vivo` é outro ranking. `home-sections` na Bateu **não** é a fonte deste job.

### Como validar no DevTools

1. Abrir `https://bateu.bet.br/games/category/todos-os-jogos`.
2. F12 → **Rede** → limpar → filtrar: `casino-games/list` ou `todos-os-jogos`.
3. Recarregar / rolar a lista («Carregar mais»).
4. Conferir Query: `categories[]` = **`todos-os-jogos`** e path **`/list/`** (não `/filter`).
5. Em `data[]`, mesas Spin: `provider.name` = **Good Game Labs**; campo a cruzar = **`id`**.

Referência de posições (aprox.; muda com a curadoria da Bateu):

| Mesa | ID | Posição típica |
|------|-----|----------------|
| Roleta | `good-game-v2:live-roulette` | ~P117 |
| Futebol Brasileiro | `good-game-v2:live-cardmatchup` | ~P337 |
| Baccarat | `good-game-v2:live-baccarat` | ~P514 |
| Blackjack | `good-game-v2:live-blackjack` | ~P1060 |

O script **não** para na 1ª página: Blackjack pode exigir ~45 páginas.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID Bateu Bet** = `data[].id` |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual (conferência; fonte da verdade = plataforma):

| ID a cadastrar | Nome na Bateu | Slug URL |
|----------------|---------------|----------|
| `good-game-v2:live-roulette` | Roulette | `goodgame/roulette` |
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro | `goodgame/futebol-brasileiro` |
| `good-game-v2:live-baccarat` | Baccarat | `goodgame/baccarat` |
| `good-game-v2:live-blackjack` | Blackjack | `goodgame/blackjack` |

Operadora no DI: slug **`bateu_bet`**.

---

## 6. Comandos

Diretório: raiz do pacote (onde está `scripts/`).

### Teste (não grava)

```bash
node scripts/monitor-lobby-bateu-run.mjs --dry-run
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"dry_run": true`
- `"mesas_encontradas"` = quantidade cadastrada (ex. 4)
- `"status": "ok"`
- Stdout com `scan=v1-todos-os-jogos-all-ids-or-exhaust`, várias páginas, `IDs encontrados: 4/4`

### Produção

```bash
node scripts/monitor-lobby-bateu-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador.

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ **300 s** (catálogo ~3000 jogos; Blackjack pode estar ~P1000+) |
| Retentativas | 2 ×, intervalo 5 min (falha de rede) |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `Nenhuma mesa com ID Bateu` | Spin ainda não cadastrou IDs — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret de ingest |
| `status: parcial` | IDs desatualizados ou mesa fora da grade — avisar Spin |
| Timeout | Aumentar timeout (≥ 300 s); stdout deve mostrar **dezenas** de páginas se Blackjack estiver cadastrado |
| `Lobby: 24 jogos, 1 página` com 4 IDs | Script antigo / API truncada — substituir o `.mjs` e conferir `scan=v1-todos-os-jogos-all-ids-or-exhaust` |

### Como validar que o script novo está rodando (stdout)

```text
Buscando lobby Bateu (4 mesas no cadastro)...
IDs: good-game-v2:live-baccarat, good-game-v2:live-blackjack, good-game-v2:live-cardmatchup, good-game-v2:live-roulette
scan=v1-todos-os-jogos-all-ids-or-exhaust
GET https://bateu.bet.br/api/casino-games/list/ categories[]=todos-os-jogos per_page=24
Bateu meta: last_page=126 total=3018 per_page=24
Todas as 4 mesas cadastradas encontradas (até página 45).
IDs encontrados: 4/4
Lobby: 1080 jogos, 45 página(s).
```

Números de página/total variam; o importante é `scan=v1-…` e `4/4` (ou o total cadastrado).

**Contato:** Spin / Data Intelligence (cadastro, Supabase, dashboard). Telecom: operação do job e rede.
