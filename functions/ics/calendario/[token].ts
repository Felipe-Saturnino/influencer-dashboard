/**
 * URL pública do feed iCal do Calendário (prestador).
 * Google / Outlook / Apple chamam GET /ics/calendario/{token}.
 */

import {
  proxyGetToSupabaseEdge,
  supabaseProxyGetOptionsResponse,
  type SupabaseProxyContext,
} from "../../api/_supabaseProxy";

type IcsCalendarioContext = SupabaseProxyContext & {
  params: { token?: string };
};

export const onRequestGet = async (context: IcsCalendarioContext) =>
  proxyGetToSupabaseEdge(context, "rh-calendario-ics", {
    searchParams: { token: (context.params.token ?? "").trim() },
  });

export const onRequestHead = onRequestGet;

export const onRequestOptions = async () => supabaseProxyGetOptionsResponse();
