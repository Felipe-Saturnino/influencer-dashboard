import { useId, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { textoContemBusca } from "../../../lib/searchText";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import {
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDEM,
  TIPO_INTEGRACAO_LABEL,
  TIPO_INTEGRACAO_ORDEM,
  type PrioridadeIntegracao,
  type TipoIntegracao,
} from "./constants";
import type { MarcaFechadaOpcao } from "./types";

export function ModalNovaIntegracao({
  onClose,
  onCreated,
  marcas,
  agregadoraOpcoes,
  canCriar,
}: {
  onClose: () => void;
  onCreated: (payload: {
    marca_id: string;
    operador_nome: string;
    prioridade: PrioridadeIntegracao;
    tipo: TipoIntegracao;
    caminho: string;
    pam: string;
    agregadora: string;
  }) => Promise<string | null>;
  marcas: MarcaFechadaOpcao[];
  agregadoraOpcoes: string[];
  canCriar: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const formId = useId();
  const [buscaMarca, setBuscaMarca] = useState("");
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<PrioridadeIntegracao | "">("");
  const [tipo, setTipo] = useState<TipoIntegracao | "">("");
  const [caminho, setCaminho] = useState("");
  const [pam, setPam] = useState("");
  const [agregadora, setAgregadora] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const marcaSel = marcas.find((m) => m.id === marcaId) ?? null;

  const marcasFiltradas = useMemo(
    () => marcas.filter((m) => textoContemBusca(m.nome, buscaMarca)),
    [marcas, buscaMarca],
  );

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: t.text,
    marginBottom: 6,
    fontFamily: FONT.body,
  };

  async function salvar() {
    if (!canCriar || !marcaSel) return;
    if (!prioridade) {
      setErr("Selecione a prioridade.");
      return;
    }
    if (!tipo) {
      setErr("Selecione o tipo (Dedicada ou Network).");
      return;
    }
    if (!caminho.trim()) {
      setErr("Informe o caminho.");
      return;
    }
    if (!pam.trim()) {
      setErr("Informe o PAM.");
      return;
    }
    if (!agregadora.trim()) {
      setErr("Selecione o agregador.");
      return;
    }

    setSalvando(true);
    setErr(null);
    const errorMsg = await onCreated({
      marca_id: marcaSel.id,
      operador_nome: marcaSel.nome,
      prioridade,
      tipo,
      caminho: caminho.trim(),
      pam: pam.trim(),
      agregadora: agregadora.trim(),
    });
    setSalvando(false);
    if (errorMsg) {
      setErr(errorMsg);
      return;
    }
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1000}>
      <ModalHeader title="Nova Integração" onClose={onClose} />
      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={labelStyle}>
            Operador (marca)
            <CampoObrigatorioMark />
          </div>
          {marcaSel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                fontFamily: FONT.body,
                fontSize: 13,
                color: t.text,
              }}
            >
              <span style={{ fontWeight: 600 }}>{marcaSel.nome}</span>
              <button
                type="button"
                onClick={() => {
                  setMarcaId(null);
                  setTipo("");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--brand-primary, #7c3aed)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Trocar
              </button>
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10,
                padding: 10,
                background: t.inputBg,
              }}
            >
              <BarraPesquisaFiltroPainel
                value={buscaMarca}
                onChange={setBuscaMarca}
                placeholder={placeholderPesquisaFiltro("Marca")}
                aria-label="Pesquisar marca"
              />
              <ul
                role="listbox"
                aria-label="Marcas da aba Fechado do Pipeline B2B"
                style={{
                  listStyle: "none",
                  margin: "8px 0 0",
                  padding: 0,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {marcasFiltradas.length === 0 ? (
                  <li
                    style={{
                      padding: "10px 8px",
                      color: t.textMuted,
                      fontSize: 13,
                      fontFamily: FONT.body,
                    }}
                  >
                    Nenhuma marca em Fechado disponível.
                  </li>
                ) : (
                  marcasFiltradas.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          setMarcaId(m.id);
                          setBuscaMarca("");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: 8,
                          background: "transparent",
                          color: t.text,
                          fontSize: 13,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                        }}
                      >
                        {m.nome}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {marcaSel ? (
          <>
            <div>
              <label htmlFor={`${formId}-prioridade`} style={labelStyle}>
                Prioridade
                <CampoObrigatorioMark />
              </label>
              <select
                id={`${formId}-prioridade`}
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeIntegracao | "")}
                style={inputStyle}
                aria-label="Prioridade"
              >
                <option value="">Selecione…</option>
                {PRIORIDADE_ORDEM.map((p) => (
                  <option key={p} value={p}>
                    {PRIORIDADE_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-tipo`} style={labelStyle}>
                Tipo
                <CampoObrigatorioMark />
              </label>
              <select
                id={`${formId}-tipo`}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoIntegracao | "")}
                style={inputStyle}
                aria-label="Tipo"
              >
                <option value="">Selecione…</option>
                {TIPO_INTEGRACAO_ORDEM.map((tp) => (
                  <option key={tp} value={tp}>
                    {TIPO_INTEGRACAO_LABEL[tp]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-caminho`} style={labelStyle}>
                Caminho
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${formId}-caminho`}
                value={caminho}
                onChange={(e) => setCaminho(e.target.value)}
                style={inputStyle}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor={`${formId}-pam`} style={labelStyle}>
                PAM
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${formId}-pam`}
                value={pam}
                onChange={(e) => setPam(e.target.value)}
                style={inputStyle}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor={`${formId}-agregador`} style={labelStyle}>
                Agregador
                <CampoObrigatorioMark />
              </label>
              <select
                id={`${formId}-agregador`}
                value={agregadora}
                onChange={(e) => setAgregadora(e.target.value)}
                style={inputStyle}
                aria-label="Agregador"
              >
                <option value="">Selecione…</option>
                {agregadoraOpcoes.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando || !canCriar || !marcaSel}
          onClick={() => void salvar()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: salvando || !canCriar || !marcaSel ? "not-allowed" : "pointer",
            opacity: salvando || !canCriar || !marcaSel ? 0.7 : 1,
          }}
        >
          {salvando ? "Salvando…" : "Criar"}
        </button>
      </div>
    </ModalBase>
  );
}
