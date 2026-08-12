# Job Telecom — Monitor de lobby Blaze

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin no **Cassino Ao Vivo** da Blaze.

O script **só busca o lobby** na Blaze e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-blaze`.

**Expansão:** novas mesas (dedicadas ou Network) **não** exigem alteração deste job. A Spin cadastra o ID Blaze em **Gestão de Estúdios**; o próximo ciclo já rastreia.

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Consultar a API de jogos da Blaze (`/api/games/search`, categoria `live-casino`).
2. Enviar o snapshot para a Spin (`monitor-lobby-blaze`).
3. A plataforma cruza com os IDs cadastrados e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-blaze-run.mjs` | Script Node.js (único ficheiro do job) |

**Requisito:** Node.js **18+** (`fetch` nativo).

**Rede:** escritório / IP **Brasil**. A Blaze responde **HTTP 451** em muitos IPs de datacenter — **não** rodar em cloud genérica.

---

## 3. Variáveis de ambiente

Arquivo sugerido na raiz do pacote: **`.env.monitor`** (não versionar; cofre de secrets).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `MONITOR_LOBBY_BLAZE_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-blaze-secret` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Proxy residencial BR (só se a Spin pedir) |

**Cookie de login:** **não** é necessário neste job. O script abre a página pública e usa cookies de sessão leves automaticamente.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script

```text
GET https://blaze.bet.br/api/games/search
  ?page=1
  &limit=30
  &search=
  &game_category_slugs=live-casino
  &xp_enabled=false
  &game_provider_slugs=
  &bonus_betting_enabled=false
```

Página de referência: `https://blaze.bet.br/pt/games/category/live-casino`

### Como validar no DevTools

1. Abrir a página de Cassino Ao Vivo acima.
2. F12 → **Rede** → limpar → filtrar: `games/search` ou `live-casino`.
3. Recarregar / navegar na categoria.
4. Conferir Query: `game_category_slugs` = **`live-casino`** (não outra categoria).
5. Em `records[]`, mesas Spin têm `provider.slug` = **`spin`**. O campo a cruzar é **`id`** (número).

O script **pagina** até achar todos os IDs cadastrados na plataforma (ou esgotar páginas). Mesas Network podem estar **longe** no ranking — isso é esperado.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID Blaze** |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual (só para conferência; a fonte da verdade é a plataforma):

**Dedicadas**

| Mesa | ID Blaze |
|------|----------|
| Roleta | `500617` |
| Speed Baccarat | `500616` |
| Blackjack 1 | `501109` |
| Blackjack VIP | `501110` |
| Blackjack 2 | `500615` |

**Network (Sports Club)**

| Mesa | ID Blaze |
|------|----------|
| Futebol Brasileiro Sports Club | `542821` |
| Roleta Brasileira Sports Club | `542822` |
| Blackjack Sports Club | `542819` |
| Baccarat Sports Club | `542820` |

---

## 6. Comandos

Diretório: raiz do pacote (onde está `scripts/`).

### Teste (não grava)

```bash
node scripts/monitor-lobby-blaze-run.mjs --dry-run
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"dry_run": true`
- `"mesas_encontradas"` = quantidade de mesas com ID Blaze no cadastro
- `"status": "ok"` ou `"parcial"`

### Produção

```bash
node scripts/monitor-lobby-blaze-run.mjs
```

Agendar no Windows/Linux: comando `node` acima com as variáveis de ambiente já definidas no agendador (ou carregadas do cofre local).

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ 180 s (lobby grande / Network no fim da lista) |
| Retentativas | 2 ×, intervalo 5 min (falha de rede) |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `HTTP 451` | Rodar em IP BR (escritório). Não usar runner cloud bloqueado. |
| `Nenhuma mesa com ID Blaze` | Spin ainda não cadastrou IDs — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret de ingest |
| `status: parcial` / `mesas_encontradas` menor que o esperado | IDs desatualizados ou mesa fora do lobby — avisar Spin |
| Timeout | Aumentar timeout (≥ 180 s); no stdout deve haver **várias páginas** e **centenas** de jogos |
| `30 jogos / 1 página` com 9 mesas no cadastro | Script **antigo** ainda em uso — substituir pelo `.mjs` atual e conferir stdout abaixo |

### Como validar que o script novo está a correr (stdout)

No dry-run / produção, o log **deve** parecer com isto (números aproximados):

```text
Buscando lobby Blaze (9 mesas no cadastro)...
IDs: 500615, 500616, 500617, 501109, 501110, 542819, 542820, 542821, 542822
Blaze meta: total_pages=12 total_records=339
IDs encontrados no lobby: 9/9
Lobby: 339 jogos, 12 página(s).
```

Se aparecer `5 mesas`, `Lobby: 30 jogos, 1 página(s)` → **não** é o ficheiro atual. Network (IDs `542819`–`542822`) fica `null` na plataforma.

**Contato:** Spin / Data Intelligence (cadastro, Supabase, dashboard). Telecom: operação do job e rede.
