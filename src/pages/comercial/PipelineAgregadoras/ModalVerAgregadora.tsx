import type { CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import {
  STATUS_PIPELINE_AGREGADORA_COLOR,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  badgePipelineAgregadoraStyle,
} from "./constants";
import type { AgregadoraRow } from "./types";
import { fmtUltimoContato, fmtJogos } from "./helpers";

export function ModalVerAgregadora({
  agregadora,
  onClose,
}: {
  agregadora: AgregadoraRow;
  onClose: () => void;
}) {
  const { theme: t } = useApp();

  const fieldLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 4,
    fontFamily: FONT.body,
  };
  const fieldValue: CSSProperties = {
    fontSize: 13,
    color: t.text,
    fontFamily: FONT.body,
  };

  return (
    <ModalBase onClose={onClose} maxWidth={480} zIndex={1000}>
      <ModalHeader title={agregadora.nome} onClose={onClose} />
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={fieldLabel}>Site</div>
          <a
            href={agregadora.site}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...fieldValue, color: "var(--brand-primary, #7c3aed)" }}
          >
            {agregadora.site}
          </a>
        </div>
        <div>
          <div style={fieldLabel}>Jogos</div>
          <div style={fieldValue}>{fmtJogos(agregadora.jogos)}</div>
        </div>
        <div>
          <div style={fieldLabel}>Status</div>
          <span
            style={badgePipelineAgregadoraStyle(
              STATUS_PIPELINE_AGREGADORA_COLOR[agregadora.status_pipeline],
            )}
          >
            {STATUS_PIPELINE_AGREGADORA_LABEL[agregadora.status_pipeline]}
          </span>
        </div>
        <div>
          <div style={fieldLabel}>Comercial</div>
          <div style={fieldValue}>{agregadora.comercial_nome ?? "—"}</div>
        </div>
        <div>
          <div style={fieldLabel}>Último Contato</div>
          <div style={fieldValue}>{fmtUltimoContato(agregadora.ultimo_contato)}</div>
        </div>
      </div>
    </ModalBase>
  );
}
