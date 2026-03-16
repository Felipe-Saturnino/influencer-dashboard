# Configuração: Criação de Usuários com Senha Padrão

## Visão geral

Quando um administrador cria um novo usuário pelo modal **+ Novo Usuário** (Gestão de Usuários):

1. **Senha padrão**: Todas as senhas iniciais seguem a mesma definida em `SENHA_PADRAO`
2. **E-mail automático**: O usuário recebe um e-mail com link e senha temporária
3. **Troca obrigatória**: No primeiro login, o usuário é obrigado a trocar a senha

---

## Passo 1: Migration

Execute no **SQL Editor** do Supabase:

```sql
-- Arquivo: docs/migration-profiles-must-change-password.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;
```

---

## Passo 2: Secrets da Edge Function

No **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**, adicione:

| Secret | Descrição |
|--------|-----------|
| `SENHA_PADRAO` | Senha inicial para todos os novos usuários (mín. 8 caracteres) |
| `RESEND_API_KEY` | Chave da API Resend para envio de e-mails (já usada em sync-metricas) |

**Exemplo de senha padrão:** `Temp@2025` (use uma senha forte, pois é temporária)

---

## Passo 3: Deploy da Edge Function

```bash
supabase functions deploy criar-usuario
supabase functions deploy criar-usuario-scout   # Scout: criar influencer ao fechar prospecto
```

---

## Fluxo completo

1. Admin preenche o modal e clica em **Criar usuário**
2. A Edge Function `criar-usuario`:
   - Cria o usuário no Auth com a senha padrão
   - Insere o profile com `must_change_password = true`
   - Configura escopos e influencer_perfil (se aplicável)
   - Envia e-mail de boas-vindas com link e senha
3. O usuário recebe o e-mail, acessa o link e faz login com a senha temporária
4. A tela **Troque sua senha** é exibida (obrigatória)
5. Após trocar, `must_change_password` é atualizado para `false` e o acesso normal é liberado

---

## Nota: Scout

O fluxo de **fechar prospecto no Scout** (criar influencer a partir do scout) usa a Edge Function `criar-usuario-scout`, que cria o usuário no Auth com a mesma senha padrão e **não envia e-mail**. O novo influencer fica com `must_change_password = true` para trocar a senha no primeiro acesso.
