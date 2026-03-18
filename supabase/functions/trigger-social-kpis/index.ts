// Edge Function: trigger-social-kpis | Acquisition Hub
// Dispara o workflow GitHub Actions "Sync Social Media KPIs" via API
// Secrets: GITHUB_TOKEN, GITHUB_REPO (ex: owner/repo)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WORKFLOW_FILE = "sync-social-kpis-daily.yml";
const DEFAULT_REF = "main";

interface TriggerResponse {
  ok: boolean;
  erro?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
      status: 204,
    });
  }

  if (req.method !== "POST") {
    return response({ ok: false, erro: "Método inválido" }, 405);
  }

  const token = Deno.env.get("GITHUB_TOKEN");
  const repo = Deno.env.get("GITHUB_REPO");

  if (!token || !repo) {
    return response(
      {
        ok: false,
        erro: "GITHUB_TOKEN e GITHUB_REPO devem estar configurados em Supabase → Edge Functions → Secrets.",
      },
      500
    );
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return response(
      { ok: false, erro: "GITHUB_REPO deve estar no formato owner/repo (ex: Felipe-Saturnino/influencer-dashboard)" },
      500
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { ref?: string };
    const ref = body?.ref ?? DEFAULT_REF;

    const url = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
    });

    if (!res.ok) {
      const text = await res.text();
      return response(
        {
          ok: false,
          erro: `GitHub API: ${res.status} ${res.statusText}. ${text.slice(0, 300)}`,
        },
        502
      );
    }

    return response({
      ok: true,
      message: "Workflow disparado com sucesso. A execução leva alguns minutos. Verifique o Dashboard de Mídias Sociais em instantes.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return response({ ok: false, erro: msg }, 500);
  }
});

function response(data: TriggerResponse, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
