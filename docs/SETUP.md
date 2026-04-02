# Setup e Deploy — Acquisition Hub

## Documentação e base de dados (índice)

| Documento | Conteúdo |
|-----------|----------|
| [MIGRACOES-E-DOCS.md](./MIGRACOES-E-DOCS.md) | Regras sobre `supabase/migrations/` (não fundir migrações antigas; nomes com data). |
| [SQL-LEGADO.md](./SQL-LEGADO.md) | Como interpretar `docs/*.sql` vs migrações formais. |
| [ESTRUTURA-DATABASE.md](./ESTRUTURA-DATABASE.md) | Visão das tabelas e referências a scripts. |
| [database-health-check.sql](./database-health-check.sql) | Queries de verificação no SQL Editor. |
| [SUPABASE-CHECKLIST-NAO-TECNICO.md](./SUPABASE-CHECKLIST-NAO-TECNICO.md) | Passos simples no painel Supabase. |
| [archive/README.md](./archive/README.md) | SQL arquivado (diagnósticos, *fixes* pontuais). |
| [`../supabase/migrations/README.md`](../supabase/migrations/README.md) | Convenções da pasta de migrações. |

No GitHub Actions: workflow **CI** (`.github/workflows/ci.yml`) corre `npm ci` e `npm run build` em pushes/PRs às branches `main`, `master` e `staging`.

## Variáveis de ambiente

O projeto usa variáveis de ambiente do Vite (prefixo `VITE_`). São embutidas no build em tempo de compilação.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase (ex: `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave anônima (pública) do Supabase |

### Onde obter

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings → API**
4. Copie **Project URL** e **anon public** key

### Ambiente local

Crie um arquivo `.env` na raiz do projeto (não versionado):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

**Importante:** Adicione `.env` ao `.gitignore` para não versionar credenciais.

### Deploy (Cloudflare Pages, Vercel, etc.)

Configure as variáveis de ambiente no painel do provedor:

- **Cloudflare Pages:** Settings → Environment variables
- **Vercel:** Project Settings → Environment Variables

Use os mesmos nomes: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Deploy no Cloudflare Pages

1. Conecte o repositório ao Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como variáveis de ambiente no projeto
5. Faça o deploy

## Supabase — RLS (Row Level Security)

Para garantir segurança no backend, configure políticas RLS nas tabelas relevantes (`profiles`, `lives`, `influencer_operadoras`, `pagamentos`, etc.), alinhadas aos roles e escopos do aplicativo.

A segregação de dados também é feita no frontend (`podeVerInfluencer`, `podeVerOperadora`), mas o RLS é a camada definitiva de proteção.
