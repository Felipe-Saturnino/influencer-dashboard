# ETL Social Media KPIs

Pipeline que coleta métricas do Instagram, Facebook, YouTube e LinkedIn e grava no Supabase.

## Pré-requisitos

1. **Schema no Supabase**  
   Execute o script `supabase/migrations/create_social_media_kpi_schema.sql` antes de rodar o ETL.

2. **APIs e tokens**  
   Cada canal exige configuração específica (ver abaixo).

---

## Como executar

### 1. Execução local

```bash
cd scripts/etl-social-kpis
pip install -r requirements.txt
```

Defina as variáveis de ambiente e rode:

```powershell
# Mínimo: Supabase
$env:SUPABASE_URL = "https://seu-projeto.supabase.co"
$env:SUPABASE_SERVICE_KEY = "sua-service-role-key"

# Opcional: só as plataformas que deseja coletar
$env:META_ACCESS_TOKEN = "..."      # Instagram + Facebook
$env:META_PAGE_ID = "..."          # ID da página do Facebook
$env:META_IG_ACCOUNT_ID = "..."    # (opcional) ID da conta Instagram Business
$env:YOUTUBE_CLIENT_ID = "..."
$env:YOUTUBE_CLIENT_SECRET = "..."
$env:YOUTUBE_REFRESH_TOKEN = "..."
$env:YOUTUBE_CHANNEL_ID = "..."
$env:LINKEDIN_ACCESS_TOKEN = "..."
$env:LINKEDIN_ORG_ID = "urn:li:organization:XXXXXXX"

python etl.py
```

Canais sem variáveis configuradas são pulados.

### 2. Carga histórica (backfill)

**Importante:** O job diário só coleta dados de **ontem**. Para meses passados (ex.: Fevereiro), é obrigatório rodar o backfill manualmente — caso contrário, esses meses ficarão vazios ou com poucos posts.

Para carregar dados de um período passado (~90 dias, ex.: jan/2026 até ontem):

```powershell
# Na pasta do projeto
cd scripts/etl-social-kpis
pip install -r requirements.txt

# Defina as mesmas env vars do ETL (SUPABASE_*, META_*, YOUTUBE_*, etc.)
# Período padrão: 2026-01-01 até ontem
python backfill.py

# Ou especifique o intervalo:
$env:BACKFILL_START_DATE = "2026-01-01"
$env:BACKFILL_END_DATE = "2026-03-17"
python backfill.py
```

Também pode rodar via **GitHub Actions** em: Actions → Backfill Social KPIs (histórico) → Run workflow.

#### Backfill em período longo (reduzir taxa de erro)

1. **Token Meta antes de tudo** — Use **System User** no Business Manager (`META_ACCESS_TOKEN` no GitHub). O backfill valida **preflight + Page Access Token** (`meta_backfill_preflight`) antes do loop — Facebook exige Page token derivado do System User.
2. **Janelas menores** — Para 6–12 meses, rode em blocos (ex.: Jan–Mar, depois Abr–Jun). Facilita reexecutar só o que falhou e reduz risco de rate limit.
3. **Pausa entre dias** — Padrão 2 s (`BACKFILL_SLEEP_SECONDS` ou input no workflow). Se a Meta retornar throttling, use `4`.
4. **Canais** — Workflow default: `instagram,facebook`. Para todos: deixe `channels` vazio ou `instagram,facebook,youtube,linkedin`.
5. **Ambiente opcional**
   - `SKIP_META_PREFLIGHT=1` — pula a checagem inicial (só se souber o que está fazendo).
   - `BACKFILL_FAIL_FAST_META=1` — ao primeiro OAuth 190 / token expirado no Instagram/Facebook, encerra o job.
   - `BACKFILL_CHANNELS=instagram,facebook` — limita canais (útil se YouTube/LinkedIn não estiverem configurados).

### 3. GitHub Actions (automático)

O workflow `.github/workflows/sync-social-kpis-daily.yml` roda **todo dia às 6h30 (horário de Brasília)**.

Workflows relacionados:

| Workflow | Quando | Função |
|----------|--------|--------|
| `sync-social-kpis-daily.yml` | Diário 6h30 BRT | Coleta ontem → Supabase |
| `check-meta-token-weekly.yml` | Segunda 8h BRT | Falha se token Meta inválido ou expira em < 14 dias |
| `backfill-social-kpis.yml` | Manual | Carga histórica |

Configure os **Secrets** em: Repositório → Settings → Secrets and variables → Actions.

| Secret | Obrigatório | Uso |
|--------|-------------|-----|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave `service_role` (Dashboard → Settings → API) |
| `META_ACCESS_TOKEN` | Para IG/FB | **Page Access Token** (ver § Meta abaixo) |
| `META_PAGE_ID` | Para IG/FB | ID da página do Facebook |
| `META_IG_ACCOUNT_ID` | Para IG (opcional) | ID direto da conta Instagram Business (evita lookup via Page) |
| `META_APP_ID` | Recomendado | App ID — permite `debug_token` e alerta de expiração |
| `META_APP_SECRET` | Recomendado | App Secret — par do `META_APP_ID` |
| `YOUTUBE_CLIENT_ID` | Para YT | OAuth 2.0 Client ID |
| `YOUTUBE_CLIENT_SECRET` | Para YT | OAuth 2.0 Client Secret |
| `YOUTUBE_REFRESH_TOKEN` | Para YT | Refresh token obtido no fluxo OAuth |
| `YOUTUBE_CHANNEL_ID` | Para YT | ID do canal do YouTube |
| `LINKEDIN_ACCESS_TOKEN` | Para LI | Token de acesso à API do LinkedIn |
| `LINKEDIN_ORG_ID` | Para LI | URN da organização (ex: `urn:li:organization:123456`) |

