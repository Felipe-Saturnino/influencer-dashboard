import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { PageHeader } from "../../../components/PageHeader";

type EscalaAba = "minha" | "gerenciar" | "gerar";

type DiaMes = {
  dia: number;
  dowShort: string;
  isWeekend: boolean;
  iso: string;
};

type LinhaColaborador = {
  id: string;
  nome: string;
  nickname: string;
  turno: string;
};

const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

function diasDoMes(ano: number, mes0: number): DiaMes[] {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const out: DiaMes[] = [];
  for (let d = 1; d <= ultimo; d++) {
    const dt = new Date(ano, mes0, d);
    const dow = dt.getDay();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    out.push({
      dia: d,
      dowShort: DOW_SHORT[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
      iso: `${y}-${m}-${day}`,
    });
  }
  return out;
}

function labelMesAno(ano: number, mes0: number): string {
  const s = new Date(ano, mes0, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function abaVisivel(aba: EscalaAba, canEditarOk: boolean, canCriarOk: boolean): boolean {
  if (aba === "minha" || aba === "gerenciar") return canEditarOk;
  if (aba === "gerar") return canCriarOk;
  return false;
}

function primeiraAbaDisponivel(canEditarOk: boolean, canCriarOk: boolean): EscalaAba | null {
  if (canEditarOk) return "minha";
  if (canCriarOk) return "gerar";
  return null;
}

export default function RhEscalaMesPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_escala_mes");

  const hoje = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(() => hoje.getFullYear());
  const [mes, setMes] = useState(() => hoje.getMonth());
  const [aba, setAba] = useState<EscalaAba>("minha");

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const tituloMes = useMemo(() => labelMesAno(ano, mes), [ano, mes]);

  const podeMesAnterior = useMemo(() => {
    const ref = new Date(ano, mes, 1);
    const min = new Date(2020, 0, 1);
    return ref > min;
  }, [ano, mes]);

  const podeMesSeguinte = useMemo(() => {
    const ref = new Date(ano, mes, 1);
    const max = new Date(hoje.getFullYear() + 2, 11, 1);
    return ref < max;
  }, [ano, mes, hoje]);

  const mesAnterior = useCallback(() => {
    if (!podeMesAnterior) return;
    if (mes === 0) {
      setMes(11);
      setAno((y) => y - 1);
    } else {
      setMes((m) => m - 1);
    }
  }, [mes, podeMesAnterior]);

  const mesSeguinte = useCallback(() => {
    if (!podeMesSeguinte) return;
    if (mes === 11) {
      setMes(0);
      setAno((y) => y + 1);
    } else {
      setMes((m) => m + 1);
    }
  }, [mes, podeMesSeguinte]);

  useEffect(() => {
    if (perm.loading) return;
    if (abaVisivel(aba, perm.canEditarOk, perm.canCriarOk)) return;
    const first = primeiraAbaDisponivel(perm.canEditarOk, perm.canCriarOk);
    if (first) setAba(first);
  }, [perm.loading, perm.canEditarOk, perm.canCriarOk, aba]);

  const mostrarAbas = perm.canEditarOk || perm.canCriarOk;

  const linhas: LinhaColaborador[] = useMemo(() => {
    if (!user) return [];
    if (!mostrarAbas) return [];
    if (aba === "minha" && perm.canEditarOk) {
      return [
        {
          id: user.id,
          nome: user.name?.trim() || "—",
          nickname: "—",
          turno: "—",
        },
      ];
    }
    if ((aba === "gerenciar" && perm.canEditarOk) || (aba === "gerar" && perm.canCriarOk)) {
      return [];
    }
    return [];
  }, [aba, user, perm.canEditarOk, perm.canCriarOk, mostrarAbas]);

  const btnNavStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const thDia = (dia: DiaMes): CSSProperties => ({
    ...getThStyle(t, {
      textAlign: "center",
      minWidth: 52,
      maxWidth: 56,
      whiteSpace: "normal",
      lineHeight: 1.25,
      fontSize: 9,
      letterSpacing: 0,
      background: dia.isWeekend
        ? t.isDark
          ? "rgba(245,158,11,0.12)"
          : "rgba(245,158,11,0.14)"
        : undefined,
      color: dia.isWeekend ? "#f59e0b" : undefined,
    }),
  });

  const tdDia: CSSProperties = {
    ...getTdStyle(t, { textAlign: "center", minWidth: 52, maxWidth: 56, fontSize: 12, color: t.textMuted }),
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<CalendarRange size={14} aria-hidden />}
        title="Escala do Mês"
        subtitle="Visualização da escala por colaborador e dia do mês."
      />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "14px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={mesAnterior}
              disabled={!podeMesAnterior}
              aria-label="Mês anterior"
              style={{
                ...btnNavStyle,
                opacity: podeMesAnterior ? 1 : 0.35,
                cursor: podeMesAnterior ? "pointer" : "not-allowed",
              }}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                minWidth: 200,
                textAlign: "center",
              }}
            >
              {tituloMes}
            </span>
            <button
              type="button"
              onClick={mesSeguinte}
              disabled={!podeMesSeguinte}
              aria-label="Próximo mês"
              style={{
                ...btnNavStyle,
                opacity: podeMesSeguinte ? 1 : 0.35,
                cursor: podeMesSeguinte ? "pointer" : "not-allowed",
              }}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {mostrarAbas && (
        <div role="tablist" aria-label="Modo da escala" style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {perm.canEditarOk && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "minha"}
                id="tab-escala-minha"
                aria-controls="panel-escala-mes"
                onClick={() => setAba("minha")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `1px solid ${aba === "minha" ? brand.accent : t.cardBorder}`,
                  background:
                    aba === "minha"
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                        : "rgba(124,58,237,0.15)"
                      : "transparent",
                  color: aba === "minha" ? brand.accent : t.textMuted,
                }}
              >
                Minha Escala
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "gerenciar"}
                id="tab-escala-gerenciar"
                aria-controls="panel-escala-mes"
                onClick={() => setAba("gerenciar")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `1px solid ${aba === "gerenciar" ? brand.accent : t.cardBorder}`,
                  background:
                    aba === "gerenciar"
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                        : "rgba(124,58,237,0.15)"
                      : "transparent",
                  color: aba === "gerenciar" ? brand.accent : t.textMuted,
                }}
              >
                Gerenciar Escala
              </button>
            </>
          )}
          {perm.canCriarOk && (
            <button
              type="button"
              role="tab"
              aria-selected={aba === "gerar"}
              id="tab-escala-gerar"
              aria-controls="panel-escala-mes"
              onClick={() => setAba("gerar")}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                fontWeight: 700,
                fontFamily: FONT.body,
                fontSize: 13,
                cursor: "pointer",
                border: `1px solid ${aba === "gerar" ? brand.accent : t.cardBorder}`,
                background:
                  aba === "gerar"
                    ? brand.useBrand
                      ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                      : "rgba(124,58,237,0.15)"
                    : "transparent",
                color: aba === "gerar" ? brand.accent : t.textMuted,
              }}
            >
              Gerar Escala
            </button>
          )}
        </div>
      )}

      <div
        role="tabpanel"
        id="panel-escala-mes"
        aria-labelledby={mostrarAbas ? `tab-escala-${aba}` : undefined}
        aria-label={mostrarAbas ? undefined : "Escala do mês por colaborador e dia"}
      >
        <div className="app-table-wrap">
          <table
            style={{
              width: "100%",
              minWidth: 320 + dias.length * 56,
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <caption style={{ display: "none" }}>Escala mensal com colunas por dia</caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...getThStyle(t), minWidth: 160, maxWidth: 220 }}>
                  Nome
                </th>
                <th scope="col" style={{ ...getThStyle(t), minWidth: 120 }}>
                  Nickname
                </th>
                <th scope="col" style={{ ...getThStyle(t), minWidth: 100 }}>
                  Turno
                </th>
                {dias.map((dia) => (
                  <th key={dia.iso} scope="col" style={thDia(dia)} title={dia.iso}>
                    <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dia.dia}</div>
                    <div style={{ fontWeight: 600, textTransform: "lowercase", opacity: 0.95 }}>{dia.dowShort}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + dias.length}
                    style={{
                      ...getTdStyle(t),
                      textAlign: "center",
                      padding: "36px 16px",
                      color: t.textMuted,
                    }}
                  >
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                linhas.map((row, i) => (
                  <tr key={row.id} style={{ background: zebraStripe(i) }}>
                    <td style={{ ...getTdStyle(t), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={row.nome}>
                      {row.nome}
                    </td>
                    <td style={getTdStyle(t)}>{row.nickname}</td>
                    <td style={getTdStyle(t)}>{row.turno}</td>
                    {dias.map((dia) => (
                      <td key={`${row.id}-${dia.iso}`} style={tdDia}>
                        —
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
