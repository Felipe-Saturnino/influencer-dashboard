/**
 * Esvazia o bucket rh-portal-assets (PDFs, imagens e anexos do Portal de RH).
 * Complementa scripts/limpar-portal-rh-testes.sql — rode o SQL primeiro ou depois.
 *
 * PowerShell:
 *   $env:SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="xxx"
 *   node scripts/limpar-portal-rh-storage.mjs
 *
 * Bash:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/limpar-portal-rh-storage.mjs
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "rh-portal-assets";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Lista recursivamente todos os paths de arquivos no bucket. */
async function listarArquivos(prefix = "") {
  const paths = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) {
      paths.push(path);
    } else {
      paths.push(...(await listarArquivos(path)));
    }
  }
  return paths;
}

async function main() {
  console.log(`Listando arquivos em ${BUCKET}…`);
  const paths = await listarArquivos();
  if (paths.length === 0) {
    console.log("Bucket já está vazio.");
    return;
  }

  console.log(`Removendo ${paths.length} arquivo(s)…`);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error("Falha ao remover lote:", error.message);
      process.exit(1);
    }
  }
  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
