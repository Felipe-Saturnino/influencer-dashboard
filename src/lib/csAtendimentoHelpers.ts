import { supabase } from "./supabase";
import type { CsAtendenteFiltroOption, CsChamadoMensagemRow, CsChamadoRow } from "../types/csAtendimento";

function normNomeTime(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Time do organograma cujos prestadores alimentam o filtro Staff do Atendimento. */
export function isAtendimentoStaffTimeNome(nome: string | null | undefined): boolean {
  return normNomeTime(nome ?? "") === "service manager";
}

type CsAtendenteRpcRow = { profile_id: string; nome: string | null };

/** Prestadores do time Service Manager (RPC) para o filtro Staff do Atendimento. */
export async function carregarAtendentesCustomerService(): Promise<CsAtendenteFiltroOption[]> {
  const { data, error } = await supabase.rpc("cs_atendimento_atendentes_listar");

  if (error) {
    console.error("[csAtendimento] atendentes", error);
    return [];
  }

  const rows = (data ?? []) as CsAtendenteRpcRow[];
  return rows
    .map((row) => ({
      profileId: row.profile_id,
      nome: row.nome?.trim() || "—",
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function unwrapCsEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type CsChamadoAnexoEmbed = {
  id: string;
  nome: string;
  storage_path: string;
  content_type?: string | null;
};

export type CsChamadoRowDb = CsChamadoRow & {
  cs_chamado_anexos?: CsChamadoAnexoEmbed | CsChamadoAnexoEmbed[] | null;
};

function unwrapAnexosEmbed(value: CsChamadoAnexoEmbed | CsChamadoAnexoEmbed[] | null | undefined): CsChamadoAnexoEmbed[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Normaliza linha Supabase (embed de anexos) para `CsChamadoRow`. */
export function mapCsChamadoFromDb(row: CsChamadoRowDb): CsChamadoRow {
  const { cs_chamado_anexos, ...rest } = row;
  return {
    ...rest,
    anexos: unwrapAnexosEmbed(cs_chamado_anexos).map((a) => ({
      id: a.id,
      nome: a.nome,
      storage_path: a.storage_path,
      content_type: a.content_type ?? null,
    })),
  };
}

export async function carregarMensagensChamado(chamadoId: string): Promise<CsChamadoMensagemRow[]> {
  const { data, error } = await supabase
    .from("cs_chamado_mensagens")
    .select("id, chamado_id, direcao, texto, midia_url, content_type, instagram_message_id, autor_tipo, usuario_id, created_at")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[csAtendimento] mensagens", error);
    return [];
  }
  return (data ?? []) as CsChamadoMensagemRow[];
}
