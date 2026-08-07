import { Eye, EyeOff, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { propsBotaoFecharModal } from "../../../lib/iconOnlyButtonA11y";
import { MODAL_BASE_PADDING_PX, useDialogTitleId } from "../../../components/OperacoesModal";
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
  const pad = MODAL_BASE_PADDING_PX;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        position: "sticky",
        top: -pad,
        zIndex: 2,
        marginTop: -pad,
        marginLeft: -pad,
        marginRight: -pad,
        marginBottom: 20,
        paddingTop: pad,
        paddingLeft: pad,
        paddingRight: pad,
        paddingBottom: 16,
        background: brand.blockBg,
        borderBottom: `1px solid ${t.cardBorder}`,
        boxShadow: t.isDark ? "0 8px 16px rgba(0,0,0,0.35)" : "0 8px 16px rgba(0,0,0,0.06)",
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
            color: t.text,
            flexShrink: 0,
          }}
          {...propsBotaoFecharModal()}
        >
          <X size={22} strokeWidth={2.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
