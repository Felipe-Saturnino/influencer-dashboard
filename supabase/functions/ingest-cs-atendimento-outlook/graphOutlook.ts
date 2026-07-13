const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GraphEmailAddress {
  name?: string;
  address?: string;
}

export interface GraphMessage {
  id: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: GraphEmailAddress };
  receivedDateTime?: string;
  hasAttachments?: boolean;
}

export interface GraphFileAttachment {
  "@odata.type"?: string;
  id?: string;
  name?: string;
  contentType?: string;
  size?: number;
  contentBytes?: string;
}

export interface GraphOutlookSecretsCheck {
  tenant_configurado: boolean;
  client_id_configurado: boolean;
  client_secret_configurado: boolean;
  tenant_formato_guid: boolean;
  client_id_formato_guid: boolean;
  client_secret_parece_secret_id: boolean;
  client_secret_tamanho: number;
  avisos: string[];
}

export interface GraphOutlookErrorJson {
  etapa: "secrets" | "token" | "mailbox";
  http_status?: number;
  azure_erro?: string;
  azure_detalhe?: string;
  avisos_secrets?: string[];
}

export class GraphOutlookError extends Error {
  readonly detalhe: GraphOutlookErrorJson;

  constructor(message: string, detalhe: GraphOutlookErrorJson) {
    super(message);
    this.name = "GraphOutlookError";
    this.detalhe = detalhe;
  }

  toJson(): GraphOutlookErrorJson {
    return this.detalhe;
  }
}

export function normalizarGuid(valor: string): string {
  return valor.trim().replace(/^\{|\}$/g, "");
}

function isGuid(valor: string): boolean {
  return GUID_RE.test(normalizarGuid(valor));
}

function parseAzureError(txt: string): { error?: string; error_description?: string } {
  try {
    return JSON.parse(txt) as { error?: string; error_description?: string };
  } catch {
    return {};
  }
}

function parseGraphError(txt: string): { code?: string; message?: string } | undefined {
  try {
    const j = JSON.parse(txt) as { error?: { code?: string; message?: string } };
    return j.error;
  } catch {
    return undefined;
  }
}

function mensagemTokenAzure(err: { error?: string; error_description?: string }): string {
  const code = err.error ?? "";
  const desc = (err.error_description ?? "").slice(0, 280);

  if (code === "invalid_client") {
    return (
      "Microsoft Graph: Client ID ou Client Secret inválidos. No Azure, copie o **Value** do client secret (não o Secret ID). " +
      "Gere um secret novo se o anterior expirou."
    );
  }
  if (code === "unauthorized_client") {
    return (
      "Microsoft Graph: app não autorizado para client_credentials. Confirme permissão **Mail.Read** (tipo Application) e **Grant admin consent** no Azure."
    );
  }
  if (code === "invalid_request") {
    return "Microsoft Graph: requisição inválida — confira CS_OUTLOOK_TENANT_ID (GUID do diretório Azure AD, não domínio @).";
  }
  if (desc.includes("AADSTS7000215") || desc.includes("Invalid client secret")) {
    return "Microsoft Graph: client secret inválido (AADSTS7000215). Cole o **Value** do secret no Supabase, não o Secret ID.";
  }
  if (desc.includes("AADSTS700016")) {
    return "Microsoft Graph: application (Client ID) não encontrada neste tenant — confira CS_OUTLOOK_CLIENT_ID e CS_OUTLOOK_TENANT_ID.";
  }
  if (code) {
    return `Microsoft Graph (${code}): verifique secrets CS_OUTLOOK_* no Supabase.`;
  }
  return "Não foi possível autenticar no Microsoft Graph.";
}

function mensagemMailboxAzure(status: number, txt: string): string {
  const odata = parseGraphError(txt);

  if (status === 403 || odata?.code === "ErrorAccessDenied" || odata?.code === "Authorization_RequestDenied") {
    return (
      "Microsoft Graph: acesso negado à caixa. Confirme **Mail.Read** (Application) com admin consent e **Application Access Policy** em contato@spingaming.com.br (Test-ApplicationAccessPolicy = Granted)."
    );
  }
  if (status === 404) {
    return "Microsoft Graph: caixa não encontrada — confira CS_OUTLOOK_MAILBOX (contato@spingaming.com.br).";
  }
  if (odata?.code) {
    return `Microsoft Graph ao listar Inbox (${odata.code}): ${(odata.message ?? "").slice(0, 200)}`;
  }
  return "Não foi possível listar e-mails da caixa.";
}

