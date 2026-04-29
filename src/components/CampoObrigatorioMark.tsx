/**
 * Asterisco vermelho ao lado de rótulos de campos obrigatórios em formulários/modais.
 * Cor #e84025 — paleta semântica negativa (global.mdc).
 */
export function CampoObrigatorioMark() {
  return (
    <span style={{ color: "#e84025", fontWeight: 700 }} aria-hidden="true">
      {" *"}
    </span>
  );
}
