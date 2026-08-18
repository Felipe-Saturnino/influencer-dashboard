import type { CSSProperties } from "react";
import { Handshake } from "lucide-react";
import { FiltroBarPillButton } from "./dashboard/FiltroBarPillButton";

export const MINHAS_NEGOCIACOES_ARIA_LABEL_INACTIVE =
  "Ativar Minhas Negociações — ver o mural do meu grupo e as minhas ofertas";

export const MINHAS_NEGOCIACOES_ARIA_LABEL_ACTIVE =
  "Desativar Minhas Negociações — voltar à visão de todos os times";

export interface FiltroMinhasNegociacoesButtonProps {
  active: boolean;
  onClick: () => void;
  style?: CSSProperties;
}

/**
 * Toggle pill ao lado do Histórico — só Ver = Sim.
 * Ícone Handshake (domínio Marketplace), mesmo contrato visual que Histórico.
 */
export function FiltroMinhasNegociacoesButton({
  active,
  onClick,
  style,
}: FiltroMinhasNegociacoesButtonProps) {
  return (
    <FiltroBarPillButton
      active={active}
      onClick={onClick}
      icon={<Handshake size={15} strokeWidth={2} aria-hidden="true" />}
      aria-label={active ? MINHAS_NEGOCIACOES_ARIA_LABEL_ACTIVE : MINHAS_NEGOCIACOES_ARIA_LABEL_INACTIVE}
      style={style}
    >
      Minhas Negociações
    </FiltroBarPillButton>
  );
}
