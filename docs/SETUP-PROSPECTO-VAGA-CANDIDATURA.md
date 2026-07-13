# Setup — Candidatura externa (Carreiras → plataforma)

Formulário no site WordPress envia candidatura para **RH → Vagas → Candidaturas** (card no kanban, etapa **Inscritos**, tipo **Externa**).

| Peça | Onde |
|------|------|
| Migration | `supabase/migrations/20260713120000_rh_vaga_candidaturas_externas_site.sql` |
| Edge Function | `supabase/functions/prospecto-vaga-candidatura-site` |
| Proxy Cloudflare | `functions/api/prospecto-vaga-candidatura-site.ts` |
| Contrato agência | `docs/api-prospecto-vaga-candidatura-site-agencia.md` |

---

## 1. Migration

Aplicar no SQL Editor (ou `db push`) a migration `20260713120000_rh_vaga_candidaturas_externas_site.sql`.

---

## 2. Secrets

### Supabase → Edge Functions → Secrets

| Secret | Valor |
|--------|--------|
| `PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET` | string longa aleatória (gerar e guardar) |

### Cloudflare Pages → Environment variables (Functions)

| Variável | Valor |
|----------|--------|
| `PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET` | **igual** ao secret do Supabase |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` | anon key |

Marcar as variáveis como disponíveis para **Functions**.

---

## 3. Deploy

```bash
supabase functions deploy prospecto-vaga-candidatura-site
```

Deploy Cloudflare Pages (para publicar o proxy `/api/prospecto-vaga-candidatura-site`).

Em `config.toml`: `verify_jwt = false`.

---

## 4. URL para a agência

```text
https://<domínio-produção-plataforma>/api/prospecto-vaga-candidatura-site
```

Ex.: `https://data-intelligence.spingaming.com.br/api/prospecto-vaga-candidatura-site`

Repassar junto com `docs/api-prospecto-vaga-candidatura-site-agencia.md`.

**Não** colocar o secret no HTML do WordPress.

---

## 5. Teste manual (após deploy)

Com uma vaga **externa** + **aberta** e `codigo_vaga` válido:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/prospecto-vaga-candidatura-site" \
  -H "x-prospecto-vaga-candidatura-secret: $PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET" \
  -F "codigo_vaga=VAG-XXXXXX" \
  -F "nome_completo=Teste Site" \
  -F "email=teste@example.com" \
  -F "telefone=11999999999" \
  -F "cidade=São Paulo" \
  -F "origem=site_spin" \
  -F "portfolio_url=https://example.com" \
  -F "curriculo=@/caminho/curriculo.pdf;type=application/pdf"
```

Resposta esperada: `{ "success": true, "id": "<uuid>" }`.

Na plataforma: **RH → Vagas → Candidaturas** → filtro **Externo** → card na coluna **Inscritos**.

---

## Troubleshooting

| Sintoma | Causa |
|---------|--------|
| 401 | Secret diferente entre CF e Supabase |
| 400 vaga | Código inexistente, não externa ou não aberta |
| 404 no proxy | Deploy Cloudflare / path da Function |
| Card não aparece | Migration não aplicada; permissão Ver/Criar em `rh_vagas` |
| Upload vídeo falha | Migration do bucket (100 MB + MIME vídeo) não aplicada |
