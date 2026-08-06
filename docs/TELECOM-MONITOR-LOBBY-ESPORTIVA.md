# Job Telecom — Monitor de lobby Esportiva Bet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin na prateleira **Cassino Ao Vivo** da **home** Esportiva.

O script **só busca a prateleira** no CMS e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-esportiva`.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID Esportiva em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Blaze/Jonbet:** a métrica **não** é o catálogo completo (`casino-games/filter`). É a seção curada da **home** (`home-sections/public`). Usar o endpoint errado gera posições ~100+ que **não** batem com o que o jogador vê na home.

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Chamar `GET https://painel.esportivabet.cloud/api/home-sections/public`.
2. Extrair a seção `title` = **Cassino Ao Vivo**.
3. Enviar a lista ordenada (`child[]`) para a Spin (`monitor-lobby-esportiva`).
4. A plataforma cruza com os IDs cadastrados e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-esportiva-run.mjs` | Script Node.js (único ficheiro do job) |

**Requisito:** Node.js **18+**.

**Rede:** escritório / IP Brasil (recomendado).

---

## 3. Variáveis de ambiente

Pode reutilizar o mesmo **`.env.monitor`** da Blaze.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-esportiva-secret` |
| `ESPORTIVA_LOBBY_HOME_SECTIONS_URL` | Não | Default: URL abaixo |
| `ESPORTIVA_LOBBY_HOME_SECTION_TITLE` | Não | Default: `Cassino Ao Vivo` |

**Cookie de login:** **não** é necessário.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script (correta)

| Item | Valor |
|------|--------|
| Host | `https://painel.esportivabet.cloud` |
| Request | `GET /api/home-sections/public` |
| URL completa | `https://painel.esportivabet.cloud/api/home-sections/public` |
| Seção | `title` = **`Cassino Ao Vivo`** (`type` ≈ `games-fixed`) |
| Ordem / posição | índice de `child[]` (1º item = posição 1) |

### Não usar

```text
GET https://esportiva.bet.br/api/casino-games/filter?categories[]=cassino-ao-vivo&…
```

Esse é o **catálogo completo** (~559 jogos) — posições diferentes da home.

### Como validar no DevTools

1. Abrir `https://esportiva.bet.br/` (home).
2. F12 → **Rede** → limpar → filtrar: `home-sections` ou `painel.esportivabet`.
3. Recarregar a página.
4. Abrir a resposta → objeto com `"title":"Cassino Ao Vivo"`.
5. Em `child[]`, conferir ordem e `id` / `slug` / `provider`.

Agregador típico das mesas Spin: **Good Game Labs**.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID Esportiva Bet** = `child[].id` |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual da home (conferência; fonte da verdade = plataforma):

| ID a cadastrar | Nome na home | Slug |
|----------------|--------------|------|
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro | `goodgame/futebol-brasileiro` |
| `good-game-v2:live-roulette` | Roulette | `goodgame/roulette` |
| `5685` | Blackjack | `goodgame/blackjack` |
| `good-game-v2:live-baccarat` | Baccarat | `goodgame/baccarat` |

**Nota Blackjack:** no catálogo BS2Bet o mesmo jogo pode aparecer como `good-game-v2:live-blackjack`; na home o CMS usa **`5685`**. Preferir **`5685`**. O monitor aceita os dois como alias.

---

## 6. Comandos

### Teste (não grava)

```bash
node scripts/monitor-lobby-esportiva-run.mjs --dry-run
```

**Sucesso esperado:** `Edge HTTP 200`, `"dry_run": true`, `mesas_encontradas` alinhado ao cadastro (com a curadoria atual da home, Spin costuma aparecer no topo P1–P4).

### Produção

```bash
node scripts/monitor-lobby-esportiva-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador.

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ 120 s |
| Retentativas | 2 ×, intervalo 5 min |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| Seção «Cassino Ao Vivo» não encontrada | CMS mudou o título — avisar Spin (pode precisar ajuste de `ESPORTIVA_LOBBY_HOME_SECTION_TITLE`) |
| Posições absurdas (~100+) | Script antigo ainda no `casino-games/filter` — **substituir** pelo `.mjs` deste pacote |
| `Nenhuma mesa com ID Esportiva` | Spin ainda não cadastrou — avisar Spin |
| `Edge HTTP 401` | Conferir service role / secret de ingest |
| `status: parcial` | ID Blackjack desatualizado (`5685` vs legado) ou mesa fora da prateleira — avisar Spin |

**Contato:** Spin / Data Intelligence.
