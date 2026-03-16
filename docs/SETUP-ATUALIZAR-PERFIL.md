# Configuração: Edição de Perfis (atualizar-perfil)

## Visão geral

Quando um administrador **edita** um usuário (altera perfil, nome, operadoras etc.), a alteração é feita pela Edge Function `atualizar-perfil`, que usa **service_role** e contorna as políticas RLS. Isso garante que o `role` e os escopos sejam persistidos corretamente.

---

## Passo 1: Deploy da Edge Function

**Importante:** use a flag `--no-verify-jwt` para evitar 401 no gateway. A verificação de admin é feita dentro da função.

```bash
supabase functions deploy atualizar-perfil --no-verify-jwt
```

---

## Passo 2: Secret SUPABASE_ANON_KEY

A função precisa da chave anônima para verificar se o caller é admin. Adicione no **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**:

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_ANON_KEY` | Chave anônima do projeto (Settings → API → anon public) |

Os demais (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) são injetados automaticamente.

---

## Passo 3: Proxy Cloudflare (produção)

O arquivo `functions/api/atualizar-perfil.ts` já está configurado para repassar as chamadas para a Edge Function. Em produção, o deploy no Cloudflare Pages inclui essa rota automaticamente.

---

## Fluxo

1. Admin edita o usuário e clica em **Salvar alterações**
2. O frontend chama `/api/atualizar-perfil` (proxy ou direto para a Edge Function)
3. A Edge Function verifica se o caller é admin
4. Usa **service_role** para atualizar:
   - `profiles` (name, role)
   - `user_scopes` (delete + insert)
   - `influencer_perfil` e `influencer_operadoras` (se role = influencer)
5. A lista de usuários é recarregada e o usuário editado precisa fazer logout/login para ver as novas permissões
