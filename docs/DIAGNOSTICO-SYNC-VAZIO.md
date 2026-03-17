# Diagnóstico: Sync retorna 0 registros / tabelas vazias

## Resposta com errorCode / message

Se os logs mostram `keys=errorCode, message`, a API retornou um **erro** (não dados vazios). O sync passou a detectar isso e exibir a mensagem no Status Técnico. O próximo sync mostrará o `errorCode` e `message` exatos — confira com a CDA/Smartico o que o erro significa (ex.: endpoint não disponível para esse tipo de chave, permissões insuficientes, etc.).

---

## 1. Logs da Edge Function

**Supabase Dashboard** → **Edge Functions** → **sync-metricas** → **Logs**

Procure na última execução:

| Log | Significado |
|-----|-------------|
| `Reporting API: X UTMs carregados` | API retornou dados; X > 0 = há UTMs |
| `utm_metricas_diarias: Y linhas` | Gravação em utm_metricas_diarias funcionou |
| `403` ou `TokenExpiradoError` | Credencial inválida |
| `Plywood` em vez de `Reporting API` | Usando Plywood — utm_metricas_diarias não é preenchida |

---

## 2. Secrets no Supabase

**Supabase** → **Edge Functions** → **sync-metricas** → **Secrets** (ou Settings → Edge Functions → Secrets)

| Secret | Valor esperado |
|--------|----------------|
| `CDA_USE_REPORTING_API` | `true` |
| `CDA_INFLUENCERS_API_KEY` | Chave da API CDA |
| `SMARTICO_LABEL_ID` | ID do label/brand da CDA (ex.: `573703`). Erro "Access to this label is not allowed" = label incorreto. |

Sem `CDA_USE_REPORTING_API=true`, o sync usa Plywood e **não grava** em `utm_metricas_diarias`.

---

## 3. Tabela sync_logs

No **SQL Editor**:

```sql
SELECT status, registros_inseridos, mensagem_erro, periodo_inicio, periodo_fim, executado_em
FROM sync_logs
ORDER BY executado_em DESC
LIMIT 5;
```

- `status = 'ok'` e `registros_inseridos = 0`: sync rodou, mas API não retornou dados (ou período sem métricas).
- `status = 'falha'`: ver `mensagem_erro`.

---

## 4. Conferir URL da Reporting API

Se a CDA usa um domínio próprio (ex.: `boapi.aff.casadeapostas.bet.br`), o secret correto é:

| Secret | Exemplo |
|--------|---------|
| `SMARTICO_REPORTING_API_URL` | `https://boapi.aff.casadeapostas.bet.br` |

O padrão é `https://boapi.smartico.ai`; para CDA o valor pode ser outro.

---

## 5. Endpoint Operator vs Affiliate

A Reporting API tem dois endpoints:
- **af2_media_report_af** — Affiliate (métricas só do próprio afiliado)
- **af2_media_report_op** — Operator (métricas de todos os afiliados)

Se a `CDA_INFLUENCERS_API_KEY` for uma chave de **operador**, use o endpoint Operator.

**Supabase Secrets** → adicione ou altere:

| Secret | Valor |
|--------|-------|
| `CDA_REPORTING_ENDPOINT` | `af2_media_report_op` |

Reimplante a Edge Function e rode o sync novamente.

---

## 6. Testar a API manualmente (opcional)

**Não é SQL** — é uma requisição HTTP no PowerShell (ou Postman/curl).

Use a URL exata dos logs (ex.: `SMARTICO_REPORTING_API_URL` ou `boapi.smartico.ai`):

```powershell
$key = "SUA_CDA_INFLUENCERS_API_KEY"
# Endpoint Operator (igual ao sync)
$url = "https://boapi.smartico.ai/api/af2_media_report_op?aggregation_period=DAY&group_by=utm_source&date_from=2025-12-01&date_to=2026-03-18"
$r = Invoke-RestMethod -Uri $url -Headers @{ "Authorization" = "Bearer $key" }
$r | ConvertTo-Json -Depth 5
```

- Se retornar `errorCode` e `message`: a API está recusando (permissão, chave, endpoint).
- Se retornar `data: []`: API ok, mas sem dados para o período.
- Se retornar 403: chave inválida ou expirada.
