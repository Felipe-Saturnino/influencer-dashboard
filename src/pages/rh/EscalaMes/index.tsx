import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { supabase } from "../../../lib/supabase";
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

type RpcPrestadorEscala = {
  id: string;
  nome: string;
  escala: string;
  email: string;
  org_time_id: string | null;
  nome_time: string;
  staff_nickname: string | null;
};

const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Larguras fixas das 3 colunas fixas (sticky) — soma usada em `left`. */
const STICKY_W_NOME = 180;
const STICKY_W_NICK = 130;
const STICKY_W_TURNO = 110;
const STICKY_LEFT_NICK = STICKY_W_NOME;
const STICKY_LEFT_TURNO = STICKY_W_NOME + STICKY_W_NICK;

/** Navegação e escala consideram a partir de janeiro de 2026. */
const ESCALA_ANO_MIN = 2026;
const ESCALA_MES0_MIN = 0;

function mesReferenciaInicial(): { ano: number; mes: number } {
  const d = new Date();
  const ref = new Date(d.getFullYear(), d.getMonth(), 1);
  const min = new Date(ESCALA_ANO_MIN, ESCALA_MES0_MIN, 1);
  if (ref < min) return { ano: ESCALA_ANO_MIN, mes: ESCALA_MES0_MIN };
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

function diasDoMes(ano: number, mes0: number): DiaMes[] {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const out: DiaMes[] = [];
  for (let day = 1; day <= ultimo; day++) {
    const dt = new Date(ano, mes0, day);
    const dow = dt.getDay();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    out.push({
      dia: day,
      dowShort: DOW_SHORT[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
      iso: `${y}-${m}-${dd}`,
    });
  }
  return out;
}

/** Formato: "Janeiro 2026" (nome do mês em pt-BR + ano). */
function labelMesAno(ano: number, mes0: number): string {
  const nomeMes = new Date(ano, mes0, 1).toLocaleDateString("pt-BR", { month: "long" });
  const capitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  return `${capitalizado} ${ano}`;
}

function mapLinhaPrestador(r: RpcPrestadorEscala): LinhaColaborador {
  const nick = (r.staff_nickname ?? "").trim();
  return {
    id: r.id,
    nome: (r.nome ?? "").trim() || "—",
    nickname: nick || "—",
    turno: (r.escala ?? "").trim() || "—",
  };
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
  const inicial = useMemo(() => mesReferenciaInicial(), []);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [aba, setAba] = useState<EscalaAba>("minha");

  const [prestadoresRaw, setPrestadoresRaw] = useState<RpcPrestadorEscala[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);

  const carregarPrestadores = useCallback(async () => {
    setLoadingPrestadores(true);
    setErroPrestadores(null);
    const { data, error } = await supabase.rpc("rh_escala_prestadores_times");
    if (error) {
      setErroPrestadores("Não foi possível carregar o staff da escala. Verifique permissões e se a migration da função foi aplicada.");
      setPrestadoresRaw([]);
    } else {
      setPrestadoresRaw((data ?? []) as RpcPrestadorEscala[]);
    }
    setLoadingPrestadores(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarPrestadores();
  }, [perm.loading, perm.canView, carregarPrestadores]);

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const tituloMes = useMemo(() => labelMesAno(ano, mes), [ano, mes]);

  const podeMesAnterior = useMemo(() => {
    const ref = new Date(ano, mes, 1);
    const min = new Date(ESCALA_ANO_MIN, ESCALA_MES0_MIN, 1);
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
    const mapped = prestadoresRaw.map(mapLinhaPrestador);
    if (!mostrarAbas) return mapped;
    if (aba === "minha" && perm.canEditarOk) {
      const em = user?.email?.trim().toLowerCase();
      if (!em) return [];
      return prestadoresRaw.filter((p) => (p.email ?? "").trim().toLowerCase() === em).map(mapLinhaPrestador);
    }
    if ((aba === "gerenciar" && perm.canEditarOk) || (aba === "gerar" && perm.canCriarOk)) {
      return mapped;
    }
    return [];
  }, [aba, user?.email, prestadoresRaw, perm.canEditarOk, perm.canCriarOk, mostrarAbas]);

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

  const thBase = getThStyle(t);

  /** Cabeçalhos fixos à esquerda ficam acima das colunas de dia ao rolar horizontalmente. */
  const Z_STICKY_HEAD = 30;
  const Z_STICKY_BODY = 10;
  const Z_DIA = 0;

  const thSticky = (left: number, extra?: CSSProperties): CSSProperties => ({
    ...thBase,
    position: "sticky",
    left,
    zIndex: Z_STICKY_HEAD,
    boxSizing: "border-box",
    background: brand.blockBg,
    ...extra,
  });

  const thDia = (dia: DiaMes): CSSProperties => ({
    ...getThStyle(t, {
      textAlign: "center",
      minWidth: 52,
      maxWidth: 56,
      whiteSpace: "normal",
      lineHeight: 1.25,
      fontSize: 9,
      letterSpacing: 0,
      zIndex: Z_DIA,
      position: "relative",
      background: dia.isWeekend
        ? t.isDark
          ? "rgba(245,158,11,0.12)"
          : "rgba(245,158,11,0.14)"
        : getThStyle(t).background,
      color: dia.isWeekend ? "#f59e0b" : undefined,
    }),
  });

  const sombraColFixa = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";

  const tdDia: CSSProperties = {
    ...getTdStyle(t, {
      textAlign: "center",
      minWidth: 52,
      maxWidth: 56,
      fontSize: 12,
      color: t.textMuted,
      zIndex: Z_DIA,
      position: "relative",
    }),
  };

  const tdSticky = (left: number, rowBg: string, extra?: CSSProperties): CSSProperties => ({
    ...getTdStyle(t, {
      ...extra,
      background: rowBg,
      boxSizing: "border-box",
    }),
    position: "sticky",
    left,
    zIndex: Z_STICKY_BODY,
  });

  const zebraBgLinha = (i: number) => {
    const z = zebraStripe(i);
    return z === "transparent" ? (t.cardBg ?? t.bg ?? "#fff") : z;
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
        subtitle="Visualização da escala por colaborador e dia do mês (mesma base da Gestão de Staff)."
      />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: mostrarAbas ? 12 : 0,
            }}
          >
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

          {mostrarAbas ? (
            <div
              role="tablist"
              aria-label="Modo da escala"
              style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
            >
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
                      padding: "10px 18px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: "pointer",
                      border: `1px solid ${aba === "minha" ? brand.accent : t.cardBorder}`,
                      background:
                        aba === "minha"
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg ?? "transparent"),
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
                      padding: "10px 18px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: "pointer",
                      border: `1px solid ${aba === "gerenciar" ? brand.accent : t.cardBorder}`,
                      background:
                        aba === "gerenciar"
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg ?? "transparent"),
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
                    padding: "10px 18px",
                    minHeight: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    cursor: "pointer",
                    border: `1px solid ${aba === "gerar" ? brand.accent : t.cardBorder}`,
                    background:
                      aba === "gerar"
                        ? brand.useBrand
                          ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                          : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                        : (t.inputBg ?? t.cardBg ?? "transparent"),
                    color: aba === "gerar" ? brand.accent : t.textMuted,
                  }}
                >
                  Gerar Escala
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {erroPrestadores && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroPrestadores}
        </div>
      )}

      <div
        role="tabpanel"
        id="panel-escala-mes"
        aria-labelledby={mostrarAbas ? `tab-escala-${aba}` : undefined}
        aria-label={mostrarAbas ? undefined : "Escala do mês por colaborador e dia"}
      >
        {loadingPrestadores ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando escala…</span>
          </div>
        ) : (
          <div className="app-table-wrap">
            <table
              style={{
                width: "100%",
                minWidth: STICKY_W_NOME + STICKY_W_NICK + STICKY_W_TURNO + dias.length * 56,
                borderCollapse: "separate",
                borderSpacing: 0,
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <caption style={{ display: "none" }}>Escala mensal com colunas por dia</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={thSticky(0, {
                      minWidth: STICKY_W_NOME,
                      maxWidth: STICKY_W_NOME,
                      width: STICKY_W_NOME,
                      verticalAlign: "middle",
                    })}
                  >
                    Nome
                  </th>
                  <th
                    scope="col"
                    style={thSticky(STICKY_LEFT_NICK, {
                      minWidth: STICKY_W_NICK,
                      maxWidth: STICKY_W_NICK,
                      width: STICKY_W_NICK,
                      verticalAlign: "middle",
                    })}
                  >
                    Nickname
                  </th>
                  <th
                    scope="col"
                    style={thSticky(STICKY_LEFT_TURNO, {
                      minWidth: STICKY_W_TURNO,
                      maxWidth: STICKY_W_TURNO,
                      width: STICKY_W_TURNO,
                      verticalAlign: "middle",
                      borderRight: `1px solid ${t.cardBorder}`,
                      boxShadow: sombraColFixa,
                    })}
                  >
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
                  linhas.map((row, i) => {
                    const bg = zebraBgLinha(i);
                    return (
                      <tr key={row.id}>
                        <td
                          style={tdSticky(0, bg, {
                            maxWidth: STICKY_W_NOME,
                            width: STICKY_W_NOME,
                            minWidth: STICKY_W_NOME,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          })}
                          title={row.nome}
                        >
                          {row.nome}
                        </td>
                        <td
                          style={tdSticky(STICKY_LEFT_NICK, bg, {
                            minWidth: STICKY_W_NICK,
                            width: STICKY_W_NICK,
                            maxWidth: STICKY_W_NICK,
                          })}
                        >
                          {row.nickname}
                        </td>
                        <td
                          style={tdSticky(STICKY_LEFT_TURNO, bg, {
                            minWidth: STICKY_W_TURNO,
                            width: STICKY_W_TURNO,
                            maxWidth: STICKY_W_TURNO,
                            borderRight: `1px solid ${t.cardBorder}`,
                            boxShadow: sombraColFixa,
                          })}
                        >
                          {row.turno}
                        </td>
                        {dias.map((dia) => (
                          <td key={`${row.id}-${dia.iso}`} style={{ ...tdDia, background: bg }}>
                            —
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
