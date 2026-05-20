# Checklist interno — Monitor lobby CDA (Telecom)

Passos para a **Spin** antes e depois de handoff para Telecom. Espelha o fluxo do [Lobby Blaze](SETUP-MONITOR-LOBBY-BLAZE.md).

---

## 1. Banco de dados (Supabase SQL Editor)

Aplicar migrations (se ainda não estiverem no projeto remoto):

| Migration | Conteúdo |
|-----------|----------|
| `20260518140000_lobby_monitor.sql` | Tabelas `lobby_monitor_*` |
| `20260518150000_mesas_spin_identificacao_operadora.sql` | Coluna `mesa_identificacao_operadora` |
| `20260521120000_lobby_monitor_pior_mesa_vitrine.sql` | Colunas vitrine / pior mesa |
| `20260523120000_integrations_lobby_cda.sql` | Linha `integrations` slug `lobby_cda` |

Conferir:

```sql
SELECT slug, nome, ativo FROM integrations WHERE slug IN ('lobby_blaze', 'lobby_cda');
```

---

## 2. IDs das mesas CDA

Executar:

`scripts/manual-supabase-mesas-spin-cda-lobby-ids.sql`

| Mesa | `mesa_identificacao_operadora` |
|------|--------------------------------|
| Roleta | 3304 |
| Speed Baccarat | 3305 |
| Blackjack 1 | 3302 |
| Blackjack VIP | 3303 |
| Blackjack 2 | 3306 |

Conferir em **Plataforma → Gestão de Mesas** (operadora Casa de Apostas): colunas **ID Spin** e **ID operadora** preenchidas.

---

## 3. Edge Function

```bash
supabase functions deploy monitor-lobby-cda
```

Em **Supabase → Edge Functions → Secrets**:

| Secret | Valor |
|--------|--------|
| `MONITOR_LOBBY_CDA_INGEST_SECRET` | Gerar string longa (ex. `openssl rand -hex 32`) — **mesmo valor** repassado à Telecom |
| `CDA_LOBBY_CATEGORIES_URL` | Opcional; default já é `.../casino-categories?languageId=21` |

Não é necessário `CDA_LOBBY_COOKIE` na Edge se a Telecom sempre envia `cda_categories` no body (fluxo recomendado).

---

## 4. Handoff Telecom

Enviar:

1. Arquivo `scripts/monitor-lobby-cda-run.mjs`
2. Documento `docs/TELECOM-MONITOR-LOBBY-CDA.md`
3. Template `scripts/env.monitor-telecom-cda.example` (preencher valores reais por canal seguro)
4. Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MONITOR_LOBBY_CDA_INGEST_SECRET`
5. Processo de renovação de `CDA_LOBBY_COOKIE` (conta de serviço no site)

Pedir à Telecom:

- [ ] `--dry-run` com sucesso (`mesas_encontradas: 5`)
- [ ] Uma execução real (`execucao_id` retornado)
- [ ] Agendamento horário confirmado (cron + fuso BR)

---

## 5. Validação na plataforma

Após primeira execução real:

```sql
SELECT executado_em, status, registros_inseridos, erros_count, mensagem_erro
FROM sync_logs
WHERE integracao_slug = 'lobby_cda'
ORDER BY executado_em DESC
LIMIT 5;

SELECT executado_em, status, mesas_encontradas, mesas_esperadas
FROM lobby_monitor_execucao
WHERE operadora_slug = 'casa_apostas'
ORDER BY executado_em DESC
LIMIT 5;
```

Na app:

- [ ] **Status Técnico** — linha **Lobby Casa de Apostas** com último sync e status OK (ação `—`)
- [ ] **Overview Spin → Posicionamento** — filtro **Casa de Apostas** com KPIs e histórico

---

## 6. O que não fazer

- Não agendar `monitor-lobby-cda` **só na Edge** sem body: a CDA retorna **401** sem cookie.
- Não commitar `.env.monitor-cda` nem cookies no Git.
- Não confundir integração **`casa_apostas`** (sync métricas afiliados) com **`lobby_cda`** (posicionamento no cassino).

---

## Referências

- Detalhes técnicos CDA: `docs/SETUP-MONITOR-LOBBY-CDA.md`
- Runbook Telecom: `docs/TELECOM-MONITOR-LOBBY-CDA.md`
- Blaze (paridade): `docs/SETUP-MONITOR-LOBBY-BLAZE.md`, `scripts/monitor-lobby-blaze-run.mjs`
