# Acquisition Hub — Influencer Dashboard

Dashboard da Spin Gaming para gestão de influencers, lives, conversões e financeiro.

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

| Comando       | Descrição                    |
|---------------|------------------------------|
| `npm run dev` | Servidor de desenvolvimento  |
| `npm run build` | Build para produção        |
| `npm run preview` | Preview do build local   |

## Documentação adicional

- [Setup detalhado e deploy](docs/SETUP.md)

## Estrutura do projeto

```
src/
├── components/     # Componentes compartilhados
├── context/        # AppContext (auth, permissões, tema)
├── hooks/          # usePermission, useDashboardFiltros
├── lib/            # Cliente Supabase
├── pages/          # Páginas da aplicação
│   ├── dashboards/
│   ├── lives/
│   ├── operacoes/
│   ├── plataforma/
│   └── geral/
├── constants/      # Tema, menu
└── types/          # Tipos TypeScript
```
