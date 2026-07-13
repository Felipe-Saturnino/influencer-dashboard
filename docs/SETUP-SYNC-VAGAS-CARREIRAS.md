# Setup — Sync Vagas Carreiras (WordPress)

Sincronização **diária (~06:00 BRT)** das vagas **externas e abertas** da plataforma → endpoint WordPress da página [Carreiras](https://spingaming.com.br/carreiras/).

| Peça | Onde |
|------|------|
| Edge Function | `supabase/functions/sync-vagas-carreiras-site` |
| Cron | `.github/workflows/sync-vagas-carreiras-wordpress-daily.yml` (`0 9 * * *` UTC ≈ 6h BRT) |
| Contrato agência | `docs/api-sync-vagas-carreiras-site-agencia.md` |
| Integração / logs | slug `vagas_carreiras_wordpress` em `integrations` + `sync_logs` |

---

## 1. Gerar o segredo compartilhado

Gere **uma** string longa e aleatória (ex.: 32+ caracteres). Esse valor é o **`SPIN_VAGAS_SYNC_SECRET`**.

- **Agência WordPress:** valida o header `x-spin-vagas-sync-secret` com esse valor.
- **Supabase (Spin):** a Edge Function envia o mesmo valor no header ao chamar o WordPress.

Guarde em password manager até cadastrar nos Secrets.

---

## 2. Secrets no Supabase

**Supabase → Project Settings → Edge Functions → Secrets:**

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `WORDPRESS_VAGAS_SYNC_URL` | Sim (produção) | URL HTTPS do endpoint da agência, ex.: `https://spingaming.com.br/wp-json/spin/v1/vagas/sync` |
| `SPIN_VAGAS_SYNC_SECRET` | Sim (produção) | Mesmo valor do header `x-spin-vagas-sync-secret` |
| `SPIN_VAGAS_CARREIRAS_INGEST_SECRET` | Não | Se definido, protege a própria Edge Function (header `x-spin-vagas-carreiras-ingest-secret` ou Bearer `service_role`). Sem isso, o cron GitHub com `SUPABASE_ANON_KEY` funciona como nas outras syncs. |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem no runtime das functions.

**Antes da agência entregar a URL:** você pode deixar `WORDPRESS_VAGAS_SYNC_URL` vazia e testar só com `dry_run` (abaixo). O cron falhará até a URL estar configurada — esperado.

---

## 3. Deploy da Edge Function

```bash
supabase functions deploy sync-vagas-carreiras-site
```

Ou no painel: criar function `sync-vagas-carreiras-site`, colar `index.ts`, **Deploy updates**. Em `config.toml`: `verify_jwt = false`.

---

## 4. Migration da integração

Aplicar no SQL Editor (ou `supabase db push`):

`supabase/migrations/20260710180000_integrations_vagas_carreiras_wordpress.sql`

Registra o slug `vagas_carreiras_wordpress` para aparecer em `sync_logs` / Status Técnico.

---

## 5. Testes manuais

### Dry-run (não chama WordPress)

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/sync-vagas-carreiras-site" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```

Resposta esperada: `ok: true`, `dry_run: true`, `payload.vagas` com as vagas externas abertas.

### Sync real (após URL + secret + endpoint da agência)

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/sync-vagas-carreiras-site" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ou: GitHub → Actions → **Sync Vagas Carreiras WordPress (6h BRT)** → **Run workflow**.

---

## 6. O que passar à agência (checklist)

1. Documento `docs/api-sync-vagas-carreiras-site-agencia.md`
2. Valor de **`SPIN_VAGAS_SYNC_SECRET`** (produção; e homologação se houver)
3. Confirmação: Spin dispara **POST diário ~06:00 BRT** com header `x-spin-vagas-sync-secret`
4. Pedir de volta: **URL final** do endpoint → cadastrar em `WORDPRESS_VAGAS_SYNC_URL`
5. Combinar janela de teste (dry-run + um POST real)

---

## 7. Fluxo de dados

```
GitHub Actions (06:00 BRT)
  → POST Edge sync-vagas-carreiras-site
    → RPC rh_vagas_atualizar_status_inscricoes_encerradas
    → SELECT rh_vagas (tipo=externa, status=aberta)
    → POST WORDPRESS_VAGAS_SYNC_URL
         Header: x-spin-vagas-sync-secret
         Body: { synced_at, vagas: [...] }
    → sync_logs (slug vagas_carreiras_wordpress)
```

---

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| `WORDPRESS_VAGAS_SYNC_URL não configurada` | Secret ausente ou URL inválida |
| `SPIN_VAGAS_SYNC_SECRET não configurada` | Secret ausente |
| HTTP 401 do WordPress | Segredo diferente do configurado na agência |
| HTTP 502 / timeout | Endpoint WP fora do ar, firewall ou URL errada |
| `total_vagas: 0` | Nenhuma vaga externa com status `aberta` |
| Cron GitHub não roda | Repo privado / fila — usar **Run workflow** manual; ver `daily-jobs-watchdog.yml` |
