export type AcademyPortalReadReceiptRow = {
  content_id: string;
  read_at: string;
  acknowledged_at: string | null;
};

export function academyManualReceiptKey(contentId: string): string {
  return contentId;
}

export function manualExigeCiencia(manual: { requires_acknowledgment?: boolean | null }): boolean {
  return manual.requires_acknowledgment === true;
}

/** Usuários logados com permissão de Ver participam do fluxo de ciência na aba Manuais. */
export function perfilAcademyPortalParticipaCiencia(podeVer: boolean): boolean {
  return podeVer;
}

export function fmtJogosManualColuna(jogos: string[] | null | undefined): string {
  if (!jogos?.length) return "—";
  return jogos.join(", ");
}
