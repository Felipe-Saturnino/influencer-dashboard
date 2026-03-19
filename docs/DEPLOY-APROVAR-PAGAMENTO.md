# Deploy da Edge Function aprovar-pagamento

A aprovação de pagamentos no Financeiro usa a **Edge Function** `aprovar-pagamento`, que executa com **service role** e contorna bloqueios de RLS em ciclos legados.

## Deploy no Supabase

1. **Instale o Supabase CLI** (se ainda não tiver):
   ```bash
   npm install -g supabase
   ```

2. **Faça login e linke o projeto** (se ainda não tiver):
   ```bash
   supabase login
   supabase link --project-ref SEU_PROJECT_REF
   ```
   O `project-ref` está em: Supabase Dashboard → Settings → General → Reference ID.

3. **Faça o deploy da função**:
   ```bash
   supabase functions deploy aprovar-pagamento
   ```

4. **Confirme o deploy**: Supabase Dashboard → Edge Functions → deve aparecer `aprovar-pagamento`.

## Variáveis de ambiente

A função usa variáveis padrão do Supabase (já configuradas automaticamente):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Não é necessário configurar nenhum Secret adicional.

## Fluxo

1. Usuário clica em "Aprovar valor" ou "Confirmar pagamento"
2. Frontend chama `supabase.functions.invoke("aprovar-pagamento", { body: {...} })`
3. A Edge Function valida o token JWT do usuário
4. Usa o client com **service role** para fazer o UPDATE (ignora RLS)
5. Retorna `{ ok: true }` ou `{ ok: false, error: "..." }`

## Troubleshooting

- **"Edge Function aprovar-pagamento falhou"**: A função não está implantada. Execute o deploy.
- **"Sessão inválida ou expirada"**: O usuário precisa estar logado.
- **"Registro não encontrado"**: O id do pagamento não existe. Tente **Recalcular** no ciclo.
