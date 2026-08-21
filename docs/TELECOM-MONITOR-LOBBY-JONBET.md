# Job Telecom — Monitor de lobby Jonbet

Documento para a equipe de **Telecom** operar o job horário de posicionamento das mesas Spin no **Cassino Ao Vivo** da Jonbet.

O script **só busca o lobby** na Jonbet e envia o JSON para a plataforma. O cálculo de posição e a gravação ficam na **Edge Function** `monitor-lobby-jonbet`.

**Stack:** SoftSwiss (mesmo padrão técnico da Blaze). Mesas Spin: `provider.slug` = **`spin`**.

**Expansão:** novas mesas **não** exigem alteração deste job. A Spin cadastra o ID Jonbet em **Gestão de Estúdios**; o próximo ciclo já rastreia.

---

## 1. Objetivo

A cada **1 hora** (fuso `America/Sao_Paulo`):

1. Consultar `https://jonbet.bet.br/api/games/search` (categoria `live-casino`).
2. Enviar o snapshot para a Spin (`monitor-lobby-jonbet`).
3. A plataforma cruza com os IDs cadastrados e grava posições / logs.

---

## 2. Arquivo a executar

| Arquivo | Descrição |
|---------|-----------|
| `scripts/monitor-lobby-jonbet-run.mjs` | Script Node.js principal |
| `scripts/lib/monitorLobbySoftSwissScan.mjs` | Helper de paginação (importado — **obrigatório**) |

**Requisito:** Node.js **18+**.

**Rede:** escritório / IP **Brasil** recomendado (mesmo risco de **HTTP 451** da Blaze em datacenter).

---

## 3. Variáveis de ambiente

Pode reutilizar o mesmo **`.env.monitor`** da Blaze (mesmo projeto Supabase).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| `MONITOR_LOBBY_JONBET_INGEST_SECRET` | Se a Spin configurar | Header `x-monitor-lobby-jonbet-secret` |
| `HTTPS_PROXY` / `HTTP_PROXY` | Não | Proxy residencial BR (só se a Spin pedir) |

**Cookie de login:** **não** é necessário. O script gerencia cookies leves de sessão sozinho.

---

## 4. Endpoints / como achar no F12

### URL usada pelo script

```text
GET https://jonbet.bet.br/api/games/search
  ?page=1
  &limit=30
  &search=
  &game_category_slugs=live-casino
  &xp_enabled=false
  &game_provider_slugs=
  &bonus_betting_enabled=false
```

Página: `https://jonbet.bet.br/pt/games/category/live-casino`

### Como validar no DevTools

1. Abrir a página de Cassino Ao Vivo.
2. F12 → **Rede** → filtrar: `games/search`.
3. Conferir `game_category_slugs` = **`live-casino`**.

**Atenção:** se a URL no browser mostrar `game_category_slugs=[object Object],…`, é bug do front — **ignorar**; o script usa só `live-casino` como acima.

Em `records[]`, cruzar pelo campo **`id`**. Provider Spin: `provider.slug` = **`spin`**.

---

## 5. Onde cadastrar IDs (Spin — não Telecom)

| Quem | O quê |
|------|--------|
| **Spin / Data Intelligence** | Gestão de Estúdios → mesa → **ID Jonbet** |
| **Telecom** | **Não** mantém lista de mesas nem IDs |

Referência atual (conferência; fonte da verdade = plataforma) — Network Sports Club:

| Mesa | ID Jonbet |
|------|-----------|
| Baccarat Sports Club | `67416` |
| Blackjack Sports Club | `67415` |
| Roleta Brasileira Sports Club | `67418` |
| Futebol Brasileiro Sports Club | `67417` |

---

## 6. Comandos

### Teste (não grava)

```bash
node scripts/monitor-lobby-jonbet-run.mjs --dry-run
```

**Sucesso esperado:** `Edge HTTP 200`, `"dry_run": true`, `"mesas_encontradas"` alinhado ao cadastro.

### Produção

```bash
node scripts/monitor-lobby-jonbet-run.mjs
```

Agendar: comando `node` acima com as variáveis de ambiente já definidas no agendador.

**Exit code:** `0` = OK; outro = falha (alertar Spin).

---

## 7. Agendamento

| Item | Valor |
|------|--------|
| Frequência | A cada **1 hora** |
| Fuso | `America/Sao_Paulo` |
| Timeout | ≥ 180 s |
| Retentativas | 2 ×, intervalo 5 min |

---

## 8. Falhas comuns

| Sintoma | Ação |
|---------|------|
| `HTTP 451` | Rodar em IP BR |
| `Nenhuma mesa com ID Jonbet` | Spin ainda não cadastrou — avisar Spin |
| `Edge HTTP 401` | Conferir service role / secret de ingest |
| `status: parcial` | IDs ou presença no lobby — avisar Spin |

**Contato:** Spin / Data Intelligence.
