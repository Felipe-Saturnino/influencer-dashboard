const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

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

export async function obterTokenGraph(): Promise<string> {
  const tenant = Deno.env.get("CS_OUTLOOK_TENANT_ID")?.trim();
  const clientId = Deno.env.get("CS_OUTLOOK_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("CS_OUTLOOK_CLIENT_SECRET")?.trim();

  if (!tenant || !clientId || !clientSecret) {
    throw new Error("Secrets CS_OUTLOOK_TENANT_ID, CS_OUTLOOK_CLIENT_ID e CS_OUTLOOK_CLIENT_SECRET são obrigatórios.");
  }

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
    console.error("[ingest-cs-atendimento-outlook] token", res.status, txt.slice(0, 400));
    let hint = "Não foi possível autenticar no Microsoft Graph.";
    try {
      const err = JSON.parse(txt) as { error?: string; error_description?: string };
      if (err.error === "invalid_client") {
        hint =
          "Microsoft Graph: Client ID ou Client Secret inválidos. Verifique CS_OUTLOOK_CLIENT_ID e CS_OUTLOOK_CLIENT_SECRET nos Secrets da Edge Function.";
      } else if (err.error === "unauthorized_client") {
        hint =
          "Microsoft Graph: app não autorizado para client_credentials. Confirme permissão Mail.Read (application) e admin consent no Azure.";
      } else if (err.error === "invalid_request") {
        hint =
          "Microsoft Graph: requisição de token inválida — confira CS_OUTLOOK_TENANT_ID (GUID do diretório, não domínio @).";
      } else if (err.error) {
        hint = `Microsoft Graph (${err.error}): verifique secrets CS_OUTLOOK_* no Supabase.`;
      }
    } catch {
      /* resposta não-JSON */
    }
    throw new Error(hint);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Token Microsoft Graph ausente na resposta.");
  }
  return data.access_token;
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
    throw new Error("Não foi possível listar e-mails da caixa.");
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
