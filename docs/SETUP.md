# Setup e Deploy — Data Intelligence (Spin Gaming)

## Documentação e base de dados (índice)

| Documento | Conteúdo |
|-----------|----------|
| [MIGRACOES-E-DOCS.md](./MIGRACOES-E-DOCS.md) | Regras sobre `supabase/migrations/` (não fundir migrações antigas; nomes com data). |
| [ESTRUTURA-DATABASE.md](./ESTRUTURA-DATABASE.md) | Visão das tabelas e referências a scripts. |
| [database-health-check.sql](./database-health-check.sql) | Queries de verificação no SQL Editor. |
| [SUPABASE-CHECKLIST-NAO-TECNICO.md](./SUPABASE-CHECKLIST-NAO-TECNICO.md) | Passos simples no painel Supabase. |
| [archive/README.md](./archive/README.md) | SQL arquivado (diagnósticos, *fixes* pontuais). |
| [`../supabase/migrations/README.md`](../supabase/migrations/README.md) | Convenções da pasta de migrações. |

No GitHub Actions: workflow **CI** (`.github/workflows/ci.yml`) corre `npm ci`, **`npm run lint`** e `npm run build` em pushes/PRs às branches `main`, `master` e `staging`.

## Lint (ESLint)

Configuração na raiz: `eslint.config.js` (TypeScript, React Hooks, React Refresh, Prettier desativando regras conflituosas).

| Comando | Uso |
|---------|-----|
| `npm run lint` | Verifica o projeto (o CI falha se houver **erros**). |
| `npm run lint:fix` | Aplica correções automáticas onde o ESLint permitir (`prefer-const`, etc.). |

Avisos (`warnings`), por exemplo `exhaustive-deps` ou `no-explicit-any` em modo aviso, **não** fazem falhar o `lint` por defeito; apenas os **erros** bloqueiam o CI.

O projeto usa `--max-warnings 0`: qualquer aviso tratado como erro também bloqueia commit e CI.

### Pre-commit local (evitar “Commit failed”)

Depois de `npm install`, o script `prepare` instala um hook Git (`.git/hooks/pre-commit`) que executa:

1. `npm run precommit` → **lint-staged** (`eslint --max-warnings 0` só nos ficheiros **em stage**)
2. `npm run test`

Se o commit falhar no ESLint, a mensagem indica ficheiro e linha (ex.: variável declarada e não usada — `@typescript-eslint/no-unused-vars`).

**Antes de commitar**, na raiz do projeto:

```bash
npm run lint
```

Valida **todo** o `src/` (não só o que está em stage) e evita surpresas ao fazer commit parcial ou após refactors que removem uso de variáveis.

Comandos úteis:

| Comando | Quando usar |
|---------|-------------|
| `npm run lint` | Antes de cada commit (recomendado) |
| `npm run lint:fix` | Corrigir o que o ESLint conseguir automaticamente |
| `npm run precommit` | Simular só o lint dos ficheiros em stage |
| `npm run ci` | Mesmo conjunto do CI: lint + test + build |

**Ignorar o hook uma vez** (emergência): `SKIP_SIMPLE_GIT_HOOKS=1 git commit ...`

**Hook não corre?** Volte a instalar dependências (`npm install`) ou confirme que existe `.git/hooks/pre-commit` após o `prepare`.

**Cursor / VS Code:** extensão ESLint ativa — erros de variável não usada aparecem no editor antes do commit.

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

### Build Vite — chunks (obrigatório antes de alterar `vite.config.ts`)

O projeto usa **Vite 8 + Rolldown** (`codeSplitting.groups` em `vite.config.ts`). Regra de produção validada no Cloudflare Pages:

- **`lucide-react` e `react-icons` vão no grupo `vendor-react`** — nunca em chunk isolado (`vendor-icons`, `vendor-ui-icons`, etc.).
- Chunk isolado de ícones costuma gerar **HTTP 500** (ficheiro vazio) após deploy; a plataforma fica em branco no F12 mesmo com build CI verde.
- Detalhe completo: **`.cursor/rules/global.mdc`** (§ Build Vite e deploy) e **`docs/SAUDE_CODIGO.md`** (sintomas e rollback).

### Conferência pós-deploy

1. Abrir a URL de produção com **Ctrl+Shift+R**.
2. DevTools → **Network**: todos os `.js` listados no `index.html` devem estar **200** e `application/javascript`.
3. **Não** deve existir pedido a `vendor-*-icons-*`; ícones vêm em `vendor-react-*.js`.

Se um asset em `/assets/` responder **500** com tamanho 0:

1. **Rollback** no Cloudflare para o último deploy estável.
2. Reverter ou corrigir alteração em `vite.config.ts` (fundir o chunk problemático num vendor que já sobe, em geral `vendor-react`).
3. Novo commit + deploy e repetir a conferência acima.

**Retry** no mesmo deploy raramente resolve quando só um chunk falha; preferir rollback + fix no `vite.config.ts`.

## Supabase — RLS (Row Level Security)

Para garantir segurança no backend, configure políticas RLS nas tabelas relevantes (`profiles`, `lives`, `influencer_operadoras`, `pagamentos`, etc.), alinhadas aos roles e escopos do aplicativo.

A segregação de dados também é feita no frontend (`podeVerInfluencer`, `podeVerOperadora`), mas o RLS é a camada definitiva de proteção.
