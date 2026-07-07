import type { RhFuncionario } from "../types/rhFuncionario";
import {
  staffEstudioAtendeTodos,
  staffEstudioSlugEfetivo,
  staffEstudioSlugsFromRow,
} from "../pages/rh/GestaoStaff/gestaoStaffEstudioHelpers";
import { jogoComparativoKeysFromCadastroMesa } from "../pages/dashboards/OverviewSpin/overviewSpinLogic";
import {
  labelTurnoDealerSync,
  staffSkillsParaJogosEVip,
  staffTurnoTextoParaDealerTurno,
} from "./rhGamePresenterDealerSync";
import { turnoRhCoerenteComEscala } from "./rhEscalaTurnos";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubJogoKey,
  PerformanceHubTurno,
} from "./academyPerformanceHubTypes";

export type PerformanceHubMesaCadastro = {
  estudio_slug: string | null;
  tipo_jogo: string;
  nome_mesa: string;
  mesa_identificacao: string;
};

export type PerformanceHubEstudioCadastro = {
  slug: string;
  nome: string;
};

export type PerformanceHubDadosPrefill = {
  turno: PerformanceHubTurno | null;
  estudioId: string | null;
  jogo: PerformanceHubJogoKey | null;
  mesaId: string | null;
  jogosStaff: PerformanceHubJogoKey[];
};

const TURNOS_PERFORMANCE_HUB: PerformanceHubTurno[] = ["Manhã", "Tarde", "Noite"];

function isPerformanceHubTurno(value: string): value is PerformanceHubTurno {
  return TURNOS_PERFORMANCE_HUB.includes(value as PerformanceHubTurno);
}

export function mapTurnoRhParaPerformanceHub(row: Pick<RhFuncionario, "escala" | "staff_turno">): PerformanceHubTurno | null {
  const coerente = turnoRhCoerenteComEscala(row.escala, row.staff_turno);
  const bruto = (coerente || row.staff_turno || "").trim();
  if (!bruto) return null;
  const dealerTurno = staffTurnoTextoParaDealerTurno(bruto);
  const label = labelTurnoDealerSync(dealerTurno);
  return isPerformanceHubTurno(label) ? label : null;
}

export function mapJogosStaffRhParaPerformanceHub(
  row: Pick<RhFuncionario, "staff_skills">,
): PerformanceHubJogoKey[] {
  const { jogos } = staffSkillsParaJogosEVip(row.staff_skills as Record<string, unknown> | null);
  return jogos.filter((j): j is PerformanceHubJogoKey =>
    ["baccarat", "roleta", "blackjack", "futebol_brasileiro"].includes(j),
  );
}

export function mapEstudioRhParaPerformanceHub(
  row: Pick<RhFuncionario, "staff_estudio_slug" | "staff_estudio_slugs" | "staff_operadora_slug">,
  opParaEstudio: Record<string, string>,
): string | null {
  const slugs = staffEstudioSlugsFromRow(row, opParaEstudio);
  if (staffEstudioAtendeTodos(slugs)) return null;
  const efetivo = staffEstudioSlugEfetivo(row, opParaEstudio);
  return efetivo || null;
}

export function jogosDoEstudioNoCatalogo(
  estudioId: string,
  mesas: readonly PerformanceHubMesaCadastro[],
): PerformanceHubJogoKey[] {
  const keys = new Set<PerformanceHubJogoKey>();
  for (const mesa of mesas) {
    if (mesa.estudio_slug !== estudioId) continue;
    for (const key of jogoComparativoKeysFromCadastroMesa(mesa.tipo_jogo, mesa.nome_mesa)) {
      if (key === "baccarat" || key === "blackjack" || key === "roleta" || key === "futebol_brasileiro") {
        keys.add(key);
      }
    }
  }
  return [...keys];
}

export function jogosDisponiveisModalPerformanceHub(
  estudioId: string,
  mesas: readonly PerformanceHubMesaCadastro[],
  jogosStaff: readonly PerformanceHubJogoKey[],
): PerformanceHubJogoKey[] {
  const doCatalogo = jogosDoEstudioNoCatalogo(estudioId, mesas);
  const doStaff = jogosStaff.filter((j) => doCatalogo.includes(j));
  return doStaff.length > 0 ? doStaff : doCatalogo;
}

export function mesasDoEstudioJogoNoCatalogo(
  estudioId: string,
  jogo: PerformanceHubJogoKey | "",
  mesas: readonly PerformanceHubMesaCadastro[],
): string[] {
  if (!estudioId || !jogo) return [];
  return mesas
    .filter((mesa) => {
      if (mesa.estudio_slug !== estudioId) return false;
      const keys = jogoComparativoKeysFromCadastroMesa(mesa.tipo_jogo, mesa.nome_mesa);
      return keys.includes(jogo);
    })
    .map((mesa) => mesa.mesa_identificacao.trim())
    .filter(Boolean);
}

export function mapMesaSugeridaPerformanceHub(
  estudioId: string | null,
  jogo: PerformanceHubJogoKey | null,
  mesas: readonly PerformanceHubMesaCadastro[],
): string | null {
  if (!estudioId || !jogo) return null;
  const opcoes = mesasDoEstudioJogoNoCatalogo(estudioId, jogo, mesas);
  return opcoes.length === 1 ? opcoes[0]! : null;
}

export function mapRhFuncionarioParaPerformanceHubDados(
  row: RhFuncionario,
  opParaEstudio: Record<string, string>,
  mesas: readonly PerformanceHubMesaCadastro[],
): PerformanceHubDadosPrefill {
  const turno = mapTurnoRhParaPerformanceHub(row);
  const jogosStaff = mapJogosStaffRhParaPerformanceHub(row);
  const estudioId = mapEstudioRhParaPerformanceHub(row, opParaEstudio);
  const jogo = jogosStaff[0] ?? null;
  const mesaId = mapMesaSugeridaPerformanceHub(estudioId, jogo, mesas);
  return { turno, estudioId, jogo, mesaId, jogosStaff };
}

export function avaliacaoTemDadosSalvos(
  row: Pick<PerformanceHubAvaliacao, "turno" | "estudioId" | "jogo" | "mesaId">,
): boolean {
  return Boolean(row.turno || row.estudioId || row.jogo || row.mesaId);
}
