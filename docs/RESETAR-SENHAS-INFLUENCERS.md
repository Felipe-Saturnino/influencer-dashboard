# Resetar senhas de influencers

Script para redefinir a senha de **todos os usuários com perfil influencer** para a senha padrão e forçar a troca no próximo login.

## Onde encontrar as credenciais

- **SUPABASE_URL**: Dashboard → Settings → API → Project URL  
- **SUPABASE_SERVICE_ROLE_KEY**: Dashboard → Settings → API → service_role (secret)  
- **SENHA_PADRAO**: A mesma usada na Edge Function criar-usuario (Secrets)

## Execução

No terminal, na pasta do projeto:

**PowerShell (Windows):**
```powershell
$env:SUPABASE_URL="https://dzyuqibobeujzedomlsc.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
$env:SENHA_PADRAO="SuaSenhaPadrao"
node scripts/resetar-senhas-influencers.mjs
```

**Bash (Linux/Mac):**
```bash
SUPABASE_URL=https://dzyuqibobeujzedomlsc.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key \
SENHA_PADRAO=SuaSenhaPadrao \
node scripts/resetar-senhas-influencers.mjs
```

⚠️ **Não commite** a service_role key. Use variáveis de ambiente ou um `.env.local` (não versionado).
