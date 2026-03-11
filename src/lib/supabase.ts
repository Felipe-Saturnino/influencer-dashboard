import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Use para exibir mensagem na UI quando as credenciais estão vazias */
export const supabaseConfigOk = !!(supabaseUrl && supabaseAnonKey);
