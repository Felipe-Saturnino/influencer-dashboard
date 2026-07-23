/**
 * Escala Escritório — grade mensal para prestadores com area_atuacao = escritorio.
 * Reutiliza a mesma UI/engine de Escala Estúdio (Gestão de Escala) em modo escritório.
 * Gestão de Prestadores não é alterada por esta página.
 */
import GestaoEscalaPage from "../GestaoEscala";

export default function EscalaEscritorioPage() {
  return <GestaoEscalaPage modo="escritorio" />;
}
