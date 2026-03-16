# Estrutura da Base de Dados — Influencer Dashboard (Supabase)

## Visão geral

O projeto usa **Supabase** (PostgreSQL) como backend. A aplicação consome tabelas públicas, views e funções RPC. Este documento descreve a estrutura esperada e como verificar a saúde da base.

---

## Configuração de conexão

- **URL:** `VITE_SUPABASE_URL` (ex: `https://seu-projeto.supabase.co`)
- **Chave:** `VITE_SUPABASE_ANON_KEY` (chave anônima pública)

Configure no `.env` conforme `docs/SETUP.md`.

---

## Tabelas principais

### Autenticação e usuários

| Tabela | Descrição | Colunas principais |
|--------|-----------|---------------------|
| `auth.users` | Usuários do Supabase Auth (nativo) | id, email |
| `profiles` | Perfil estendido (nome, role) | id, name, email, role |

**Roles:** `admin`, `gestor`, `executivo`, `influencer`, `operador`, `agencia`

---

### Influencers e operadoras

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `influencer_perfil` | Dados do influencer (nome artístico, cache, links, etc.) | `id` → auth.users |
| `operadoras` | Operadoras de cassino (slug, nome) | — |
| `influencer_operadoras` | Relação N:N influencer × operadora | influencer_id, operadora_slug |

---

### Lives e resultados

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `lives` | Agenda de lives (data, influencer, status, plataforma) | influencer_id → influencer_perfil |
| `live_resultados` | Resultados pós-live (duração, views, etc.) | live_id → lives |

**Status de live:** `agendada`, `realizada`, `cancelada`

---

### Métricas e financeiro

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `influencer_metricas` | Métricas diárias (FTD, depósito, saque, GGR) por operadora | influencer_id, operadora_slug → operadoras |
| `ciclos_pagamento` | Períodos de pagamento (início, fim, fechado) | — |
| `pagamentos` | Pagamentos de influencers (por ciclo, live) | ciclo_id, influencer_id |
| `pagamentos_agentes` | Pagamentos de agentes | ciclo_id |

---

### Permissões e escopos

| Tabela | Descrição | Uso |
|--------|-----------|-----|
| `role_permissions` | Permissões por página e role (can_view, can_criar, etc.) | Menu e rotas |
| `user_scopes` | Escopos do usuário (influencers/operadoras visíveis) | Segregação de dados |

**scope_type:** `influencer`, `operadora`, `agencia_par`  
**page_key:** `dash_overview`, `agenda`, `influencers`, `financeiro`, etc.

---

### Gestão de links e scout

| Tabela | Descrição | Migração |
|--------|-----------|----------|
| `utm_aliases` | Aliases UTM para mapear tráfego a influencers | — |
| `scout_influencer` | Prospectação de novos influencers | `docs/scout-migrations.sql` |
| `scout_anotacoes` | Anotações por prospect | `docs/scout-migrations.sql` |

---

## Views e funções RPC

### View `v_influencer_metricas_mensal`
- Agrega `influencer_metricas` por mês
- Usada pelo Dashboard Financeiro para reduzir carga

### Função `get_metricas_financeiro(p_ano, p_mes, p_influencer_id, p_historico, p_operadora_slug)`
- Retorna métricas agregadas com colunas calculadas (tickets médios, GGR/jogador, WD ratio, PVI, perfil)
- `p_operadora_slug` NULL = agrega todas as operadoras; preenchido = filtra por operadora
- Migração: `docs/dashboard-financeiro-operadora.sql` (após `migration-influencer-metricas-operadora.sql`)

---

## Índices recomendados

Para performance em agregações:

```sql
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_influencer_data
  ON influencer_metricas (influencer_id, data);
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_data
  ON influencer_metricas (data);
```

---

## Row Level Security (RLS)

O `docs/SETUP.md` recomenda habilitar RLS nas tabelas sensíveis:
- `profiles`, `lives`, `influencer_operadoras`, `pagamentos`, etc.

Páginas como Scout têm políticas explícitas em `docs/scout-migrations.sql`.

---

## Verificação de saúde

Execute o script `docs/database-health-check.sql` no **Supabase SQL Editor** para:

1. Listar tabelas e contagem de registros
2. Verificar tabelas esperadas vs existentes
3. Listar views e funções RPC
4. Checar status do RLS
5. Listar índices
6. Detectar registros órfãos (FK quebradas)

---

## Fluxo de dados (resumo)

```
auth.users
    └── profiles (role, name)
            └── influencer_perfil (dados do influencer)
                    ├── influencer_operadoras ← operadoras
                    ├── lives → live_resultados
                    └── influencer_metricas
                            └── v_influencer_metricas_mensal
                                    └── get_metricas_financeiro() → Dashboard Financeiro

ciclos_pagamento
    ├── pagamentos (influencers)
    └── pagamentos_agentes
```

---

## Migrações disponíveis

| Arquivo | Propósito |
|---------|-----------|
| `docs/dashboard-financeiro-migrations.sql` | View mensal, RPC, índices, withdrawal_count |
| `docs/migration-influencer-metricas-operadora.sql` | Coluna operadora_slug em influencer_metricas, backfill |
| `docs/dashboard-financeiro-operadora.sql` | View e RPC com suporte a operadora |
| `docs/scout-migrations.sql` | Scout + anotações |
| `docs/fix-role-permissions-agencia.sql` | Adicionar role "agencia" em role_permissions |
| `docs/migration-role-permissions-seed.sql` | Seed completo de permissões para todos os roles (incl. gestor) |
| `docs/migration-data-tables-rls-authenticated-read.sql` | RLS: permitir Gestor (e demais autenticados) ler tabelas de dados |
| `docs/ARQUITETURA-ACESSOS.md` | Documentação da arquitetura de permissões e escopos |
| `docs/passo5-rpc-get_metricas_financeiro.sql` | Apenas a função RPC |

---

## Sugestões de manutenção

1. **Backup:** Use o backup automático do Supabase ou exportações regulares.
2. **Monitoramento:** Acompanhe uso de storage e conexões no Dashboard.
3. **RLS:** Revise políticas periodicamente; teste com roles diferentes.
4. **Índices:** Monitore queries lentas; adicione índices em colunas filtradas.
