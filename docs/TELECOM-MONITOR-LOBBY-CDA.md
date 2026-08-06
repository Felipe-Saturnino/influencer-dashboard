# Job Telecom — Monitor de lobby Casa de Apostas (CDA)

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin no cassino da **Casa de Apostas**.

O script **só busca o JSON** na CDA e envia para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-cda`.

**Expansão:** novas mesas (dedicadas ou Network) **não** exigem alteração deste job. A Spin cadastra o ID CDA em **Gestão de Estúdios**; o próximo ciclo já rastreia.

**Diferença vs Blaze:** este job **exige cookie de sessão** (`CDA_LOBBY_COOKIE`). Sem cookie válido a API responde **401**.

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Chamar a API de categorias do cassino CDA (com Cookie).
2. Enviar o JSON para a Spin (`monitor-lobby-cda`).
3. A plataforma calcula a posição de cada mesa **dentro da categoria** (Roleta, Baccarat, BlackJack & Poker, etc.) e grava no banco.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-cda-run.mjs` | Script Node.js (único ficheiro do job) |

**Requisito:** Node.js **18+**.

**Rede:** escritório / IP com acesso estável a `casadeapostas.bet.br` (conta de serviço acordada com a Spin).

---

## 3. Variáveis de ambiente

Arquivo sugerido: **`.env.monitor-cda`** (na pasta do script ou na raiz do pacote). **Não** versionar; **não** enviar por e-mail em texto claro.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `CDA_LOBBY_COOKIE` | **Sim** | Header `Cookie` completo de sessão válida |
| `MONITOR_LOBBY_CDA_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-cda-secret` |
| `CDA_LOBBY_CATEGORIES_URL` | Não | Default abaixo |

### Como obter / renovar `CDA_LOBBY_COOKIE`

1. Chrome, site **logado** (conta de serviço acordada com a Spin).
2. Abrir `https://www.casadeapostas.bet.br/br/casino`
3. F12 → **Rede** → limpar → filtrar: `casino-categories`
4. Recarregar → clicar no request → **Cabeçalhos** → copiar o valor completo de **`Cookie`**
5. Atualizar `CDA_LOBBY_COOKIE` no ambiente / agendador

**Sem cookie válido → HTTP 401** e o job falha.

Recomendação: revisar o cookie **pelo menos 1× por semana** ou no primeiro 401 consecutivo.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script

```text
GET https://casadeapostas.bet.br/api/content/casino-categories?languageId=21
```

Headers mínimos (o script já envia):

- `Accept: application/json`
- `Referer: https://www.casadeapostas.bet.br/br/casino`
- `Cookie: <CDA_LOBBY_COOKIE>`

Resposta: **array** de categorias; cada uma com `name` e `competitions[]`.

### Como achar IDs das mesas (mesmo request — só para Spin)

No F12 → **`casino-categories`** → **Resposta**:

- Cada categoria tem `competitions[]`
- Mesas Spin: `providerName` = **GamesGlobal**
- ID a cadastrar na plataforma: campo **`id`** da competition (ex.: `3304`)

Telecom **não** cadastra IDs — só usa o cookie e roda o script.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID CDA** |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

O monitor inclui automaticamente dedicadas **e** Network com ID CDA preenchido.

---

## 6. Comandos

Diretório: raiz do pacote / pasta com o script.

### Teste (não grava)

```bash
node scripts/monitor-lobby-cda-run.mjs --dry-run
```

**Sucesso esperado:**

- `Edge HTTP 200`
- `"dry_run": true`
- `"mesas_encontradas"` = mesas com ID CDA no cadastro
- `"status": "ok"` ou `"parcial"`

### Produção

```bash
node scripts/monitor-lobby-cda-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador (incluir `CDA_LOBBY_COOKIE`).

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Cron (ex.) | `5 * * * *` |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ 120 s |
| Retentativas | 2 ×, intervalo 5 min (rede / 401 pontual) |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `CDA HTTP 401` | Renovar `CDA_LOBBY_COOKIE` (passo a passo na §3) |
| `Nenhuma mesa com ID CDA` | Spin ainda não cadastrou — avisar Spin |
| `Edge HTTP 401` | Conferir `SUPABASE_SERVICE_ROLE_KEY` / secret de ingest |
| `status: parcial` / poucas mesas | IDs desatualizados ou mesa fora do lobby — avisar Spin |

**Contato:** Spin / Data Intelligence (cadastro, Supabase, dashboard). Renovação de credenciais CDA: conforme acordo operacional com a casa.
