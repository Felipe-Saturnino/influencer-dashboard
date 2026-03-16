/**
 * Script para resetar a senha de todos os usuários com perfil "influencer"
 * para a senha padrão e forçar troca no próximo login.
 *
 * Uso (no PowerShell):
 *   $env:SUPABASE_URL="https://xxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="xxx"; $env:SENHA_PADRAO="SuaSenhaPadrao"; node scripts/resetar-senhas-influencers.mjs
 *
 * Uso (no Bash/Linux):
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx SENHA_PADRAO=xxx node scripts/resetar-senhas-influencers.mjs
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const senhaPadrao = process.env.SENHA_PADRAO ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!senhaPadrao || senhaPadrao.length < 8) {
  console.error("Erro: defina SENHA_PADRAO com no mínimo 8 caracteres");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Buscando usuários com perfil influencer...\n");

  const { data: perfis, error: errPerfis } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .eq("role", "influencer");

  if (errPerfis) {
    console.error("Erro ao buscar perfis:", errPerfis.message);
    process.exit(1);
  }

  if (!perfis?.length) {
    console.log("Nenhum usuário com perfil influencer encontrado.");
    return;
  }

  console.log(`Encontrados ${perfis.length} influencer(s):\n`);

  for (const p of perfis) {
    process.stdout.write(`  ${p.name ?? p.email ?? p.id} (${p.email})... `);

    const { error: errAuth } = await supabase.auth.admin.updateUserById(p.id, {
      password: senhaPadrao,
    });

    if (errAuth) {
      console.log(`ERRO: ${errAuth.message}`);
      continue;
    }

    const { error: errProfile } = await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", p.id);

    if (errProfile) {
      console.log(`senha ok, mas erro ao marcar must_change_password: ${errProfile.message}`);
    } else {
      console.log("OK");
    }
  }

  console.log("\nPronto! Os influencers devem trocar a senha no próximo login.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
