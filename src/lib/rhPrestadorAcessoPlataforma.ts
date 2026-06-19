import { supabase } from "./supabase";

export type RhPrestadorAcessoPlataforma = {
  tem_acesso: boolean;
  access_granted_at: string | null;
  access_granted_by_label: string | null;
  first_sign_in_at: string | null;
  last_sign_in_at: string | null;
  sign_in_count: number | null;
};

export function fmtDataHoraAcessoPlataforma(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export const ACCESS_GRANTED_BY_CANONICAL_LABEL = "Felipe Saturnino";

export function labelUsuarioQueForneceuAcesso(row: RhPrestadorAcessoPlataforma): string {
  if (!row.tem_acesso) return "—";
  const nome = row.access_granted_by_label?.trim();
  if (nome) return nome;
  return ACCESS_GRANTED_BY_CANONICAL_LABEL;
}

export async function buscarRhPrestadorAcessoPlataforma(
  rhFuncionarioId: string,
): Promise<{ data: RhPrestadorAcessoPlataforma | null; error: string | null }> {
  const { data, error } = await supabase.rpc("rh_prestador_acesso_plataforma", {
    p_rh_funcionario_id: rhFuncionarioId,
  });
  if (error) {
    return { data: null, error: "Não foi possível carregar o acesso à plataforma. Se o problema persistir, entre em contato com o suporte." };
  }
  if (!data || typeof data !== "object") {
    return { data: null, error: null };
  }
  const o = data as Record<string, unknown>;
  return {
    data: {
      tem_acesso: o.tem_acesso === true,
      access_granted_at: typeof o.access_granted_at === "string" ? o.access_granted_at : null,
      access_granted_by_label:
        typeof o.access_granted_by_label === "string" ? o.access_granted_by_label : null,
      first_sign_in_at: typeof o.first_sign_in_at === "string" ? o.first_sign_in_at : null,
      last_sign_in_at: typeof o.last_sign_in_at === "string" ? o.last_sign_in_at : null,
      sign_in_count: typeof o.sign_in_count === "number" ? o.sign_in_count : null,
    },
    error: null,
  };
}
