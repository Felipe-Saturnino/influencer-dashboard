import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { authDiagnostico, validarChamadaIngest } from "./auth.ts";
import {
  assuntoOuPadrao,
  corsHeaders,
  CS_ATENDIMENTO_EMAIL_BUCKET,
  DEFAULT_MAILBOX,
  INTEGRACAO_SLUG,
  json,
  sanitizePathSegment,
  stripHtmlBasico,
  type IngestOutlookBody,
} from "./common.ts";
import {
  GraphOutlookError,
  listarAnexosArquivo,
  listarMensagensInbox,
  marcarMensagemComoLida,
  obterTokenGraph,
  testarConexaoGraph,
  verificarSecretsOutlook,
  type GraphMessage,
} from "./graphOutlook.ts";

/**
 * Edge Function: ingest-cs-atendimento-outlook
 * Lê a Inbox de contato@spingaming.com.br via Microsoft Graph e cria chamados (RPC cs_chamado_criar_email).
 *
 * Secrets:
 *   CS_OUTLOOK_TENANT_ID
 *   CS_OUTLOOK_CLIENT_ID        (AppId Azure — ex.: 743a19bf-c96a-4acb-ba45-446269f864ef)
 *   CS_OUTLOOK_CLIENT_SECRET
 *   CS_OUTLOOK_MAILBOX          (opcional — padrão contato@spingaming.com.br)
 *   CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET — body ingest_secret, header ou service_role
 */

/** Altere a cada deploy — confirme no teste auth_probe que fn_build bate. */
export const FN_BUILD_VERSION = "20260710-cs-outlook-5";

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

function corpoMensagem(msg: GraphMessage): string {
  const body = msg.body;
  if (body?.content?.trim()) {
    if ((body.contentType ?? "").toLowerCase() === "html") {
      return stripHtmlBasico(body.content);
    }
    return body.content.trim();
  }
  return (msg.bodyPreview ?? "").trim();
}

function messageIdDedupe(msg: GraphMessage): string {
  return (msg.internetMessageId ?? msg.id).trim();
}

async function gravarSyncLog(
  supabase: ReturnType<typeof createClient>,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    erros_count: number;
    mensagem_erro: string | null;
    duracao_ms: number;
  },
): Promise<void> {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: 0,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[ingest-cs-atendimento-outlook] Falha ao gravar sync_logs:", e);
  }
}

