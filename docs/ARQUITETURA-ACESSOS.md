# Arquitetura de Acessos — Acquisition Hub

Este documento descreve o modelo de permissões e segregação de dados da plataforma.

---

## Visão geral

O controle de acesso funciona em **duas camadas**:

1. **Permissões de página** (`role_permissions`) — quais páginas/módulos o usuário pode acessar
2. **Escopos de dados** (`user_scopes`) — quais influencers/operadoras o usuário pode ver (quando aplicável)

---

## Roles

| Role        | Descrição                                  |
|------------|---------------------------------------------|
| `admin`    | Administrador — acesso total + Gestão de Usuários |
| `gestor`   | Gestor — acesso amplo (sem Gestão de Usuários)    |
| `executivo`| Executivo — acesso conforme escopos ou tudo       |
| `operador` | Operador — acesso conforme escopos               |
| `agencia`  | Agência — acesso aos pares influencer×operadora   |
| `influencer` | Influencer — acesso apenas aos próprios dados  |

---

## Camada 1: Permissões de página

**Tabela:** `role_permissions`  
**Colunas:** `role`, `page_key`, `can_view`, `can_criar`, `can_editar`, `can_excluir`

- **can_view:** `sim` | `nao` | `proprios` — se pode ver a página
- **can_criar / can_editar / can_excluir:** `sim` | `nao` | `proprios` | null

O hook `usePermission(pageKey)` consulta essa tabela e retorna as permissões da página para o role do usuário. Se não houver linha para o par (role, page_key), `can_view` é tratado como `nao` — **o usuário não vê a página**.

### Regras especiais (AppContext)

- **Gestão de Usuários:** sempre `nao` para não-admin (ignora o valor em `role_permissions`)
- **Overview Influencer:** `proprios` para influencer/agência e `sim` para admin/gestor/executivo quando null

### Seed obrigatório

Para que todos os roles tenham acesso correto, execute a migration:

```
docs/migration-role-permissions-seed.sql
```

**Problema comum:** Gestor não via dashboards porque `role_permissions` não tinha linhas para `gestor` + `dash_overview` / `dash_conversao` / `dash_financeiro`.

---

## Camada 2: Escopos de dados

**Tabela:** `user_scopes`  
**Colunas:** `user_id`, `scope_type`, `scope_ref`

- **scope_type:** `influencer` | `operadora` | `agencia_par`
- **scope_ref:** ID do influencer, slug da operadora, ou `influencerId:operadoraSlug` (para agencia_par)

### Regras por role

| Role        | Escopos                            | Comportamento                                         |
|------------|-------------------------------------|-------------------------------------------------------|
| admin      | —                                   | `escoposVisiveis` = vazio → vê tudo                   |
| gestor     | —                                   | `escoposVisiveis` = vazio → vê tudo                   |
| executivo  | opcional (user_scopes)              | Se vazio → vê tudo. Se preenchido → só os do escopo   |
| operador   | obrigatório (user_scopes)           | Só vê influencers/operadoras do escopo               |
| agencia    | pares (agencia_par)                 | Só vê os pares influencer×operadora configurados      |
| influencer | implícito (próprio user_id)         | Só vê dados ligados ao próprio perfil                |

### Funções no AppContext

- `podeVerInfluencer(id)` — `true` se `influencersVisiveis.length === 0` ou `id` está na lista
- `podeVerOperadora(slug)` — `true` se `operadorasVisiveis.length === 0` ou `slug` está na lista

**Arrays vazios = sem restrição** (admin/gestor).

---

## Fluxo de verificação

```
1. Usuário faz login
       ↓
2. AppContext carrega:
   - Permissões (role_permissions) → permissions (menu)
   - Escopos (user_scopes) → escoposVisiveis
       ↓
3. Ao acessar uma página:
   - usePermission(pageKey) → canView ? renderiza : "Sem permissão"
   - useDashboardFiltros() → filtros visíveis conforme role/escopos
   - Queries Supabase → RLS (se houver) aplica restrições no banco
       ↓
4. Componentes usam podeVerInfluencer(id) / podeVerOperadora(slug)
   para filtrar ou ocultar dados no frontend
```

---

## RLS (Row Level Security)

Algumas tabelas têm RLS no Supabase:

- **profiles:** admin pode SELECT todos; usuário pode ler/atualizar próprio
- **user_scopes:** usuário lê próprios; admin lê todos
- **scout_influencer, scout_anotacoes:** authenticated pode gerenciar

**Tabelas de dados principais** (`influencer_perfil`, `operadoras`, `lives`, `live_resultados`, `influencer_metricas`, etc.): a migration `migration-data-tables-rls-authenticated-read.sql` adiciona políticas que permitem usuários **autenticados** (incl. Gestor) a ler e, onde aplicável, escrever. A segregação (quem vê o quê) continua feita no frontend via `podeVerInfluencer` / `podeVerOperadora` e `user_scopes`.

---

## Checklist de configuração

1. [ ] Executar `docs/migration-role-permissions-seed.sql` para popular permissões
2. [ ] Executar `docs/migration-data-tables-rls-authenticated-read.sql` para permitir Gestor ler dados
3. [ ] Verificar que `role_permissions` tem constraint UNIQUE (role, page_key) para upsert
4. [ ] Configurar `user_scopes` para executivo/operador/agência conforme necessidade
5. [ ] Testar login com cada role (admin, gestor, executivo, operador, agência, influencer)

---

## Referências

- `src/context/AppContext.tsx` — carrega permissões e escopos
- `src/hooks/usePermission.ts` — permissão por página
- `src/hooks/useDashboardFiltros.ts` — filtros de dashboard por role
- `src/pages/plataforma/GestaoUsuarios/index.tsx` — interface para editar `role_permissions`
- `docs/migration-user-scopes-rls-read-own.sql` — RLS em user_scopes
