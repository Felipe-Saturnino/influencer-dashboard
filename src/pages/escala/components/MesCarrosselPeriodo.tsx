import { useMemo, useRef, useEffect, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Theme } from "../../../constants/theme";

export type MesRef = { ano: number; mes0: number };

function labelMesAno(ano: number, mes0: number): string {
  const nomeMes = new Date(ano, mes0, 1).toLocaleDateString("pt-BR", { month: "short" });
  const cap = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1).replace(".", "");
  return `${cap} ${ano}`;
}

/** Janela de meses para o carrossel: jan/2026 até 12 meses à frente do mês atual. */
function gerarMesesJanela(hoje: Date): MesRef[] {
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 12, 1);
  const out: MesRef[] = [];
  for (let d = new Date(2026, 0, 1); d <= fim; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push({ ano: d.getFullYear(), mes0: d.getMonth() });
  }
  return out;
}

function mesIgual(a: MesRef, b: MesRef): boolean {
  return a.ano === b.ano && a.mes0 === b.mes0;
}

export function mesReferenciaInicialCarrossel(hoje = new Date()): MesRef {
  const meses = gerarMesesJanela(hoje);
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  const hit = meses.find((x) => x.ano === y && x.mes0 === m);
  return hit ?? meses[meses.length - 1] ?? { ano: y, mes0: m };
}

interface MesCarrosselPeriodoProps {
  value: MesRef;
  onChange: (m: MesRef) => void;
  t: Theme;
  brand: { accent: string };
}

export function MesCarrosselPeriodo({ value, onChange, t, brand }: MesCarrosselPeriodoProps) {
  const hoje = useMemo(() => new Date(), []);
  const meses = useMemo(() => gerarMesesJanela(hoje), [hoje]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeKey = `${value.ano}-${value.mes0}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-mes-key="${activeKey}"]`);
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeKey]);

  const chipBase: CSSProperties = {
    flexShrink: 0,
    padding: "8px 14px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.textMuted,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FONT.body,
    cursor: "pointer",
  };

  const idxAtual = meses.findIndex((m) => mesIgual(m, value));
  const podeAnt = idxAtual > 0;
  const podeProx = idxAtual >= 0 && idxAtual < meses.length - 1;

  const irAnt = () => {
    if (!podeAnt) return;
    onChange(meses[idxAtual - 1]!);
  };
  const irProx = () => {
    if (!podeProx) return;
    onChange(meses[idxAtual + 1]!);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
        flex: "1 1 200px",
      }}
    >
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={irAnt}
        disabled={!podeAnt}
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          cursor: podeAnt ? "pointer" : "not-allowed",
          opacity: podeAnt ? 1 : 0.35,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <div
        ref={scrollRef}
        role="listbox"
        aria-label="Período (meses)"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          minWidth: 0,
          flex: 1,
          paddingBottom: 4,
          scrollbarWidth: "thin",
        }}
      >
        {meses.map((m) => {
          const key = `${m.ano}-${m.mes0}`;
          const ativo = mesIgual(m, value);
          return (
            <button
              key={key}
              type="button"
              role="option"
              data-mes-key={key}
              aria-selected={ativo}
              onClick={() => onChange(m)}
              style={{
                ...chipBase,
                border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                background: ativo
                  ? brand.accent.startsWith("var(")
                    ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                    : `${String(brand.accent)}22`
                  : t.inputBg,
                color: ativo ? brand.accent : t.textMuted,
                fontWeight: ativo ? 800 : 600,
                fontFamily: ativo ? FONT_TITLE : FONT.body,
              }}
            >
              {labelMesAno(m.ano, m.mes0)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={irProx}
        disabled={!podeProx}
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          cursor: podeProx ? "pointer" : "not-allowed",
          opacity: podeProx ? 1 : 0.35,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
