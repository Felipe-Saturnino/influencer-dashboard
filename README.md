# Data Intelligence — Influencer Dashboard (Spin Gaming)

Dashboard da Spin Gaming para gestão de influencers, lives, conversões e financeiro.

Stack principal: React, TypeScript, Vite, Supabase; deploy típico em **Cloudflare Pages** (variáveis `VITE_*` no painel). Detalhes em [docs/SETUP.md](docs/SETUP.md).

## Pré-requisitos

- Node.js 18+
- npm ou pnpm

## Como rodar em desenvolvimento

1. **Clone o repositório** e entre na pasta do projeto.

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**

   Copie o arquivo de exemplo e preencha com os valores do seu projeto Supabase:

   ```bash
   cp .env.example .env
   ```

   No `.env`, defina:

   - `VITE_SUPABASE_URL` — URL do projeto (ex: `https://seu-projeto.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` — Chave anônima pública

   As credenciais estão em: **Supabase Dashboard → Project Settings → API**.

4. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

   O app abre em `http://localhost:5173` (ou outra porta indicada no terminal).

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build para produção |
| `npm run preview` | Preview do build local |
| `npm run lint` | ESLint (o CI de PR/push também roda lint + build nas branches configuradas) |
| `npm run lint:fix` | Aplica correções automáticas do ESLint onde possível |

## Documentação adicional

- [Setup detalhado, lint e deploy](docs/SETUP.md)

## Estrutura do projeto

```
src/
├── components/     # Componentes compartilhados (ex.: dashboard/*)
├── context/        # AppContext (auth, permissões, tema, brandguide operadora)
├── hooks/          # usePermission, useDashboardFiltros, useDashboardBrand, etc.
├── lib/            # Supabase, dashboardConstants, dashboardHelpers, tableStyles, etc.
├── pages/          # Páginas por seção
│   ├── dashboards/
│   ├── conteudo/   # Playbook, Links (menu Conteúdo)
│   ├── geral/
│   ├── lives/      # Agenda, Resultados, Feedback, Influencers, Scout (menu Lives)
│   ├── estudio/    # Dealers, Central, Roteiro de Mesa, solicitações (menu Estúdio; Figurinos em rh/)
│   ├── aquisicao/  # Financeiro, Banca de Jogo (menu Aquisição)
│   ├── marketing/
│   ├── rh/
│   └── plataforma/
├── constants/      # Tema, menu, authScreen, platforms
├── styles/         # global.css, responsive.css
└── types/          # Tipos TypeScript
```

`functions/` na raiz: endpoints Cloudflare Pages (API) quando aplicável.
