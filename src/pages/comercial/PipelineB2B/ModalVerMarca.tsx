import { useEffect, useMemo, useState } from "react";
import { Globe, Loader2, Shield, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import type { PipelineMarcaRow } from "./types";
import {
  badgePipelineStyle,
  badgeProdutoStyle,
  PIPELINE_COLOR,
  STATUS_DOMINIO_LABEL,
  STATUS_PIPELINE_LABEL,
  STATUS_PRODUTO_LABEL,
} from "./constants";
import {
  fmtDataNascimento,
  marcasMesmoCnpj,
  parseDominioMarcaInput,
  produtoStatus,
  telefonesDisplay,
} from "./helpers";

type VerTab = "dados" | "licenca" | "contatos";

export function ModalVerMarca({
  marca,
  allMarcas,
  onClose,
  onOpenMarca,
  canEditar,
  onSavedDominio,
}: {
  marca: PipelineMarcaRow;
  allMarcas: PipelineMarcaRow[];
  onClose: () => void;
  onOpenMarca: (m: PipelineMarcaRow) => void;
  canEditar: boolean;
  onSavedDominio: (marcaId: string, dominio: string | null) => Promise<boolean>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [dominio, setDominio] = useState(marca.dominio ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setDominio(marca.dominio ?? "");
    setErr(null);
  }, [marca.id, marca.dominio]);
  const licencaRows = useMemo(
    () => marcasMesmoCnpj(allMarcas, marca.empresa.cnpj, marca.id),
    [allMarcas, marca],
  );

  const tabs = useMemo(() => {
    const list: VerTab[] = ["dados"];
    if (licencaRows.length > 0) list.push("licenca");
    if (marca.contatos.length > 0) list.push("contatos");
    return list;
  }, [licencaRows.length, marca.contatos.length]);

  const [tab, setTab] = useState<VerTab>("dados");

  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 4,
    fontFamily: FONT.body,
  };
  const fieldValue: React.CSSProperties = {
    fontSize: 13,
    color: t.text,
    fontFamily: FONT.body,
  };

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

  async function salvarDominio() {
    if (!canEditar) return;
    setErr(null);
    const parsed = parseDominioMarcaInput(dominio);
    if (parsed.error) {
      setErr(parsed.error);
      return;
    }
    setSalvando(true);
    const ok = await onSavedDominio(marca.id, parsed.value);
    setSalvando(false);
    if (!ok) {
      setErr("Não foi possível salvar o domínio. Se o problema persistir, entre em contato com o suporte.");
    }
  }

  const dominioParsed = parseDominioMarcaInput(dominio);
  const dominioAtualNormalizado = marca.dominio
    ? parseDominioMarcaInput(marca.dominio).value
    : null;
  const dominioAlterado =
    canEditar &&
    !dominioParsed.error &&
    (dominioParsed.value ?? null) !== (dominioAtualNormalizado ?? null);

  return (
    <ModalBase onClose={onClose} maxWidth={720} zIndex={1000}>
      <ModalHeader title={marca.nome} onClose={onClose} />
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 13,
          color: t.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.45,
        }}
      >
        {marca.empresa.razao_social} · CNPJ {marca.empresa.cnpj}
      </p>
      <div
        role="tablist"
        aria-label="Abas de visualização da marca"
        style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabs, setTab, (k) => `tab-ver-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-ver-dados"
          active={activeTab === "dados"}
          aria-controls="panel-ver-dados"
          onClick={() => setTab("dados")}
          icon={<Globe {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Dados da Marca
        </FiltroBarTabButton>
        {licencaRows.length > 0 ? (
          <FiltroBarTabButton
            id="tab-ver-licenca"
            active={activeTab === "licenca"}
            aria-controls="panel-ver-licenca"
            onClick={() => setTab("licenca")}
            icon={<Shield {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Licença Compartilhada
          </FiltroBarTabButton>
        ) : null}
        {marca.contatos.length > 0 ? (
          <FiltroBarTabButton
            id="tab-ver-contatos"
            active={activeTab === "contatos"}
            aria-controls="panel-ver-contatos"
            onClick={() => setTab("contatos")}
            icon={<Users {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Dados dos Contatos
          </FiltroBarTabButton>
        ) : null}
      </div>

      {activeTab === "dados" ? (
        <div id="panel-ver-dados" role="tabpanel" aria-labelledby="tab-ver-dados">
          {err ? (
            <div
              role="alert"
              aria-live="polite"
              style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
            >
              {err}
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
            <div>
              <div style={fieldLabel}>Domínio</div>
              {canEditar ? (
                <input
                  type="url"
                  inputMode="url"
                  value={dominio}
                  onChange={(e) => setDominio(e.target.value)}
                  placeholder="https://marca.bet.br"
                  aria-label="Domínio da marca"
                  style={inputStyle}
                />
              ) : marca.dominio ? (
                <a
                  href={marca.dominio.startsWith("http") ? marca.dominio : `https://${marca.dominio}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...fieldValue, color: "var(--brand-accent, #1e36f8)", fontWeight: 700 }}
                >
                  {marca.dominio}
                </a>
              ) : (
                <div style={fieldValue}>—</div>
              )}
            </div>
            <div>
              <div style={fieldLabel}>Status do Domínio</div>
              <div style={fieldValue}>{STATUS_DOMINIO_LABEL[marca.status_dominio]}</div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={fieldLabel}>Portaria</div>
              <div
                style={{
                  ...fieldValue,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                }}
              >
                {marca.empresa.portaria ?? "—"}
                {marca.empresa.portaria_retificacoes.length > 0 ? (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.55 }}>
                    {marca.empresa.portaria_retificacoes.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Número do Requerimento</div>
              <div style={fieldValue}>{marca.empresa.requerimento_numero ?? "—"}</div>
            </div>
            <div>
              <div style={fieldLabel}>Ano do Requerimento</div>
              <div style={fieldValue}>{marca.empresa.requerimento_ano ?? "—"}</div>
            </div>
          </div>
          {canEditar ? (
            <>
              <p
                style={{
                  margin: "16px 0 0",
                  fontSize: 11,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  lineHeight: 1.45,
                }}
              >
                Ao alterar o domínio, o status volta para Inativo até a próxima validação automática.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => void salvarDominio()}
                  disabled={salvando || !dominioAlterado}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: getCtaCriarGradient(brand),
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    cursor: salvando || !dominioAlterado ? "not-allowed" : "pointer",
                    opacity: salvando || !dominioAlterado ? 0.55 : 1,
                    fontFamily: FONT.body,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {salvando ? (
                    <>
                      <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                      Salvando…
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "licenca" ? (
        <div id="panel-ver-licenca" role="tabpanel" aria-labelledby="tab-ver-licenca">
          <div className="app-table-wrap" style={{ borderRadius: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
              <caption style={{ display: "none" }}>Marcas com a mesma licença</caption>
              <thead>
                <tr>
                  {["Marca", "Status", "Dedicada", "Network"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        padding: "9px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        textAlign: "center",
                        borderBottom: `1px solid ${t.cardBorder}`,
                        background: `color-mix(in srgb, ${t.cardBg} 86%, var(--brand-action, #7c3aed) 14%)`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licencaRows.map((m) => {
                  const ded = produtoStatus(m, "mesa_dedicada");
                  const net = produtoStatus(m, "mesa_network");
                  return (
                    <tr key={m.id}>
                      <td style={{ padding: "9px 12px", textAlign: "center", borderBottom: `1px solid ${t.cardBorder}` }}>
                        <button
                          type="button"
                          onClick={() => onOpenMarca(m)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            font: "inherit",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--brand-accent, #1e36f8)",
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: 2,
                          }}
                        >
                          {m.nome}
                        </button>
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", borderBottom: `1px solid ${t.cardBorder}` }}>
                        <span style={badgePipelineStyle(PIPELINE_COLOR[m.status_pipeline])}>
                          {STATUS_PIPELINE_LABEL[m.status_pipeline]}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", borderBottom: `1px solid ${t.cardBorder}` }}>
                        {ded ? (
                          <span style={badgeProdutoStyle()}>{STATUS_PRODUTO_LABEL[ded]}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "center", borderBottom: `1px solid ${t.cardBorder}` }}>
                        {net ? (
                          <span style={badgeProdutoStyle()}>{STATUS_PRODUTO_LABEL[net]}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "contatos" ? (
        <div id="panel-ver-contatos" role="tabpanel" aria-labelledby="tab-ver-contatos">
          {[...marca.contatos]
            .sort((a, b) => a.ordem - b.ordem)
            .map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  marginBottom: 12,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: FONT_TITLE,
                    color: t.text,
                    marginBottom: 12,
                  }}
                >
                  {c.nome}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <div>
                    <div style={fieldLabel}>Telefones</div>
                    <div style={fieldValue}>{telefonesDisplay(c)}</div>
                  </div>
                  <div>
                    <div style={fieldLabel}>E-mail</div>
                    <div style={fieldValue}>{c.emails.length ? c.emails.join(" · ") : "—"}</div>
                  </div>
                  <div>
                    <div style={fieldLabel}>LinkedIn</div>
                    <div style={fieldValue}>{c.linkedin || "—"}</div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Instagram</div>
                    <div style={fieldValue}>{c.instagram || "—"}</div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Data de Nascimento</div>
                    <div style={fieldValue}>{fmtDataNascimento(c.data_nascimento)}</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </ModalBase>
  );
}