serve(async (req) => {
  const inicio = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, erro: "Método não permitido" }, req, 405);
  }

  let body: IngestOutlookBody = {};
  try {
    const raw = await req.text();
    if (raw.trim()) body = JSON.parse(raw) as IngestOutlookBody;
  } catch {
    return json({ ok: false, erro: "JSON inválido" }, req, 400);
  }

  const auth = await validarChamadaIngest(req, { bodySecret: body.ingest_secret });
  if (!auth.ok) {
    return json(
      {
        ok: false,
        fn_build: FN_BUILD_VERSION,
        erro: auth.erro,
        ...(auth.diagnostico ? { auth_diagnostico: auth.diagnostico } : {}),
        dica_dashboard:
          "Sem fn_build na resposta = código antigo no Supabase. Atualize index.ts (auth_probe, bodySecret) e auth.ts e faça Deploy updates.",
      },
      req,
      auth.status,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ingestSecretEnv = Deno.env.get("CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET")?.trim() ?? "";

  if (body.auth_probe === true) {
    return json(
      {
        ok: true,
        fn_build: FN_BUILD_VERSION,
        auth_probe: true,
        auth_via: auth.via,
        auth_diagnostico: authDiagnostico(req, serviceKey, ingestSecretEnv),
        graph_secrets: verificarSecretsOutlook(),
        mensagem:
          "Autorização OK. Próximo passo: {\"test_graph\":true,\"ingest_secret\":\"…\"} com o mesmo secret.",
      },
      req,
    );
  }

  const dryRun = body.dry_run === true;
  const modo = body.modo === "recent" ? "recent" : "unread";
  const maxMessages = Math.min(Math.max(body.max_messages ?? 25, 1), 50);
  const sinceHours = Math.min(Math.max(body.since_hours ?? 168, 1), 720);
  const mailbox = (Deno.env.get("CS_OUTLOOK_MAILBOX") ?? DEFAULT_MAILBOX).trim().toLowerCase();

  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "Configuração Supabase incompleta." }, req, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, supabaseServiceOptions);

  if (body.test_graph === true) {
    try {
      const secrets = verificarSecretsOutlook();
      const teste = await testarConexaoGraph(mailbox);
      return json(
        {
          ok: true,
          fn_build: FN_BUILD_VERSION,
          test_graph: true,
          mailbox,
          auth_via: auth.via,
          secrets,
          user_principal_name: teste.user_principal_name,
          mensagens_amostra: teste.mensagens_amostra,
          mensagem: "Conexão Microsoft Graph OK — token e Inbox acessíveis.",
        },
        req,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      const extra = e instanceof GraphOutlookError ? e.toJson() : {};
      const secrets = verificarSecretsOutlook();
      const etapa = extra.etapa;
      const httpStatus = etapa === "secrets" ? 500 : 502;
      return json(
        {
          ok: false,
          fn_build: FN_BUILD_VERSION,
          test_graph: true,
          erro: msg,
          secrets,
          ...extra,
        },
        req,
        httpStatus,
      );
    }
  }

  try {
    const token = await obterTokenGraph();
    const mensagens = await listarMensagensInbox(token, mailbox, {
      modo,
      max: maxMessages,
      sinceHours,
    });

    const resultado = {
      ok: true,
      dry_run: dryRun,
      mailbox,
      modo,
      auth_via: auth.via,
      encontrados: mensagens.length,
      criados: 0,
      duplicados: 0,
      ignorados: 0,
      erros: [] as string[],
      protocolos: [] as string[],
    };

    for (const msg of mensagens) {
      const remetente = (msg.from?.emailAddress?.address ?? "").trim().toLowerCase();
      const remetenteNome = (msg.from?.emailAddress?.name ?? "").trim();
      const assunto = assuntoOuPadrao(msg.subject);
      const corpo = corpoMensagem(msg);
      const msgId = messageIdDedupe(msg);

      if (!remetente) {
        resultado.ignorados += 1;
        continue;
      }

      if (remetente === mailbox) {
        resultado.ignorados += 1;
        continue;
      }

      if (!msgId) {
        resultado.ignorados += 1;
        continue;
      }

      const { data: jaProcessado } = await supabase
        .from("cs_chamados")
        .select("id, protocolo")
        .eq("email_message_id", msgId)
        .maybeSingle();

      if (jaProcessado) {
        resultado.duplicados += 1;
        if (!dryRun) {
          await marcarMensagemComoLida(token, mailbox, msg.id);
        }
        continue;
      }

      const recebidoEm = msg.receivedDateTime ?? new Date().toISOString();
      const anexosPayload: Array<{
        nome: string;
        storage_path: string;
        content_type: string | null;
        tamanho_bytes: number | null;
      }> = [];

      if (!dryRun && msg.hasAttachments) {
        const anexos = await listarAnexosArquivo(token, mailbox, msg.id);
        const pasta = `${recebidoEm.slice(0, 10)}/${sanitizePathSegment(msgId)}`;

        for (const anexo of anexos) {
          const nome = (anexo.name ?? "anexo").trim();
          const storagePath = `${pasta}/${sanitizePathSegment(nome)}`;
          const bytes = Uint8Array.from(atob(anexo.contentBytes ?? ""), (c) => c.charCodeAt(0));

          const { error: upErr } = await supabase.storage
            .from(CS_ATENDIMENTO_EMAIL_BUCKET)
            .upload(storagePath, bytes, {
              contentType: anexo.contentType ?? "application/octet-stream",
              upsert: true,
            });

          if (upErr) {
            console.error("[ingest-cs-atendimento-outlook] upload", upErr);
            resultado.erros.push(`Anexo ${nome}: falha no upload`);
            continue;
          }

          anexosPayload.push({
            nome,
            storage_path: storagePath,
            content_type: anexo.contentType ?? null,
            tamanho_bytes: anexo.size ?? bytes.length,
          });
        }
      }

      if (dryRun) {
        resultado.criados += 1;
        continue;
      }

      const { data: chamadoId, error: rpcErr } = await supabase.rpc("cs_chamado_criar_email", {
        p_remetente_email: remetente,
        p_remetente_nome: remetenteNome || remetente,
        p_assunto: assunto,
        p_corpo: corpo,
        p_recebido_em: recebidoEm,
        p_email_message_id: msgId,
        p_anexos: anexosPayload,
      });

      if (rpcErr) {
        console.error("[ingest-cs-atendimento-outlook] rpc", rpcErr);
        resultado.erros.push(`Mensagem ${assunto.slice(0, 40)}: falha ao criar chamado`);
        continue;
      }

      if (chamadoId) {
        const { data: row } = await supabase
          .from("cs_chamados")
          .select("protocolo")
          .eq("id", chamadoId)
          .maybeSingle();
        if (row?.protocolo) resultado.protocolos.push(row.protocolo);
      }

      resultado.criados += 1;
      await marcarMensagemComoLida(token, mailbox, msg.id);
    }

    if (!dryRun) {
      await gravarSyncLog(supabase, {
        status: resultado.erros.length > 0 && resultado.criados === 0 ? "falha" : "ok",
        registros_inseridos: resultado.criados,
        erros_count: resultado.erros.length,
        mensagem_erro: resultado.erros.length ? resultado.erros.slice(0, 3).join("; ") : null,
        duracao_ms: Date.now() - inicio,
      });
    }

    return json(resultado, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    const extra = e instanceof GraphOutlookError ? e.toJson() : {};
    console.error("[ingest-cs-atendimento-outlook]", e);
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: 0,
      erros_count: 1,
      mensagem_erro: [msg, extra.azure_erro, extra.azure_detalhe].filter(Boolean).join(" — ").slice(0, 500),
      duracao_ms: Date.now() - inicio,
    });
    return json({ ok: false, erro: msg, ...extra }, req, 500);
  }
});
