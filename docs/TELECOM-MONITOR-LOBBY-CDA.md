# Job Telecom — Monitor de lobby Casa de Apostas (CDA)

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin no cassino da CDA. O processamento e gravação ficam na **Edge Function Supabase** (`monitor-lobby-cda`); este script só **busca o JSON** na CDA e envia o payload.

Modelo idêntico ao **Lobby Blaze** (`scripts/monitor-lobby-blaze-run.mjs`).

---

## Objetivo

A cada **1 hora** (sugestão: minuto `5` de cada hora, fuso `America/Sao_Paulo`):

1. Chamar a API de categorias do cassino CDA.
2. Enviar o JSON para a plataforma Spin (`monitor-lobby-cda`).
3. A plataforma calcula a posição de cada mesa **dentro da categoria** (Roleta, Baccarat, BlackJack & Poker) e grava no banco.

---

## Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-cda-run.mjs` | Script Node.js (único necessário do repositório) |

**Requisito:** Node.js **18+** (com `fetch` nativo).

---

## Variáveis de ambiente (fornecidas pela Spin)

Criar um arquivo de ambiente no servidor da Telecom (ex.: `.env.monitor-cda`) — **não versionar**, **não enviar por e-mail em texto claro** (usar cofre de secrets).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase (ex.: `https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key (Settings → API) |
| `CDA_LOBBY_COOKIE` | Sim | Header `Cookie` completo de uma sessão válida em casadeapostas.bet.br |
| `MONITOR_LOBBY_CDA_INGEST_SECRET` | Se a Spin configurar | Mesmo valor do secret na Edge; enviado como header `x-monitor-lobby-cda-secret` |
| `CDA_LOBBY_CATEGORIES_URL` | Não | Default: `https://casadeapostas.bet.br/api/content/casino-categories?languageId=21` |

### Como obter / renovar `CDA_LOBBY_COOKIE`

1. Navegador Chrome, acesso ao site **logado** (conta de serviço acordada com a Spin).
2. Abrir `https://www.casadeapostas.bet.br/br/casino`
3. F12 → **Rede** → filtrar `casino-categories`
4. Recarregar a página → clicar no request → **Cabeçalhos** → copiar o valor completo de **`Cookie`**
5. Atualizar a variável no agendador da Telecom.

**Sem cookie válido a API responde HTTP 401** e o job falha.

Recomendação: revisar o cookie **pelo menos 1× por semana** ou ao primeiro 401 consecutivo.

### Como achar IDs das mesas (mesmo request)

No mesmo F12 → Rede → **`casino-categories`** → **Resposta**:

- Cada categoria tem `competitions[]`
- Mesas Spin: `providerName` = **GamesGlobal**
- Cadastrar em Gestão de Estúdios (ID CDA) o campo **`id`** da competition (ex. `3304`)

Cadastro na plataforma (Spin): Gestão de Estúdios → mesa → ID CDA. O monitor passa a incluir mesas dedicadas **e** Network com esse ID preenchido.

---

## Comandos

Diretório de trabalho: pasta onde está o script (ou clone mínimo do repo com `scripts/`).

### 1) Teste (não grava no banco)

```bash
node monitor-lobby-cda-run.mjs --dry-run
```

**Sucesso esperado (stdout):**

- `Edge HTTP 200`
- JSON com `"dry_run": true`
- `"mesas_encontradas": 5` (ou o número de mesas com ID CDA no cadastro — dedicadas + Network)
- `"status": "ok"` (ou `"parcial"` se alguma mesa não aparecer no lobby)

### 2) Produção (grava snapshot)

```bash
node monitor-lobby-cda-run.mjs
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"execucao_id": "<uuid>"`
- `"mesas_encontradas": 5`

**Código de saída:** `0` = OK; qualquer outro = falha (alertar Spin).

---

## Agendamento sugerido

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Cron (ex.) | `5 * * * *` |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ 120 s |
| Retentativas | 2 com intervalo 5 min em caso de falha de rede |

No **Windows** (Task Scheduler): equivalente ao script Blaze — executar `node` com o `.mjs` e variáveis de ambiente carregadas do arquivo local.

---

## API CDA (referência)

```text
GET https://casadeapostas.bet.br/api/content/casino-categories?languageId=21
```

Headers mínimos (o script já envia):

- `Accept: application/json`
- `Referer: https://www.casadeapostas.bet.br/br/casino`
- `Cookie: <CDA_LOBBY_COOKIE>`

Resposta: **array JSON** de categorias; cada uma com `name` e `competitions[]`.

---

## O que a Spin grava (visibilidade)

- Tabelas: `lobby_monitor_execucao`, `lobby_monitor_posicao`
- Log de integração: `sync_logs` com `integracao_slug = lobby_cda`
- Dashboard: **Overview Spin → aba Posicionamento** (filtro Casa de Apostas)
- **Status Técnico → Lobby Casa de Apostas** (sem botão Sync manual)

---

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| `CDA HTTP 401` | Renovar `CDA_LOBBY_COOKIE` (sessão expirada) |
| `Nenhuma mesa com mesa_identificacao_operadora` | Spin deve rodar SQL de cadastro (ver checklist interno) |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` e `MONITOR_LOBBY_CDA_INGEST_SECRET` |
| `mesas_encontradas` &lt; 5 | Mesas Spin fora do lobby ou IDs desatualizados — avisar Spin |
| `status: parcial` | Job gravou o que achou; Spin analisa `mensagem_erro` no log |

---

## Contato

Dúvidas de cadastro de mesas, Supabase ou dashboard: equipe **Spin / Data Intelligence**.  
Renovação de credenciais CDA: conforme acordo operacional com a casa.
