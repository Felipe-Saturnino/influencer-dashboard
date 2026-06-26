import { Eye, EyeOff, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { propsBotaoFecharModal } from "../../../lib/iconOnlyButtonA11y";
import { useDialogTitleId } from "../../../components/OperacoesModal";
import type { RhFuncionario } from "../../../types/rhFuncionario";

export function RhFuncModalHeaderDetalhes({
  t,
  perm,
  editId,
  lista,
  modalVerExibirSensiveis,
  setModalVerExibirSensiveis,
  abrirEditar,
  fecharModalFuncionario,
  ctaGradient,
  brand,
}: {
  t: ReturnType<typeof useApp>["theme"];
  perm: ReturnType<typeof usePermission>;
  editId: string | null;
  lista: RhFuncionario[];
  modalVerExibirSensiveis: boolean;
  setModalVerExibirSensiveis: (v: boolean) => void;
  abrirEditar: (row: RhFuncionario) => void;
  fecharModalFuncionario: () => void;
  ctaGradient: (brand: ReturnType<typeof useDashboardBrand>) => string;
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const titleId = useDialogTitleId();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 900,
            color: t.text,
            fontFamily: FONT_TITLE,
          }}
        >
          Detalhes do Prestador
        </h2>
        <button
          type="button"
          onClick={() => setModalVerExibirSensiveis(!modalVerExibirSensiveis)}
          aria-label={modalVerExibirSensiveis ? "Ocultar dados sensíveis" : "Exibir dados sensíveis"}
          title={modalVerExibirSensiveis ? "Ocultar" : "Ver"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {modalVerExibirSensiveis ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {modalVerExibirSensiveis ? "Ocultar" : "Ver"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {perm.canEditarOk && editId ? (
          <button
            type="button"
            onClick={() => {
              const row = lista.find((x) => x.id === editId);
              if (row) abrirEditar(row);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              background: ctaGradient(brand),
            }}
          >
            Editar
          </button>
        ) : null}
        <button
          type="button"
          onClick={fecharModalFuncionario}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.textMuted,
          }}
          {...propsBotaoFecharModal()}
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
