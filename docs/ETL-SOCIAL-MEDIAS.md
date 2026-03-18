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

### 3. GitHub Actions (automático)

O workflow `.github/workflows/sync-social-kpis-daily.yml` roda **todo dia às 6h (horário de Brasília)**.

Configure os **Secrets** em: Repositório → Settings → Secrets and variables → Actions.

| Secret | Obrigatório | Uso |
|--------|-------------|-----|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave `service_role` (Dashboard → Settings → API) |
| `META_ACCESS_TOKEN` | Para IG/FB | Token de longa duração da Meta |
| `META_PAGE_ID` | Para IG/FB | ID da página do Facebook |
| `META_IG_ACCOUNT_ID` | Para IG (opcional) | ID direto da conta Instagram Business (evita lookup via Page) |
| `YOUTUBE_CLIENT_ID` | Para YT | OAuth 2.0 Client ID |
| `YOUTUBE_CLIENT_SECRET` | Para YT | OAuth 2.0 Client Secret |
| `YOUTUBE_REFRESH_TOKEN` | Para YT | Refresh token obtido no fluxo OAuth |
| `YOUTUBE_CHANNEL_ID` | Para YT | ID do canal do YouTube |
| `LINKEDIN_ACCESS_TOKEN` | Para LI | Token de acesso à API do LinkedIn |
| `LINKEDIN_ORG_ID` | Para LI | URN da organização (ex: `urn:li:organization:123456`) |

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

1. Crie um app em [developers.facebook.com](https://developers.facebook.com).
2. Conecte a página do Facebook ao app.
3. Vincule a conta do Instagram Business à página.
4. Gere um **Page Access Token** de longa duração (60 dias).
5. Permissões necessárias: `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_manage_insights`.

**Token expirado?** Se aparecer `Session has expired` ou `Token expirado`, gere um novo Page Access Token em Meta for Developers → Seu App → Ferramentas → Graph API Explorer. Atualize o secret `META_ACCESS_TOKEN` no GitHub.

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
├── etl.py           # Script principal (dia a dia)
├── backfill.py      # Carga histórica (intervalo de datas)
├── requirements.txt
docs/
└── ETL-SOCIAL-MEDIAS.md   # Esta documentação
.github/workflows/
└── sync-social-kpis-daily.yml
```

---

## Diferença do sync-metricas (CDA)

- **sync-metricas:** Edge Function em TypeScript que sincroniza métricas da CDA (afiliados) para `influencer_metricas`. Chamada via HTTP.
- **Este ETL:** Script Python independente que coleta dados das APIs de redes sociais e grava em `kpi_daily`, `instagram_posts`, etc. Roda em GitHub Actions ou localmente.

São pipelines separados, para fontes e tabelas diferentes.