### Validar token Meta antes de depurar

```powershell
cd scripts/etl-social-kpis
pip install -r requirements.txt
$env:META_ACCESS_TOKEN = "..."
$env:META_PAGE_ID = "..."
$env:META_APP_ID = "..."
$env:META_APP_SECRET = "..."
python validate_meta_token.py
```

Exit code **0** = OK · **1** = inválido ou expira em menos de 14 dias (`META_TOKEN_WARN_DAYS`).

Também é possível rodar manualmente em: Actions → Sync Social Media KPIs (6h) → Run workflow.

---

## O que é coletado

- **TARGET_DATE:** sempre o **dia anterior** (ontem).
- **kpi_daily:** métricas agregadas diárias por canal.
- **instagram_posts, facebook_posts, youtube_videos, linkedin_posts:** métricas por post/vídeo.
- **pipeline_runs:** log de cada execução por canal.

---

## Como obter os tokens

### Meta (Instagram + Facebook)

#### Diagnóstico — erro «user logged out» / OAuth 190

Mensagem típica no Status Técnico:

> `Error validating access token: The session is invalid because the user logged out.`

**Causa:** o `META_ACCESS_TOKEN` no GitHub foi gerado a partir da sessão de um **usuário pessoal** (Graph API Explorer ou login no Facebook). Quando esse usuário faz logout, troca senha ou o token de 60 dias vence, Instagram e Facebook param de sincronizar — a aba **Alcance** fica sem dados novos.

**Correção imediata (restaura o sync hoje):**

1. Acesse [Meta for Developers](https://developers.facebook.com) → seu App → **Ferramentas** → **Graph API Explorer** ou **Access Token Tool**.
2. Gere um novo **Page Access Token** da página Spin (usuário admin da Página + IG Business).
3. Estenda para longa duração (botão «Extend Access Token») **ou** migre para System User (recomendado abaixo).
4. GitHub → repositório → **Settings → Secrets and variables → Actions** → atualize `META_ACCESS_TOKEN`.
5. Rode `python validate_meta_token.py` (local) ou **Actions → Sync Social Media KPIs → Run workflow**.
6. Se faltarem dias no dashboard, rode **Backfill Social KPIs** para o intervalo afetado.

#### Produção — token que não expira (System User)

Tokens de usuário pessoal **sempre** voltarão a falhar. Para automação diária estável:

1. [Meta Business Settings](https://business.facebook.com/settings) → **Usuários → Usuários do sistema** → criar System User (Admin).
2. Atribuir ativos: **Página Facebook** + **conta Instagram Business** da Spin.
3. No app (developers.facebook.com): adicionar o System User com permissões `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_manage_insights`.
4. Gerar token para o System User com acesso à Página — em apps Business este token **não expira** (`expires_at = 0` no `debug_token`).
5. Gravar em `META_ACCESS_TOKEN` no GitHub.
6. Configure também `META_APP_ID` + `META_APP_SECRET` para o job avisar **14 dias antes** se algo mudar.

Passos detalhados: [System Users — Marketing API](https://developers.facebook.com/docs/marketing-api/system-users).

#### Permissões e IDs

1. Crie um app em [developers.facebook.com](https://developers.facebook.com).
2. Conecte a página do Facebook ao app.
3. Vincule a conta do Instagram Business à página.
4. Permissões necessárias: `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_manage_insights`. Conta Business com Page vinculada ao Instagram Business pode exigir também `ads_read` ou `ads_management` para alguns endpoints (ex.: Stories).

**Conta correta** — O token deve ser de um usuário/System User com acesso **admin** à Página e à conta Instagram Business.

**Instagram retorna 400 na Page lookup?** Se a Página não tiver Instagram vinculada, use o secret opcional `META_IG_ACCOUNT_ID` com o ID direto da conta Instagram Business.

### YouTube

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com).
2. Ative **YouTube Data API v3** e **YouTube Analytics API**.
3. Crie credenciais OAuth 2.0 (tipo “Desktop app” para uso local/back-end).
4. Use o fluxo OAuth para obter o **refresh token** (há scripts e tutoriais para isso).

### LinkedIn

1. Crie um app em [linkedin.com/developers](https://www.linkedin.com/developers).
2. Solicite permissões: `r_organization_social`, `r_organization_admin`, etc.
3. Gere um token de acesso para a organização (company page).

---

## Estrutura de arquivos

```
scripts/etl-social-kpis/
├── etl.py                 # Script principal (dia a dia)
├── backfill.py            # Carga histórica (intervalo de datas)
├── meta_token_utils.py    # Validação / debug_token Meta
├── validate_meta_token.py # CLI — usar antes de renovar secrets
├── get_youtube_token.py   # OAuth YouTube (refresh token)
├── requirements.txt
docs/
└── ETL-SOCIAL-MEDIAS.md   # Esta documentação
.github/workflows/
├── sync-social-kpis-daily.yml
├── check-meta-token-weekly.yml
└── backfill-social-kpis.yml
```

---

## Diferença do sync-metricas (CDA)

- **sync-metricas:** Edge Function em TypeScript que sincroniza métricas da CDA (afiliados) para `influencer_metricas`. Chamada via HTTP.
- **Este ETL:** Script Python independente que coleta dados das APIs de redes sociais e grava em `kpi_daily`, `instagram_posts`, etc. Roda em GitHub Actions ou localmente.

São pipelines separados, para fontes e tabelas diferentes.
