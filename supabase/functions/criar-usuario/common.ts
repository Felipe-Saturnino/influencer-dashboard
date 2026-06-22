/** Helpers de data/formato compartilhados pelos e-mails de relatório (Edge / Deno). */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Nome canónico do responsável por liberações legadas e criação manual (Gestão de Usuários). */
export const ACCESS_GRANTED_BY_CANONICAL_NAME = 'Felipe Saturnino'

export async function resolveAccessGrantedByProfileId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const fromEnv = (Deno.env.get('ACCESS_GRANTED_BY_PROFILE_ID') ?? '').trim()
  if (fromEnv) return fromEnv

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('name', ACCESS_GRANTED_BY_CANONICAL_NAME)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as { id?: string } | null)?.id ?? null
}

export async function accessGrantedByPayload(
  supabase: SupabaseClient,
): Promise<{ access_granted_by: string | null; access_granted_at: string }> {
  return {
    access_granted_by: await resolveAccessGrantedByProfileId(supabase),
    access_granted_at: new Date().toISOString(),
  }
}

export function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function ontemISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`
}

export function mesExtenso(iso: string): string {
  const [y, m] = iso.split('-')
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${meses[parseInt(m, 10) - 1]} ${y}`
}

export function primeiroDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}-01`
}

export function fmtNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

export function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function fmtPct(v: number | null, signed = false): string {
  if (v === null || Number.isNaN(v)) return '—'
  const s = v.toFixed(1).replace('.', ',')
  if (signed && v > 0) return `+${s}%`
  return `${s}%`
}

export function fmtHorasTotal(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

export function fmtUltimaLeitura(iso: string): string {
  const d = new Date(iso)
  const isoLocal = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hora = d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${formatarData(isoLocal)} · ${hora}`
}

export function arpuFromGgrUap(ggr: number | null, uap: number | null): number | null {
  if (ggr == null || uap == null || uap === 0) return null
  return ggr / uap
}

export const TH =
  'padding:10px 14px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;background:#f9fafb;border-bottom:2px solid #e5e7eb;'
export const TD = 'padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;'
export const TD_R = `${TD}text-align:right;`
export const TD_C = `${TD}text-align:center;`

export function trStyle(i: number): string {
  return i % 2 === 1 ? 'background:#f9f7ff;' : 'background:#ffffff;'
}

export function corGGR(v: number): string {
  return v >= 0 ? '#166534' : '#e84025'
}

export function secao(titulo: string, conteudo: string, borderTop = true): string {
  return `
  <div style="padding:28px 32px;${borderTop ? 'border-top:1px solid #e5e7eb;' : ''}">
    ${titulo}
    ${conteudo}
  </div>`
}

export function subtitulo(txt: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;font-style:italic;">${txt}</p>`
}

export function tituloSecao(txt: string): string {
  return `<h2 style="margin:0 0 4px;font-size:17px;font-weight:800;color:#111827;letter-spacing:0.02em;">${txt}</h2>`
}

export function tituloSubSecao(txt: string): string {
  return `<h3 style="margin:20px 0 4px;font-size:13px;font-weight:700;color:#4a2082;text-transform:uppercase;letter-spacing:0.08em;">${txt}</h3>`
}

export function emailHeaderStyles(): string {
  return `
    .email-header { background-color:#4a2082; background:linear-gradient(135deg,#4a2082 0%,#1e36f8 100%); padding:28px 32px; text-align:center; }
    .email-header h1, .email-header .subtitle { color:#ffffff !important; }
    .email-header .subtitle { color:rgba(255,255,255,0.80) !important; }
    .header-logo-dark { display:block !important; }
    .header-logo-light { display:none !important; }
    .email-shell { border-color:#e5e7eb !important; }
    .email-body { background-color:#ffffff !important; }
    .email-footer { background-color:#f9f7ff !important; border-top:1px solid #e5e7eb !important; }
    .email-footer-text { color:#9ca3af !important; }
    .email-body-text { color:#374151 !important; }
    .email-body-text-strong { color:#111827 !important; }
    .email-body-label { color:#6b7280 !important; }
    .email-credential-box { background-color:#f9fafb !important; border:1px solid #e5e7eb !important; }
    .email-link { color:#1e36f8 !important; }
    .email-cta-cell { background-color:#4a2082 !important; border-radius:10px; }
    .email-cta-link {
      display:inline-block;
      padding:12px 28px;
      font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      font-size:14px;
      font-weight:700;
      line-height:1.2;
      color:#ffffff !important;
      -webkit-text-fill-color:#ffffff !important;
      text-decoration:none !important;
      border-radius:10px;
      border:2px solid #4a2082;
      background-color:#4a2082 !important;
      mso-line-height-rule:exactly;
    }
    @media (prefers-color-scheme: light) {
      .email-header { background:#f0eef8 !important; background-color:#f0eef8 !important; }
      .email-header h1 { color:#4a2082 !important; }
      .email-header .subtitle { color:#6b7280 !important; }
      .header-logo-dark { display:none !important; }
      .header-logo-light { display:block !important; }
    }
    @media (prefers-color-scheme: dark) {
      body { background:#1a1625 !important; }
      .email-shell { border-color:#374151 !important; }
      .email-body { background-color:#111827 !important; }
      .email-footer { background-color:#1f2937 !important; border-top-color:#374151 !important; }
      .email-body-text { color:#d1d5db !important; }
      .email-body-text-strong { color:#f9fafb !important; }
      .email-body-label { color:#9ca3af !important; }
      .email-credential-box { background-color:#1f2937 !important; border-color:#374151 !important; }
      .email-link { color:#93c5fd !important; }
      .email-cta-cell { background-color:#7c3aed !important; }
      .email-cta-link {
        background-color:#7c3aed !important;
        border-color:#7c3aed !important;
        color:#ffffff !important;
        -webkit-text-fill-color:#ffffff !important;
      }
    }`
}