/** Valida presença/formato dos secrets sem expor valores. */
export function verificarSecretsOutlook(): GraphOutlookSecretsCheck {
  const tenantRaw = Deno.env.get("CS_OUTLOOK_TENANT_ID")?.trim() ?? "";
  const clientIdRaw = Deno.env.get("CS_OUTLOOK_CLIENT_ID")?.trim() ?? "";
  const clientSecretRaw = Deno.env.get("CS_OUTLOOK_CLIENT_SECRET")?.trim() ?? "";

  const avisos: string[] = [];

  if (!tenantRaw) avisos.push("CS_OUTLOOK_TENANT_ID ausente nos Secrets da Edge Function.");
  else if (!isGuid(tenantRaw)) {
    avisos.push("CS_OUTLOOK_TENANT_ID não parece GUID (use Directory tenant ID do Azure AD).");
  }

  if (!clientIdRaw) avisos.push("CS_OUTLOOK_CLIENT_ID ausente nos Secrets da Edge Function.");
  else if (!isGuid(clientIdRaw)) avisos.push("CS_OUTLOOK_CLIENT_ID não parece GUID (Application ID).");

  if (!clientSecretRaw) {
    avisos.push("CS_OUTLOOK_CLIENT_SECRET ausente nos Secrets da Edge Function.");
  } else {
    if (isGuid(clientSecretRaw)) {
      avisos.push(
        "CS_OUTLOOK_CLIENT_SECRET parece o Secret ID (UUID) do Azure. No portal, copie o **Value** do client secret — só é exibido na criação.",
      );
    } else if (clientSecretRaw.length < 20) {
      avisos.push("CS_OUTLOOK_CLIENT_SECRET muito curto — confira se colou o Value completo do Azure.");
    }
  }

  return {
    tenant_configurado: !!tenantRaw,
    client_id_configurado: !!clientIdRaw,
    client_secret_configurado: !!clientSecretRaw,
    tenant_formato_guid: !!tenantRaw && isGuid(tenantRaw),
    client_id_formato_guid: !!clientIdRaw && isGuid(clientIdRaw),
    client_secret_parece_secret_id: !!clientSecretRaw && isGuid(clientSecretRaw),
    client_secret_tamanho: clientSecretRaw.length,
    avisos,
  };
}

function credenciaisOutlook(): { tenant: string; clientId: string; clientSecret: string } {
  const check = verificarSecretsOutlook();
  if (check.avisos.some((a) => a.includes("ausente"))) {
    throw new GraphOutlookError(
      "Secrets CS_OUTLOOK_TENANT_ID, CS_OUTLOOK_CLIENT_ID e CS_OUTLOOK_CLIENT_SECRET são obrigatórios no Supabase → Edge Functions → Secrets.",
      { etapa: "secrets", avisos_secrets: check.avisos },
    );
  }
  if (check.client_secret_parece_secret_id) {
    throw new GraphOutlookError(
      "CS_OUTLOOK_CLIENT_SECRET parece Secret ID do Azure (UUID). Cole o **Value** do client secret, não o Secret ID.",
      { etapa: "secrets", avisos_secrets: check.avisos },
    );
  }

  return {
    tenant: normalizarGuid(Deno.env.get("CS_OUTLOOK_TENANT_ID") ?? ""),
    clientId: normalizarGuid(Deno.env.get("CS_OUTLOOK_CLIENT_ID") ?? ""),
    clientSecret: (Deno.env.get("CS_OUTLOOK_CLIENT_SECRET") ?? "").trim(),
  };
}

export async function obterTokenGraph(): Promise<string> {
  const { tenant, clientId, clientSecret } = credenciaisOutlook();
  const check = verificarSecretsOutlook();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ingest-cs-atendimento-outlook] token", res.status, txt.slice(0, 500));
    const azure = parseAzureError(txt);
    throw new GraphOutlookError(mensagemTokenAzure(azure), {
      etapa: "token",
      http_status: res.status,
      azure_erro: azure.error,
      azure_detalhe: (azure.error_description ?? txt).slice(0, 280),
      avisos_secrets: check.avisos.length ? check.avisos : undefined,
    });
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new GraphOutlookError("Token Microsoft Graph ausente na resposta.", { etapa: "token" });
  }
  return data.access_token;
}

