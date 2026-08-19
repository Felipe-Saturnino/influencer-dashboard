import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import {
  CONTEUDO_REACAO_EMOJIS,
  type ConteudoReacaoChave,
  type ConteudoReacaoEmojiId,
  type ConteudoReacaoOrigem,
  type ConteudoReacaoResumo,
} from "../../lib/conteudoReacao";

export function BarraReacaoConteudo({
  resumo,
  disabled,
  onToggle,
}: {
  resumo: ConteudoReacaoResumo;
  disabled?: boolean;
  onToggle: (emoji: ConteudoReacaoEmojiId) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const ativoCor = brand.accent || "var(--brand-primary, #7c3aed)";

  return (
    <div
      role="group"
      aria-label="Reações"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
    >
      {CONTEUDO_REACAO_EMOJIS.map((e) => {
        const ativo = resumo.minha === e.id;
        const n = resumo.counts[e.id];
        const mostrarContagem = n > 0 || ativo;
        return (
          <button
            key={e.id}
            type="button"
            disabled={disabled}
            aria-pressed={ativo}
            aria-label={mostrarContagem ? `${e.label}, ${n}` : e.label}
            title={e.label}
            onClick={() => onToggle(e.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: mostrarContagem ? "4px 10px" : "4px 8px",
              borderRadius: 999,
              border: `1px solid ${ativo ? ativoCor : t.cardBorder}`,
              background: ativo
                ? `color-mix(in srgb, ${ativoCor} 15%, transparent)`
                : t.inputBg,
              color: ativo ? ativoCor : t.text,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
              fontSize: 13,
              fontWeight: ativo ? 700 : 500,
              fontFamily: FONT.body,
              lineHeight: 1.2,
            }}
          >
            <span aria-hidden>{e.glyph}</span>
            {mostrarContagem ? <span>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function BarraReacaoConteudoLigada({
  origem,
  contentId,
  api,
}: {
  origem: ConteudoReacaoOrigem;
  contentId: string;
  api: {
    resumoDe: (chave: ConteudoReacaoChave) => ConteudoReacaoResumo;
    reagir: (chave: ConteudoReacaoChave, emoji: ConteudoReacaoEmojiId) => void | Promise<void>;
    somenteLeitura: boolean;
  };
}) {
  const chave = { origem, contentId };
  return (
    <BarraReacaoConteudo
      resumo={api.resumoDe(chave)}
      disabled={api.somenteLeitura}
      onToggle={(emoji) => void api.reagir(chave, emoji)}
    />
  );
}
