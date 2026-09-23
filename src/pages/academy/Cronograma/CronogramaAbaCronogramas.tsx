import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { AcademyCronograma, AcademyCronogramaItem, AcademyMaterial, AcademyProva, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { materiaisDaTrilha, provasDaTrilha } from "../../../lib/academyCronogramaUi";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  cronograma: AcademyCronograma | null;
  itens: AcademyCronogramaItem[];
  trilhas: AcademyTrilha[];
  materiais: AcademyMaterial[];
  provas: AcademyProva[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  trilhaProvas: { trilha_id: string; prova_id: string }[];
  canEditar: boolean;
  onEditar: () => void;
  onAdicionar: () => void;
  onMover: (trilhaId: string, dir: -1 | 1) => void;
  onRemover: (trilhaId: string) => void;
};

function badgeStyle(bg: string, color: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
    fontFamily: FONT.body,
  } as const;
}

export function CronogramaAbaCronogramas({
  brand,
  t,
  cronograma,
  itens,
  trilhas,
  materiais,
  provas,
  trilhaMateriais,
  trilhaProvas,
  canEditar,
  onEditar,
  onAdicionar,
  onMover,
  onRemover,
}: Props) {
  const trilhasMap = new Map(trilhas.map((tr) => [tr.id, tr]));
  const ordem = [...itens].sort((a, b) => a.ordem - b.ordem);
  const provasCount = new Set(
    ordem.flatMap((item) =>
      trilhaProvas.filter((v) => v.trilha_id === item.trilha_id).map((v) => v.prova_id),
    ),
  ).size;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {[
          { label: "Trilhas neste cronograma", value: String(ordem.length), color: "var(--brand-primary, #7c3aed)" },
          { label: "Provas", value: String(provasCount), color: "var(--brand-secondary, #1e36f8)" },
          {
            label: "Duração prevista",
            value: cronograma ? `${cronograma.duracao_dias} ${cronograma.duracao_dias === 1 ? "dia" : "dias"}` : "—",
            color: "var(--brand-success, #22c55e)",
          },
        ].map((kpi) => (
          <div key={kpi.label} style={{ ...getPageContentBoxStyle(brand, t, { marginBottom: 0 }), padding: 0, overflow: "hidden" }}>
            <div style={{ height: 4, background: kpi.color }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.body }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 6, fontFamily: FONT.title }}>
                {kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={getPageContentBoxStyle(brand, t)}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brand-primary, #7c3aed)", fontFamily: FONT.body }}>
            Ordem das trilhas
          </h2>
          {canEditar && cronograma ? (
            <BtnIconeAcaoLinha label={tooltipAcao("Editar cronograma")} onClick={onEditar}>
              <Pencil size={15} aria-hidden />
            </BtnIconeAcaoLinha>
          ) : null}
        </div>
        <p style={{ fontSize: 13, color: t.textMuted, margin: "0 0 14px", lineHeight: 1.45, fontFamily: FONT.body }}>
          {cronograma?.descricao?.trim() || "Selecione ou crie um cronograma para montar a sequência de trilhas."}
        </p>
        <div
          style={{
            background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 8%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--brand-primary, #7c3aed) 30%, transparent)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 12,
            color: t.textMuted,
            marginBottom: 14,
            lineHeight: 1.45,
            fontFamily: FONT.body,
          }}
        >
          O cronograma é o <strong>currículo</strong> do onboarding — sem datas. Uma sequência de trilhas já cadastradas.
          Cada trilha pode ser usada sozinha depois (retreinamento). Datas, treinador e check-in ficam na página{" "}
          <strong>Gestão de Turmas</strong>. A liberação para Live continua com o treinador — a nota da prova não libera
          sozinha. Sem pelo menos uma trilha, o cronograma não pode gerar turma.
        </div>

        {!cronograma ? (
          <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhum cronograma cadastrado ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ordem.map((item, idx) => {
              const trilha = trilhasMap.get(item.trilha_id);
              if (!trilha) return null;
              const mats = materiaisDaTrilha(trilha.id, materiais, trilhaMateriais);
              const prs = provasDaTrilha(trilha.id, provas, trilhaProvas);
              return (
                <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: "var(--brand-primary, #7c3aed)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: FONT.body,
                      }}
                    >
                      {idx + 1}
                    </div>
                    {idx < ordem.length - 1 || canEditar ? (
                      <div style={{ width: 2, flex: 1, minHeight: 16, background: t.cardBorder }} />
                    ) : null}
                  </div>
                  <article
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg ?? t.cardBg,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{trilha.nome}</h3>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <span style={badgeStyle("color-mix(in srgb, #22c55e 16%, transparent)", "#15803d")}>
                          {mats.length === 1 ? "1 material" : `${mats.length} materiais`}
                        </span>
                        <span style={badgeStyle("color-mix(in srgb, #1e36f8 14%, transparent)", "#1e36f8")}>
                          {prs.length === 0 ? "sem prova" : prs.length === 1 ? "1 prova" : `${prs.length} provas`}
                        </span>
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.45, fontFamily: FONT.body }}>
                        {trilha.descricao}
                      </p>
                    </div>
                    {canEditar ? (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Subir")} onClick={() => onMover(trilha.id, -1)} disabled={idx === 0}>
                          <ArrowUp size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnIconeAcaoLinha
                          label={tooltipAcao("Descer")}
                          onClick={() => onMover(trilha.id, 1)}
                          disabled={idx === ordem.length - 1}
                        >
                          <ArrowDown size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnIconeAcaoLinha label={tooltipAcao("Remover do cronograma")} onClick={() => onRemover(trilha.id)}>
                          <X size={14} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    ) : null}
                  </article>
                </div>
              );
            })}
            {canEditar ? (
              <button
                type="button"
                onClick={onAdicionar}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  minHeight: 56,
                  borderRadius: 12,
                  border: "1px dashed var(--brand-primary, #7c3aed)",
                  background: "transparent",
                  color: "var(--brand-primary, #7c3aed)",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                <Plus size={16} aria-hidden />
                Adicionar trilha
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
