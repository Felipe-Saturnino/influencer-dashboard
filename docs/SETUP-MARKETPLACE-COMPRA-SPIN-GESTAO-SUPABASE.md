# Marketplace — fix compra Spin gestão (SQL manual)

## O que colar no Supabase

**Um único arquivo** — copie e cole **inteiro** no SQL Editor:

`scripts/manual-supabase-marketplace-fix-spin-gestao-bug.sql`

Idempotente. Se já colou uma versão anterior, **cole de novo** a versão atual do script.

**Pré-requisito:** compra Spin gestão já instalada (`26200000` aplicado antes).

---

## O que o script corrige

1. `sou_interessado` na listagem — só prestador P2P
2. **Aprovar** compra Spin — mantém `proposta_spin_gestao` (comentários na célula + rótulo «Spin Gaming»)
3. Reparo de aceitas afetadas por versão anterior que zerava a flag cedo demais

---

## Verificação (opcional)

```sql
SELECT count(*) FROM public.escala_marketplace_oferta
WHERE status = 'aceita'
  AND interessado_funcionario_id IS NULL
  AND tipo IN ('venda_turno', 'venda_folga')
  AND NOT COALESCE(oferta_spin, false)
  AND NOT COALESCE(proposta_spin_gestao, false);
-- Aceitas Spin gestão devem ter proposta_spin_gestao = true
```
