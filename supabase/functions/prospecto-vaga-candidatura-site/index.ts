/**
 * Edge Function: prospecto-vaga-candidatura-site
 *
 * Formulário Carreiras (WordPress) → candidatura externa em rh_vaga_candidaturas.
 * Body: multipart/form-data
 *
 * Secrets:
 *   PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Proxy CF: /api/prospecto-vaga-candidatura-site
 * Doc: docs/api-prospecto-vaga-candidatura-site-agencia.md
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BUCKET = "rh-vaga-candidaturas";
const ORIGENS = ["linkedin", "indicacao", "site_vagas", "instagram", "site_spin"] as const;
const TURNOS = ["Manhã", "Tarde", "Noite", "Comercial"] as const;

const MIME_CURRICULO = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MIME_PORTFOLIO = new Set([
  ...MIME_CURRICULO,
  "image/png",
  "image/jpeg",
]);
const MIME_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_DOC_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, x-region, x-prospecto-vaga-candidatura-secret",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function trimMax(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function isEmailOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(0, 120) || "arquivo";
}

function fieldStr(form: FormData, key: string): string {
  const v = form.get(key);
  if (typeof v === "string") return v;
  return "";
}

function fieldFile(form: FormData, key: string): File | null {
  const v = form.get(key);
  if (v instanceof File && v.size > 0 && v.name) return v;
  return null;
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, req, 405);
  }

  const expectedSecret = (Deno.env.get("PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET") ?? "").trim();
  const headerSecret = (req.headers.get("x-prospecto-vaga-candidatura-secret") ?? "").trim();

  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "Use multipart/form-data." }, req, 400);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Não foi possível ler o formulário." }, req, 400);
  }

  const bodySecret = typeof form.get("secret") === "string" ? String(form.get("secret")).trim() : "";
  const secret = headerSecret || bodySecret;
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return json({ error: "Não autorizado" }, req, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Configuração do servidor incompleta." }, req, 500);
  }

  const codigoVaga = trimMax(fieldStr(form, "codigo_vaga"), 40);
  const nomeCompleto = trimMax(fieldStr(form, "nome_completo"), 200);
  const email = trimMax(fieldStr(form, "email").toLowerCase(), 200);
  const telefone = trimMax(fieldStr(form, "telefone"), 40);
  const cidade = trimMax(fieldStr(form, "cidade"), 120);
  const redesSociais = trimMax(fieldStr(form, "redes_sociais"), 1000);
  const origemRaw = trimMax(fieldStr(form, "origem"), 40).toLowerCase();
  const quemIndicou = trimMax(fieldStr(form, "quem_indicou"), 200);
  const portfolioUrl = trimMax(fieldStr(form, "portfolio_url"), 500);
  const turnoTrabalho = trimMax(fieldStr(form, "turno_trabalho"), 40);

  const curriculo = fieldFile(form, "curriculo");
  const portfolioArquivo = fieldFile(form, "portfolio_arquivo");
  const video = fieldFile(form, "video_apresentacao");

  if (!codigoVaga) return json({ error: "Código da vaga é obrigatório." }, req, 400);
  if (!nomeCompleto) return json({ error: "Nome completo é obrigatório." }, req, 400);
  if (!email || !isEmailOk(email)) return json({ error: "E-mail inválido." }, req, 400);
  if (!telefone) return json({ error: "Telefone é obrigatório." }, req, 400);
  if (!cidade) return json({ error: "Cidade é obrigatória." }, req, 400);

  if (!(ORIGENS as readonly string[]).includes(origemRaw)) {
    return json({ error: "Origem inválida." }, req, 400);
  }
  if (origemRaw === "indicacao" && !quemIndicou) {
    return json({ error: "Quem indicou é obrigatório quando a origem é Indicação." }, req, 400);
  }

  if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) {
    return json({ error: "URL do portfólio inválida." }, req, 400);
  }

  const temCurriculo = !!curriculo;
  const temPortfolio = !!portfolioArquivo || !!portfolioUrl;
  if (!temCurriculo && !temPortfolio) {
    return json({ error: "Informe currículo ou portfólio (arquivo ou URL)." }, req, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: rpcErr } = await supabase.rpc("rh_vagas_atualizar_status_inscricoes_encerradas");
  if (rpcErr) {
    console.warn("[prospecto-vaga-candidatura-site] RPC status:", rpcErr.message);
  }

  const { data: vaga, error: vagaErr } = await supabase
    .from("rh_vagas")
    .select(
      "id, codigo_vaga, tipo_vaga, status, necessario_video_apresentacao, necessario_turno",
    )
    .eq("codigo_vaga", codigoVaga)
    .maybeSingle();

  if (vagaErr || !vaga) {
    return json({ error: "Vaga não encontrada ou não está aberta para candidaturas." }, req, 400);
  }
  if (vaga.tipo_vaga !== "externa" || vaga.status !== "aberta") {
    return json({ error: "Vaga não encontrada ou não está aberta para candidaturas." }, req, 400);
  }

  const precisaVideo = !!vaga.necessario_video_apresentacao;
  const precisaTurno = !!vaga.necessario_turno;

  if (precisaVideo && !video) {
    return json({ error: "Vídeo de apresentação é obrigatório para esta vaga." }, req, 400);
  }
  if (!precisaVideo && video) {
    // ignora vídeo enviado se a vaga não exige
  }
  if (precisaTurno) {
    if (!(TURNOS as readonly string[]).includes(turnoTrabalho)) {
      return json({ error: "Turno de trabalho é obrigatório para esta vaga." }, req, 400);
    }
  } else if (turnoTrabalho && !(TURNOS as readonly string[]).includes(turnoTrabalho)) {
    return json({ error: "Turno de trabalho inválido." }, req, 400);
  }

  if (curriculo) {
    if (curriculo.size > MAX_DOC_BYTES) {
      return json({ error: "Arquivo muito grande." }, req, 400);
    }
    const mt = (curriculo.type || "").toLowerCase();
    if (mt && !MIME_CURRICULO.has(mt)) {
      return json({ error: "Tipo de arquivo não permitido." }, req, 400);
    }
  }
  if (portfolioArquivo) {
    if (portfolioArquivo.size > MAX_DOC_BYTES) {
      return json({ error: "Arquivo muito grande." }, req, 400);
    }
    const mt = (portfolioArquivo.type || "").toLowerCase();
    if (mt && !MIME_PORTFOLIO.has(mt)) {
      return json({ error: "Tipo de arquivo não permitido." }, req, 400);
    }
  }
  const videoToSave = precisaVideo ? video : null;
  if (videoToSave) {
    if (videoToSave.size > MAX_VIDEO_BYTES) {
      return json({ error: "Arquivo muito grande." }, req, 400);
    }
    const mt = (videoToSave.type || "").toLowerCase();
    if (mt && !MIME_VIDEO.has(mt)) {
      return json({ error: "Tipo de arquivo não permitido." }, req, 400);
    }
  }

  const candidaturaId = crypto.randomUUID();
  const basePath = `externo/${vaga.id}/${candidaturaId}`;

  async function uploadFile(
    file: File,
    prefix: string,
  ): Promise<{ path: string; name: string } | { error: string }> {
    const safe = sanitizeFileName(file.name);
    const path = `${basePath}/${prefix}_${safe}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      console.error("[prospecto-vaga-candidatura-site] upload:", error.message);
      return { error: "Não foi possível enviar o arquivo." };
    }
    return { path, name: file.name };
  }

  let curriculoPath: string | null = null;
  let curriculoNome: string | null = null;
  if (curriculo) {
    const up = await uploadFile(curriculo, "curriculo");
    if ("error" in up) return json({ error: up.error }, req, 500);
    curriculoPath = up.path;
    curriculoNome = up.name;
  }

  let portfolioPath: string | null = null;
  let portfolioNome: string | null = null;
  if (portfolioArquivo) {
    const up = await uploadFile(portfolioArquivo, "portfolio");
    if ("error" in up) return json({ error: up.error }, req, 500);
    portfolioPath = up.path;
    portfolioNome = up.name;
  }

  let videoPath: string | null = null;
  let videoNome: string | null = null;
  if (videoToSave) {
    const up = await uploadFile(videoToSave, "video");
    if ("error" in up) return json({ error: up.error }, req, 500);
    videoPath = up.path;
    videoNome = up.name;
  }

  const row = {
    id: candidaturaId,
    vaga_id: vaga.id,
    funcionario_id: null,
    nome_completo: nomeCompleto,
    funcao_atual: "",
    carta_apresentacao: "",
    curriculo_storage_path: curriculoPath,
    curriculo_nome_arquivo: curriculoNome,
    email,
    telefone,
    cidade,
    redes_sociais: redesSociais || null,
    origem: origemRaw,
    quem_indicou: origemRaw === "indicacao" ? quemIndicou : null,
    portfolio_storage_path: portfolioPath,
    portfolio_nome_arquivo: portfolioNome,
    portfolio_url: portfolioUrl || null,
    video_storage_path: videoPath,
    video_nome_arquivo: videoNome,
    turno_trabalho: precisaTurno ? turnoTrabalho : null,
    origem_formulario: "site",
    etapa: "inscritos",
    created_by: null,
  };

  const { data: ins, error: insErr } = await supabase
    .from("rh_vaga_candidaturas")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (insErr || !ins?.id) {
    console.error("[prospecto-vaga-candidatura-site] insert:", insErr?.message);
    return json({ error: "Não foi possível registrar a candidatura." }, req, 500);
  }

  return json({ success: true, id: ins.id }, req, 200);
});
