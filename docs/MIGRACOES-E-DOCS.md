# Migrações Supabase e pasta `docs/` — como manter sem “poluir” mal

## Regra de ouro: **não juntar migrações antigas num ficheiro só**

Se a base **já recebeu** essas migrações em produção (histórico no Supabase / `schema_migrations`):

- **Não apagues**, **não renomes** nem **fundes** ficheiros antigos em `supabase/migrations/`.
- O runner identifica migrações pelo **nome do ficheiro**. Mudar ou apagar o passado faz com que:
  - ambientes novos fiquem **diferentes** dos antigos, ou
  - a CLI / CI **reclame** que o histórico não bate com o remoto.

O padrão correcto é: **só acrescentar** ficheiros novos com timestamp (`YYYYMMDD..._descricao.sql`).

“Centralizar tudo num único SQL” só faz sentido para um projeto **zero** que **nunca** aplicou migrações em lado nenhum — não é o vosso caso.

## Porque tens “muitos” ficheiros (e isso é ok)

Cada alteração **auditável** e **incremental** (RLS, coluna, RPC, fix) num ficheiro separado é **boa prática**: facilita rever o *diff*, reverter mentalmente uma mudança e alinhar com code review.

Poluição real é quando existem **duplicados sem dono** ou **docs a dizer para correr SQL que já está nas migrações** — isso sim podes limpar na documentação (ver abaixo).

## Atenção: ficheiros **sem** prefixo de data

Em `supabase/migrations/` ainda há, por exemplo:

- `add_social_thumbnails.sql`
- `create_campanhas_schema.sql`
- `create_social_media_kpi_schema.sql`

O Supabase ordena migrações pelo **nome do ficheiro**. Estes nomes, em ordenação lexicográfica, ficam **depois** dos que começam por `2026...`. Num **`db reset`** local isso pode aplicar “schema base” **tarde demais** se outras migrações assumirem que essas tabelas já existem.

- **Produção já aplicada:** não renomes ficheiros antigos (o histórico já gravou o nome).
- **Ambiente novo / CI:** se um dia rebentarem erros de ordem, a solução segura é uma **nova** migração que corrija estado (ou documentar `supabase db reset` com ordem manual) — discutir com quem mantém o CLI.

Novas alterações: usa sempre `YYYYMMDDHHMMSS_alguma_coisa.sql`.

## Pasta `docs/` — o que optimizar **sem risco**

Muitos `.sql` em `docs/` são **histórico** (“correr no SQL Editor na altura”) e **duplicam** o que já foi incorporado em `supabase/migrations/`.

Política adotada neste repositório:

1. **Fonte de verdade para schema aplicável ao Git:** `supabase/migrations/`.
2. **`docs/*.sql` (raiz):** *playbooks* e scripts ainda referenciados na documentação operacional.
3. **`docs/archive/*.sql`:** diagnósticos, *one-run*, *fixes* pontuais e limpezas — ver `docs/archive/README.md` e `docs/SQL-LEGADO.md`.

Guia humano único: `SETUP.md` (índice) + `ESTRUTURA-DATABASE.md` + `database-health-check.sql` + este ficheiro.

## Resumo

| Querer | Fazer |
|--------|--------|
| Menos ficheiros em `migrations/` | **Não** fundir os já aplicados. Aceitar histórico longo. |
| Repo mais claro | Organizar **docs** (índice, arquivar, marcar obsoletos); prefixos de data nas **novas** migrações. |
| Novo ambiente igual à produção | `supabase db push` / aplicar a mesma sequência; resolver conflitos com **nova** migração, não editar antigas. |
