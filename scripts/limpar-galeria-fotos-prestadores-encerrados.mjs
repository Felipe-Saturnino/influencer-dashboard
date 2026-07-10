/**
 * Remove arquivos no bucket marketing-fotos-prestadores de colaboradores encerrados.
 * Complementa marketing_galeria_limpar_fotos_encerrados() (somente marketing_fotos no SQL).
 *
 * PowerShell:
 *   $env:SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="xxx"
 *   node scripts/limpar-galeria-fotos-prestadores-encerrados.mjs
 *
 * Bash:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/limpar-galeria-fotos-prestadores-encerrados.mjs
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "marketing-fotos-prestadores";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: encerrados, error: errEnc } = await supabase
    .from("rh_funcionarios")
    .select("id, nome")
    .eq("status", "encerrado");

  if (errEnc) throw errEnc;
  if (!encerrados?.length) {
    console.log("Nenhum prestador encerrado.");
    return;
  }

  const ids = encerrados.map((r) => r.id);
  const { data: fotos, error: errFotos } = await supabase
    .from("marketing_fotos")
    .select("id, storage_path, rh_funcionario_id")
    .eq("tipo", "prestador")
    .in("rh_funcionario_id", ids);

  if (errFotos) throw errFotos;

  const paths = [...new Set((fotos ?? []).map((f) => f.storage_path).filter(Boolean))];

  if (!paths.length) {
    console.log("Nenhuma foto de prestador encerrado no banco. Verificando pastas no Storage…");
    for (const row of encerrados) {
      const prefix = `prestadores/${row.id}`;
      const { data: listed, error: listErr } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: 1000,
      });
      if (listErr) {
        console.warn(`  ${row.nome}: falha ao listar ${prefix} — ${listErr.message}`);
        continue;
      }
      for (const entry of listed ?? []) {
        if (entry.id) paths.push(`${prefix}/${entry.name}`);
      }
    }
  }

  if (!paths.length) {
    console.log("Nada a remover no Storage.");
    return;
  }

  console.log(`Removendo ${paths.length} arquivo(s) de prestadores encerrados…`);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error("Falha ao remover lote:", error.message);
      process.exit(1);
    }
  }

  const { data: removidas, error: rpcErr } = await supabase.rpc(
    "marketing_galeria_limpar_fotos_encerrados",
  );
  if (rpcErr) {
    console.warn("Storage limpo; falha ao sincronizar marketing_fotos:", rpcErr.message);
  } else {
    console.log(`marketing_fotos sincronizado (${removidas ?? 0} linha(s) removida(s)).`);
  }

  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
