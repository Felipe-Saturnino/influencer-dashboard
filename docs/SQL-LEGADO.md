# SQL em `docs/` (fora de `supabase/migrations/`)

## Onde está a verdade para novos ambientes

1. **`supabase/migrations/`** — alterações de schema, RLS e RPC que o projeto pretende versionar.
2. **`docs/*.sql`** — *playbooks*, seeds, e cópias de migrações aplicadas manualmente no passado; podem **sobrepor-se** parcialmente ao que já foi incorporado nas migrações formais.

Antes de executar qualquer `docs/migration-*.sql` ou `dashboard-financeiro*.sql` numa base **nova**, compare com o estado actual em `supabase/migrations/` e com o Supabase Dashboard.

## Ficheiros ainda em `docs/` (não arquivados)

| Área | Ficheiros típicos |
|------|---------------------|
| Auth / perfis | `migration-fix-auth-trigger-profiles.sql`, `migration-profiles-*.sql` |
| Permissões / RLS de dados | `migration-role-permissions-seed.sql`, `migration-data-tables-rls-authenticated-read.sql`, `migration-influencer-perfil-operadoras-write-rls.sql` |
| Financeiro / métricas | `migration-influencer-metricas-*.sql`, `dashboard-financeiro-*.sql`, `passo5-rpc-*.sql` |
| UTM / integração | `migration-utm-*.sql`, `migration-utm-metricas-diarias.sql` |
| Operacional | `migration-status-tecnico.sql`, `migration-ciclos-pagamento-*.sql`, `dealers-migrations.sql`, `scout-migrations.sql` |
| Verificação | `database-health-check.sql` |

## Movidos para `docs/archive/`

Scripts de **diagnóstico**, **teste**, **correcção pontual** e **limpeza one-off** — ver `docs/archive/README.md` e listagem no Git.
