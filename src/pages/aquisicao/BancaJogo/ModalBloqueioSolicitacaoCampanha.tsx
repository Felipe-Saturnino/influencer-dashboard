import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"

export function ModalBloqueioSolicitacaoCampanha({
  tipo,
  onClose,
  onTentarNovamente,
}: {
  tipo: "perfil" | "playbook" | "erro_verificacao";
  onClose: () => void;
  onTentarNovamente?: () => void;
}) {
  const { theme: t, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const texto =
    tipo === "erro_verificacao"
      ? "Não foi possível verificar seu cadastro e o Playbook agora. Tente novamente em instantes."
      : tipo === "perfil"
        ? "Para solicitar valores para a Campanha promocional você precisa concluir o cadastro na página de Influencers. Qualquer solicitação permanece bloqueada até a conclusão do cadastro."
        : "Para solicitar valores para a Campanha promocional você precisa ler e dar ciência nos termos do Playbook. Qualquer solicitação permanece bloqueada até que essa ciência seja registrada.";

  function irResolver() {
    onClose();
    setActivePage(tipo === "perfil" ? "influencers" : "playbook_influencers");
  }

  const titulo = tipo === "erro_verificacao" ? "Verificação indisponível" : "Solicitação indisponível";

  return (
    <ModalBase onClose={onClose} maxWidth={460} zIndex={1100}>
      <ModalHeader title={titulo} onClose={onClose} />
      <p style={{ margin: "0 0 22px", fontSize: 14, color: t.text, fontFamily: FONT.body, lineHeight: 1.55 }}>
        {texto}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, minWidth: 120, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`,
            background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
          }}
        >
          Fechar
        </button>
        {tipo === "erro_verificacao" && onTentarNovamente ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onTentarNovamente();
            }}
            style={{
              flex: 2, minWidth: 180, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
            }}
          >
            Tentar de novo
          </button>
        ) : tipo !== "erro_verificacao" ? (
          <button
            type="button"
            onClick={irResolver}
            style={{
              flex: 2, minWidth: 180, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
            }}
          >
            {tipo === "perfil" ? "Ir para Influencers" : "Ir para Playbook"}
          </button>
        ) : null}
      </div>
    </ModalBase>
  );
}
