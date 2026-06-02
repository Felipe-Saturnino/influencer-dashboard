import { useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../../components/CampoObrigatorioMark";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import { RH_EXPERIENCIA_DESCRICAO_MAX } from "../../../../lib/rhExperienciaProfissionalConstants";
import {
  dateSqlParaMesAnoInput,
  mesAnoInputParaDateSql,
  validarPeriodoExperiencia,
} from "../../../../lib/rhExperienciaDates";
import type { RhExperienciaPayload, RhFuncionarioExperiencia } from "../../../../types/rhExperienciaProfissional";
import { getExperienciaInputStyle } from "./sharedStyles";

export function ModalExperienciaProfissional({
  initial,
  onClose,
  onSave,
}: {
  initial?: RhFuncionarioExperiencia | null;
  onClose: () => void;
  onSave: (payload: RhExperienciaPayload) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const inputStyle = getExperienciaInputStyle(t);
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.text,
    fontFamily: FONT.body,
    marginBottom: 6,
  };
  const fieldGap: CSSProperties = { marginBottom: 14 };

  const [cargo, setCargo] = useState(initial?.cargo ?? "");
  const [empresa, setEmpresa] = useState(initial?.empresa ?? "");
  const [mesInicio, setMesInicio] = useState(dateSqlParaMesAnoInput(initial?.mes_ano_inicio));
  const [mesFim, setMesFim] = useState(dateSqlParaMesAnoInput(initial?.mes_ano_fim));
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const submit = async () => {
    setErr(null);
    const e: Record<string, string> = {};
    if (!cargo.trim()) e.cargo = "Informe o cargo.";
    if (!empresa.trim()) e.empresa = "Informe a empresa.";
    if (!mesInicio.trim()) e.mesInicio = "Informe o mês/ano de início.";
    const inicioSql = mesAnoInputParaDateSql(mesInicio);
    if (mesInicio.trim() && !inicioSql) e.mesInicio = "Data de início inválida.";
    const fimSql = mesFim.trim() ? mesAnoInputParaDateSql(mesFim) : null;
    if (mesFim.trim() && !fimSql) e.mesFim = "Data de fim inválida.";
    if (inicioSql && fimSql && !validarPeriodoExperiencia(inicioSql, fimSql)) {
      e.mesFim = "A data de fim não pode ser anterior à data de início.";
    }
    if (descricao.length > RH_EXPERIENCIA_DESCRICAO_MAX) {
      e.descricao = `Máximo de ${RH_EXPERIENCIA_DESCRICAO_MAX} caracteres.`;
    }
    setFieldErr(e);
    if (Object.keys(e).length > 0 || !inicioSql) return;

    setLoading(true);
    try {
      await onSave({
        cargo: cargo.trim(),
        empresa: empresa.trim(),
        mes_ano_inicio: inicioSql,
        mes_ano_fim: fimSql,
        descricao: descricao.trim() ? descricao.trim() : null,
      });
    } catch {
      setErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title={initial ? "Editar experiência" : "Nova experiência"} onClose={onClose} />
      {err ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}
      <div style={fieldGap}>
        <label style={labelStyle}>
          Cargo
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={cargo} onChange={(ev) => setCargo(ev.target.value)} aria-label="Cargo" />
        {fieldErr.cargo ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 11, marginTop: 4, fontFamily: FONT.body }}>
            {fieldErr.cargo}
          </div>
        ) : null}
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Empresa
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={empresa} onChange={(ev) => setEmpresa(ev.target.value)} aria-label="Empresa" />
        {fieldErr.empresa ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 11, marginTop: 4, fontFamily: FONT.body }}>
            {fieldErr.empresa}
          </div>
        ) : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>
            Mês/ano de início
            <CampoObrigatorioMark />
          </label>
          <input
            type="month"
            style={inputStyle}
            value={mesInicio}
            onChange={(ev) => setMesInicio(ev.target.value)}
            aria-label="Mês e ano de início"
          />
          {fieldErr.mesInicio ? (
            <div role="alert" style={{ color: "#e84025", fontSize: 11, marginTop: 4, fontFamily: FONT.body }}>
              {fieldErr.mesInicio}
            </div>
          ) : null}
        </div>
        <div>
          <label style={labelStyle}>Mês/ano de fim</label>
          <input
            type="month"
            style={inputStyle}
            value={mesFim}
            onChange={(ev) => setMesFim(ev.target.value)}
            aria-label="Mês e ano de fim"
          />
          {fieldErr.mesFim ? (
            <div role="alert" style={{ color: "#e84025", fontSize: 11, marginTop: 4, fontFamily: FONT.body }}>
              {fieldErr.mesFim}
            </div>
          ) : null}
        </div>
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Descrição
          <span style={{ fontWeight: 400, color: t.textMuted, marginLeft: 6 }}>
            {descricao.length}/{RH_EXPERIENCIA_DESCRICAO_MAX}
          </span>
        </label>
        <textarea
          style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
          value={descricao}
          maxLength={RH_EXPERIENCIA_DESCRICAO_MAX}
          onChange={(ev) => setDescricao(ev.target.value)}
          aria-label="Descrição da experiência"
        />
        {fieldErr.descricao ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 11, marginTop: 4, fontFamily: FONT.body }}>
            {fieldErr.descricao}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="app-lucide-spin" aria-hidden />
              Salvando…
            </>
          ) : (
            "Salvar"
          )}
        </button>
      </div>
    </ModalBase>
  );
}