/**
 * Testa token + acesso à Inbox (sem ingerir chamados).
 * Usa GET .../mailFolders/Inbox/messages (Mail.Read Application) —
 * NÃO usa GET /users/{id} (exige User.Read.All e gera falso negativo).
 */
export async function testarConexaoGraph(mailbox: string): Promise<{
  ok: true;
  secrets: GraphOutlookSecretsCheck;
  mailbox: string;
  user_principal_name?: string;
  inbox_acessivel: boolean;
  mensagens_amostra: number;
}> {
  const secrets = verificarSecretsOutlook();
  const token = await obterTokenGraph();
  const user = mailboxPath(mailbox);
  // Mesmo caminho da ingestão — só Mail.Read + Application Access Policy
  const url =
    `${GRAPH_BASE}/users/${user}/mailFolders/Inbox/messages?$select=id&$top=1`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[ingest-cs-atendimento-outlook] test mailbox", res.status, txt.slice(0, 500));
    const odata = parseGraphError(txt);
    throw new GraphOutlookError(mensagemMailboxAzure(res.status, txt), {
      etapa: "mailbox",
      http_status: res.status,
      azure_erro: odata?.code,
      azure_detalhe: (odata?.message ?? txt).slice(0, 280),
    });
  }

  const data = (await res.json()) as { value?: unknown[] };

  return {
    ok: true,
    secrets,
    mailbox,
    user_principal_name: mailbox,
    inbox_acessivel: true,
    mensagens_amostra: data.value?.length ?? 0,
  };
}

function mailboxPath(mailbox: string): string {
  return encodeURIComponent(mailbox);
}

export async function listarMensagensInbox(
  token: string,
  mailbox: string,
  opts: { modo: "unread" | "recent"; max: number; sinceHours: number },
): Promise<GraphMessage[]> {
  const user = mailboxPath(mailbox);
  const select =
    "id,internetMessageId,subject,bodyPreview,body,from,receivedDateTime,hasAttachments";
  const params = new URLSearchParams({
    $select: select,
    $orderby: "receivedDateTime desc",
    $top: String(Math.min(Math.max(opts.max, 1), 50)),
  });

  if (opts.modo === "unread") {
    params.set("$filter", "isRead eq false");
  } else {
    const since = new Date(Date.now() - opts.sinceHours * 3600 * 1000).toISOString();
    params.set("$filter", `receivedDateTime ge ${since}`);
  }

  const url = `${GRAPH_BASE}/users/${user}/mailFolders/Inbox/messages?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ingest-cs-atendimento-outlook] list messages", res.status, txt.slice(0, 500));
    throw new GraphOutlookError(mensagemMailboxAzure(res.status, txt), {
      etapa: "mailbox",
      http_status: res.status,
    });
  }

  const data = (await res.json()) as { value?: GraphMessage[] };
  return data.value ?? [];
}

export async function listarAnexosArquivo(
  token: string,
  mailbox: string,
  messageId: string,
): Promise<GraphFileAttachment[]> {
  const user = mailboxPath(mailbox);
  const url = `${GRAPH_BASE}/users/${user}/messages/${messageId}/attachments`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ingest-cs-atendimento-outlook] attachments", res.status, txt.slice(0, 400));
    return [];
  }

  const data = (await res.json()) as { value?: GraphFileAttachment[] };
  return (data.value ?? []).filter(
    (a) => a["@odata.type"] === "#microsoft.graph.fileAttachment" && a.contentBytes && a.name,
  );
}

export async function marcarMensagemComoLida(
  token: string,
  mailbox: string,
  messageId: string,
): Promise<void> {
  const user = mailboxPath(mailbox);
  const url = `${GRAPH_BASE}/users/${user}/messages/${messageId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isRead: true }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ingest-cs-atendimento-outlook] mark read", res.status, txt.slice(0, 300));
  }
}
