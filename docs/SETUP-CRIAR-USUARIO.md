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
| `RESEND_API_KEY` | Chave da API Resend para envio de e-mails |
| `RESEND_FROM_SISTEMA` | Remetente transacional. Ex.: `Data Intelligence <sistema@data-intelligence.spingaming.com.br>` |

Detalhes do Resend: `docs/SETUP-RESEND.md`.

**Exemplo de senha padrão:** `Temp@2025` (use uma senha forte, pois é temporária)

---

## Passo 3: Deploy das Edge Functions

```bash
supabase functions deploy criar-usuario
supabase functions deploy criar-usuario-scout
supabase functions deploy sync-rh-prestador-auth-user
supabase functions deploy criar-afiliado-network
```

---

## Fluxos de criação de usuário — e-mail de boas-vindas

Template canônico: `emailTemplates/boasVindasUsuario.ts` (dentro da function) via **`enviarEmailBoasVindasConta`** (`fromKind: 'sistema'` → secret **`RESEND_FROM_SISTEMA`**, **distinta** de `RESEND_FROM_RELATORIOS`).

| Fluxo | Edge Function | UI | Envia e-mail? |
|-------|---------------|-----|---------------|
| **Gestão de Usuários** (admin manual) | `criar-usuario` | Gestão de Usuários → + Novo Usuário | Sim |
| **Scout** (fechar prospecto / influencer) | `criar-usuario-scout` | Lives → Scout | Sim *(após deploy)* |
| **RH** (prestador/gestor) | `sync-rh-prestador-auth-user` | Gestão de Prestadores | Sim *(só na criação nova)* |
| **Network** (prospecto → afiliado) | `criar-afiliado-network` | Afiliados → Network → Salvar | Sim |

**Não criam usuário Auth** (sem e-mail de conta):

| Fluxo | Função | Observação |
|-------|--------|------------|
| Formulário site → Scout | `prospecto-scout-site` | Só insere em `scout_influencer` |
| Formulário site → Network | `prospecto-afiliados-network-site` | Só insere em `afiliados_network` |
| Desativar / reset senha | `admin-usuario-acao` | Reset usa `recuperar-senha` (e-mail de senha redefinida) |
| Esqueci minha senha (login) | `recuperar-senha` | E-mail transacional distinto (não é boas-vindas) |

Resposta típica após criação: `{ success, userId, emailEnviado, emailErro? }`. Falha de e-mail **não** desfaz a conta — confira logs e `RESEND_*`.

---

## Fluxo completo (Gestão de Usuários)

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

## Scout, RH e Network

Os três fluxos usam o **mesmo** e-mail de boas-vindas (`Conta criada | Spin Gaming Data Intelligence`), remetente **`RESEND_FROM_SISTEMA`** e `SENHA_PADRAO`. O front envia `loginUrl: window.location.origin` quando disponível.

- **Scout:** `criar-usuario-scout` — ao marcar Fechado ou salvar com criação de usuário; **não** envia e-mail no modo `vincular_operadora` (usuário já existia).
- **RH:** `sync-rh-prestador-auth-user` — ao salvar prestador que ainda não tinha login; retorna `skipped` se e-mail já existir.
- **Network:** `criar-afiliado-network` — no Salvar de prospecto sem `afiliado_user_id`.

---

## Diagnóstico — e-mail não chegou

1. **Deploy:** template e envio unificados exigem deploy de **todas** as funções da tabela acima.
2. **Secrets:** `RESEND_API_KEY` + **`RESEND_FROM_SISTEMA`** (domínio **Verified** no Resend) — **não** usar `RESEND_FROM_RELATORIOS` para boas-vindas.
3. **Resposta da API:** `emailEnviado: false` → logs `[email] Falha boas-vindas` ou `[criar-usuario] Erro ao enviar e-mail`.
4. **Scout vincular operadora:** sem e-mail (conta já criada antes).

---

## Teste de layout (sem criar usuário)

1. Secret **`EMAIL_TESTE_SECRET`** no Supabase (string longa aleatória).
2. Deploy: `supabase functions deploy enviar-email-teste`
3. PowerShell:

```powershell
$url = "https://SEU_PROJETO.supabase.co/functions/v1/enviar-email-teste"
$key = "sua-anon-key"
$secret = "valor-de-EMAIL_TESTE_SECRET"
$body = @{
  secret = $secret
  template = "boas_vindas"
  to = "seu-email@spingaming.com.br"
  loginUrl = "https://data-intelligence.spingaming.com.br"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post `
  -Headers @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json" } `
  -Body $body
```

Assunto do teste: `[Teste] Conta criada | Spin Gaming Data Intelligence` (senha fictícia no corpo).
