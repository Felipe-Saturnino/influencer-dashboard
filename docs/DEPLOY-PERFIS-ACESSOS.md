# Sequência de Deploy — Perfis e Acessos

Siga esta ordem para fazer o deploy das alterações de perfis e acessos.

---

## Pré-requisito

- Acesso ao **Supabase Dashboard** (SQL Editor)
- Projeto com as tabelas `profiles`, `role_permissions`, `user_scopes` e demais tabelas de dados

---

## Passo 1: Executar migrations no Supabase

### 1.1 Migration de permissões

**Arquivo:** `docs/migration-role-permissions-seed.sql`  
**Onde:** Supabase Dashboard → SQL Editor  
**O que faz:** Popula `role_permissions` com permissões para admin, gestor, executivo, operador, influencer e agência.

```
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de docs/migration-role-permissions-seed.sql
4. Execute (Run)
```

### 1.2 Migration de RLS (leitura de dados)

**Arquivo:** `docs/migration-data-tables-rls-authenticated-read.sql`  
**Onde:** Supabase Dashboard → SQL Editor  
**O que faz:** Permite que usuários autenticados (incl. Gestor) leiam as tabelas de dados e que usuários leiam o próprio perfil.

```
1. No mesmo SQL Editor (ou nova query)
2. Cole o conteúdo de docs/migration-data-tables-rls-authenticated-read.sql
3. Execute (Run)
```

---

## Passo 2: Commit e deploy do frontend

**Arquivos alterados (para commit no Git):**

| Caminho | Alteração |
|---------|-----------|
| `src/context/AppContext.tsx` | Lógica de escopos: `semRestricaoEscopo` para admin/gestor; Executivo sempre segue escopo |
| `src/hooks/useDashboardFiltros.ts` | Sem alteração (já exporta `podeVerOperadora`) |
| `src/pages/dashboards/DashboardOverview/index.tsx` | Usa `podeVerOperadora` no filtro de operadoras |
| `src/pages/dashboards/DashboardConversao/index.tsx` | Idem |
| `src/pages/dashboards/DashboardFinanceiro/index.tsx` | Idem |
| `src/pages/dashboards/DashboardOverviewInfluencer/index.tsx` | Idem |
| `src/pages/lives/Agenda/index.tsx` | Idem |
| `src/pages/lives/Resultados/index.tsx` | Idem |
| `src/pages/lives/Feedback/index.tsx` | Idem |
| `src/pages/operacoes/Financeiro/index.tsx` | Usa `podeVerOperadora` em filtros e modal |
| `src/pages/lives/Influencers/index.tsx` | Usa `podeVerOperadora` para operadoras no escopo |
| `docs/PLANO-IDEAIS-PERFIS-E-ACESSOS.md` | Plano aprovado |
| `docs/DEPLOY-PERFIS-ACESSOS.md` | Este guia |

**Comando sugerido:**

```bash
git add src/context/AppContext.tsx src/pages/ docs/
git add docs/migration-role-permissions-seed.sql docs/migration-data-tables-rls-authenticated-read.sql
git status   # conferir antes de commitar
git commit -m "feat(acl): implementa plano de perfis e acessos conforme Gestão de Usuários

- AppContext: semRestricaoEscopo para admin/gestor; Executivo sempre segue escopo
- Filtros: usa podeVerOperadora em todas as páginas
- Migrations: role_permissions seed + RLS para dados
- Doc: PLANO-IDEAIS-PERFIS-E-ACESSOS, DEPLOY-PERFIS-ACESSOS"
git push
```

---

## Passo 3: Conferência pós-deploy

1. **Admin:** Login, verificar acesso total e acesso à Gestão de Usuários  
2. **Gestor:** Login, verificar visão de todos os dados nas páginas permitidas (Overview, Conversão, Financeiro, Agenda, Feedback, etc.)  
3. **Executivo/Operador/Agência/Influencer:** Garantir escopos configurados na Aba Usuários e conferir se veem apenas os influencers/operadoras atribuídos  

---

## Resumo da ordem

| # | Onde | O que |
|---|------|-------|
| 1 | Supabase SQL Editor | Executar `migration-role-permissions-seed.sql` |
| 2 | Supabase SQL Editor | Executar `migration-data-tables-rls-authenticated-read.sql` |
| 3 | Git / repositório | Commit e push dos arquivos alterados |
| 4 | Plataforma | Testar login com cada perfil |
