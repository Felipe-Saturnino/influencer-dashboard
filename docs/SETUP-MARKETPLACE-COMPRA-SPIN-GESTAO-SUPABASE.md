# Marketplace — fix compra Spin gestão (SQL manual)

## Cole no Supabase

**Arquivo único (versão definitiva):**

`scripts/COLE-NO-SUPABASE-marketplace-spin-gestao-fix.sql`

1. Abra o arquivo no repo
2. Ctrl+A → Ctrl+C
3. Supabase → SQL Editor → New query → Ctrl+V → **Run**

Idempotente. Pode rodar de novo se precisar.

**Pré-requisito:** compra Spin gestão já no banco (`26200000` aplicado antes).

**Ignore** `27180000` e scripts antigos — use só o arquivo acima.

Migration espelho no Git: `20261127220000_escala_marketplace_fix_spin_gestao_definitivo.sql` (mesmo conteúdo).
