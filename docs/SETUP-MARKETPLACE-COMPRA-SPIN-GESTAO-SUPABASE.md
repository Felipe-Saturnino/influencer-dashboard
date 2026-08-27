# Marketplace — fix compra Spin gestão (SQL manual)

## O que colar no Supabase

**Um único arquivo** — copie e cole **inteiro** no SQL Editor:

`scripts/manual-supabase-marketplace-fix-spin-gestao-bug.sql`

Clique **Run**. Pode executar de novo se precisar (idempotente).

**Pré-requisito:** compra Spin gestão já instalada no projeto (você já colou o `20261126200000` antes).

---

## O que o script corrige

1. `sou_interessado` na listagem — só prestador P2P (não gestão Spin)
2. Aprovar compra Spin — zera `proposta_spin_gestao` na oferta aceita
3. Dados legado — ofertas `aceita` com flag Spin antiga

---

## Verificação (opcional)

```sql
SELECT count(*) FROM public.escala_marketplace_oferta
WHERE status = 'aceita' AND proposta_spin_gestao = true;
-- Esperado: 0
```

Frontend: deploy Cloudflare com o commit que inclui `escalaMarketplace.ts` e `MarketplaceTurnos/index.tsx`.
