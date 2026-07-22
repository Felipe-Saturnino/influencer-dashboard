import { OverviewGenericFunnel } from "../../comercial/OverviewComercial/OverviewGenericFunnel";

const FUNIL_ACESSOS = "var(--brand-action, #7c3aed)";
const FUNIL_REGISTROS = "var(--brand-contrast, #1e36f8)";
const FUNIL_FTDS = "#22c55e";

type Props = {
  acessos?: number;
  registros?: number;
  ftds?: number;
  /** Prefixo único quando há mais de um funil na página (comparativo A/B). */
  idPrefix?: string;
};

/** Funil de 3 etapas (sem Views): Acessos → Registros → FTDs. */
export function FunilAfiliados({
  acessos = 0,
  registros = 0,
  ftds = 0,
}: Props) {
  const pctAcessoReg = acessos > 0 ? (registros / acessos) * 100 : null;
  const pctRegFtd = registros > 0 ? (ftds / registros) * 100 : null;
  const pctAcessoFtd = acessos > 0 ? (ftds / acessos) * 100 : null;

  return (
    <OverviewGenericFunnel
      ariaLabel="Funil de conversão: Acessos, Registros e FTDs"
      levels={[
        { id: "acessos", label: "Acessos", count: acessos, color: FUNIL_ACESSOS },
        { id: "registros", label: "Registros", count: registros, color: FUNIL_REGISTROS },
        { id: "ftds", label: "FTDs", count: ftds, color: FUNIL_FTDS },
      ]}
      taxas={[
        { label: "Acesso → Reg", taxa: pctAcessoReg, color: FUNIL_REGISTROS },
        { label: "Reg → FTD", taxa: pctRegFtd, color: FUNIL_FTDS },
        { label: "Acesso → FTD", taxa: pctAcessoFtd, color: FUNIL_FTDS, highlight: true },
      ]}
    />
  );
}
