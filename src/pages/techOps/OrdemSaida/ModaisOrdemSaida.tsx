import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardList, FileText, History, ListOrdered, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { formatDataHoraEstoque, type EstoqueFornecedorRow } from "../../../lib/techOpsEstoque";
import {
  atualizarStatusOrdemSaida,
  criarOrdemSaida,
  fetchHistoricoOrdemSaida,
  formatCodigoOrdemSaida,
  formatDataBrOs,
  formatSolicitanteOs,
  labelLocalOs,
  labelStatusOrdemSaida,
  OS_STATUS_COLOR,
  OS_STATUS_LABEL,
  parseDataBrOs,
  type OrdemSaidaRow,
  type OrdemSaidaStatus,
  type OsItemDisponivel,
  type OsItemInput,
} from "../../../lib/techOpsOrdemSaida";
import {
  BadgeOs,
  BotaoPrimario,
  CampoLeitura,
  ErroInline,
  getOsHintStyle,
  getOsInputStyle,
  getOsLabelStyle,
  mascaraDataBrOs,
  OS_FORM_GRID,
  previewCodigoOs,
} from "./ordemSaidaUi";

type AbaModalNova = "dados" | "itens" | "obs";
type LocalOption = { chave: string; label: string };

const ERRO_OBRIGATORIOS = "Preencha todos os campos obrigatórios.";
const ERRO_DATAS = "Informe datas no formato DD/MM/AAAA.";
const ERRO_RETORNO = "A data de Retorno deve ser maior que a data de Saída.";
const ERRO_PREVISAO = "A data de Previsão de Retorno deve ser maior que a data de Saída.";
const ERRO_ORIGEM_DESTINO = "Não pode ser o mesmo valor da Origem.";
const ERRO_ITENS = "Adicione ao menos um item válido.";
const ERRO_SOLICITAR =
  "Não foi possível solicitar a ordem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_ATUALIZAR =
  "Não foi possível atualizar a ordem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_CARREGAR =
  "Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.";

type ItemDraft = { key: string; entidadeKey: string; quantidade: string };

function novaLinhaItem(): ItemDraft {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, entidadeKey: "", quantidade: "1" };
}

function parseEntidadeKey(key: string): { entidade_tipo: OsItemDisponivel["entidade_tipo"]; entidade_id: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  const tipo = key.slice(0, i) as OsItemDisponivel["entidade_tipo"];
  if (tipo !== "item" && tipo !== "equipamento" && tipo !== "jogo") return null;
  return { entidade_tipo: tipo, entidade_id: key.slice(i + 1) };
}

function entidadeKeyOf(it: OsItemDisponivel): string {
  return `${it.entidade_tipo}:${it.entidade_id}`;
}

function montarItensInput(drafts: ItemDraft[], catalogo: OsItemDisponivel[]): OsItemInput[] | null {
  const out: OsItemInput[] = [];
  for (const d of drafts) {
    if (!d.entidadeKey) return null;
    const parsed = parseEntidadeKey(d.entidadeKey);
    if (!parsed) return null;
    const cat = catalogo.find((c) => c.entidade_tipo === parsed.entidade_tipo && c.entidade_id === parsed.entidade_id);
    if (!cat) return null;
    const qtd =
      parsed.entidade_tipo === "equipamento" ? 1 : Number.parseInt(d.quantidade.trim(), 10);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > cat.maxQtd) return null;
    out.push({
      entidade_tipo: parsed.entidade_tipo,
      entidade_id: parsed.entidade_id,
      quantidade: qtd,
      label_snapshot: cat.label,
    });
  }
  return out.length ? out : null;
}

function CampoCodigoTravado({ codigo }: { codigo: string }) {
  const { theme: t } = useApp();
  return (
    <div>
      <label style={getOsLabelStyle(t)}>Código</label>
      <input
        type="text"
        value={codigo}
        disabled
        aria-label="Código gerado automaticamente"
        style={{ ...getOsInputStyle(t), opacity: 0.65 }}
      />
    </div>
  );
}

function TabsModalNova({
  aba,
  setAba,
  idPrefix,
}: {
  aba: AbaModalNova;
  setAba: (a: AbaModalNova) => void;
  idPrefix: string;
}) {
  const tabs: { id: AbaModalNova; label: string; icon: ReactNode }[] = [
    { id: "dados", label: "Dados da OS", icon: <ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "itens", label: "Itens da OS", icon: <ListOrdered {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "obs", label: "Observação", icon: <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];
  return (
    <div
      role="tablist"
      aria-label="Abas da nova ordem"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      onKeyDown={(e) =>
        onFiltroBarTabsKeyDown(
          e,
          tabs.map((tb) => tb.id),
          setAba,
          (k) => `tab-${idPrefix}-${k}`,
        )
      }
    >
      {tabs.map((tb) => (
        <FiltroBarTabButton
          key={tb.id}
          id={`tab-${idPrefix}-${tb.id}`}
          active={aba === tb.id}
          aria-controls={`panel-${idPrefix}-${tb.id}`}
          onClick={() => setAba(tb.id)}
          icon={tb.icon}
        >
          {tb.label}
        </FiltroBarTabButton>
      ))}
    </div>
  );
}

function PainelItensOs({
  idPrefix,
  active,
  drafts,
  setDrafts,
  catalogo,
}: {
  idPrefix: string;
  active: boolean;
  drafts: ItemDraft[];
  setDrafts: (fn: (prev: ItemDraft[]) => ItemDraft[]) => void;
  catalogo: OsItemDisponivel[];
}) {
  const { theme: t } = useApp();
  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);

  const grupos = useMemo(() => {
    const itens = catalogo.filter((c) => c.entidade_tipo === "item");
    const equips = catalogo.filter((c) => c.entidade_tipo === "equipamento");
    const jogos = catalogo.filter((c) => c.entidade_tipo === "jogo");
    return { itens, equips, jogos };
  }, [catalogo]);

  return (
    <ModalTabPanel active={active} id={`panel-${idPrefix}-itens`} labelledBy={`tab-${idPrefix}-itens`}>
      <div style={{ display: "grid", gap: 12 }}>
        {drafts.map((d) => {
          const parsed = d.entidadeKey ? parseEntidadeKey(d.entidadeKey) : null;
          const isEquip = parsed?.entidade_tipo === "equipamento";
          const cat = parsed
            ? catalogo.find((c) => c.entidade_tipo === parsed.entidade_tipo && c.entidade_id === parsed.entidade_id)
            : null;
          return (
            <div
              key={d.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 88px 36px",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Item
                  <CampoObrigatorioMark />
                </label>
                <select
                  value={d.entidadeKey}
                  aria-label="Item da ordem"
                  onChange={(e) => {
                    const key = e.target.value;
                    const p = parseEntidadeKey(key);
                    setDrafts((prev) =>
                      prev.map((row) =>
                        row.key === d.key
                          ? {
                              ...row,
                              entidadeKey: key,
                              quantidade: p?.entidade_tipo === "equipamento" ? "1" : row.quantidade || "1",
                            }
                          : row,
                      ),
                    );
                  }}
                  style={inputStyle}
                >
                  <option value="">Selecione…</option>
                  {grupos.itens.length ? (
                    <optgroup label="Itens">
                      {grupos.itens.map((c) => (
                        <option key={entidadeKeyOf(c)} value={entidadeKeyOf(c)}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {grupos.equips.length ? (
                    <optgroup label="Equipamentos">
                      {grupos.equips.map((c) => (
                        <option key={entidadeKeyOf(c)} value={entidadeKeyOf(c)}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {grupos.jogos.length ? (
                    <optgroup label="Jogo">
                      {grupos.jogos.map((c) => (
                        <option key={entidadeKeyOf(c)} value={entidadeKeyOf(c)}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Qtd
                  <CampoObrigatorioMark />
                </label>
                <input
                  type="number"
                  min={1}
                  max={cat?.maxQtd ?? undefined}
                  value={isEquip ? "1" : d.quantidade}
                  disabled={isEquip}
                  title={isEquip ? "Equipamentos são únicos — quantidade fixa em 1" : undefined}
                  aria-label="Quantidade"
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((row) => (row.key === d.key ? { ...row, quantidade: e.target.value } : row)),
                    )
                  }
                  style={{ ...inputStyle, opacity: isEquip ? 0.65 : 1 }}
                />
              </div>
              <button
                type="button"
                aria-label="Remover item"
                title="Remover item"
                onClick={() =>
                  setDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== d.key)))
                }
                style={{
                  width: 36,
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid rgba(232,64,37,0.35)",
                  background: "transparent",
                  color: "#e84025",
                  cursor: drafts.length <= 1 ? "not-allowed" : "pointer",
                  opacity: drafts.length <= 1 ? 0.4 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, novaLinhaItem()])}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px dashed color-mix(in srgb, var(--brand-primary, #7c3aed) 40%, transparent)",
            background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 6%, transparent)",
            color: "var(--brand-primary, #7c3aed)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT.body,
            width: "fit-content",
          }}
        >
          <Plus size={14} aria-hidden />
          Adicionar item
        </button>
      </div>
    </ModalTabPanel>
  );
}

function PainelObsOs({
  idPrefix,
  active,
  observacao,
  setObservacao,
  placeholder,
}: {
  idPrefix: string;
  active: boolean;
  observacao: string;
  setObservacao: (v: string) => void;
  placeholder: string;
}) {
  const { theme: t } = useApp();
  return (
    <ModalTabPanel active={active} id={`panel-${idPrefix}-obs`} labelledBy={`tab-${idPrefix}-obs`}>
      <label style={getOsLabelStyle(t)}>
        Observação
        <CampoObrigatorioMark />
      </label>
      <textarea
        rows={6}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder={placeholder}
        aria-label="Observação"
        style={{ ...getOsInputStyle(t), resize: "vertical", minHeight: 120 }}
      />
    </ModalTabPanel>
  );
}

/* ─── Nova O.S. Interna ───────────────────────────────────────────────────── */

export function ModalNovaOsInterna({
  rows,
  locaisOptions,
  itensDisponiveis,
  competenciaPreview,
  userName,
  onClose,
  onCriado,
}: {
  rows: OrdemSaidaRow[];
  locaisOptions: LocalOption[];
  itensDisponiveis: OsItemDisponivel[];
  competenciaPreview: string;
  userName: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaModalNova>("dados");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [saida, setSaida] = useState("");
  const [retorno, setRetorno] = useState("");
  const [semRetorno, setSemRetorno] = useState(false);
  const [drafts, setDrafts] = useState<ItemDraft[]>([novaLinhaItem()]);
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);
  const codigo = previewCodigoOs("interna", rows, competenciaPreview);
  const mesmoLocal = Boolean(origem && destino && origem === destino);

  async function solicitar() {
    if (!origem || !destino || !saida.trim() || !observacao.trim() || (!semRetorno && !retorno.trim())) {
      setErr(ERRO_OBRIGATORIOS);
      setAba(!origem || !destino || !saida.trim() || (!semRetorno && !retorno.trim()) ? "dados" : "obs");
      return;
    }
    if (mesmoLocal) {
      setErr(ERRO_ORIGEM_DESTINO);
      setAba("dados");
      return;
    }
    const isoSaida = parseDataBrOs(saida);
    if (!isoSaida) {
      setErr(ERRO_DATAS);
      setAba("dados");
      return;
    }
    let isoRetorno: string | null = null;
    if (!semRetorno) {
      isoRetorno = parseDataBrOs(retorno);
      if (!isoRetorno) {
        setErr(ERRO_DATAS);
        setAba("dados");
        return;
      }
      if (isoRetorno <= isoSaida) {
        setErr(ERRO_RETORNO);
        setAba("dados");
        return;
      }
    }
    const itens = montarItensInput(drafts, itensDisponiveis);
    if (!itens) {
      setErr(ERRO_ITENS);
      setAba("itens");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await criarOrdemSaida({
        tipo: "interna",
        origem_chave: origem,
        destino_chave: destino,
        data_saida: isoSaida,
        data_retorno: isoRetorno,
        sem_retorno: semRetorno,
        observacao,
        solicitante_nome: userName,
        itens,
        autorNome: userName,
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao solicitar interna", e);
      setErr(ERRO_SOLICITAR);
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Nova O.S. Interna" onClose={onClose} />
      <ErroInline>{err}</ErroInline>
      <TabsModalNova aba={aba} setAba={setAba} idPrefix="nova-int" />

      <ModalTabPanel active={aba === "dados"} id="panel-nova-int-dados" labelledBy="tab-nova-int-dados">
        <div style={OS_FORM_GRID}>
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoCodigoTravado codigo={codigo} />
          </div>
          <div>
            <label htmlFor="os-int-origem" style={labelStyle}>
              Origem
              <CampoObrigatorioMark />
            </label>
            <select id="os-int-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} style={inputStyle}>
              <option value="">Selecione…</option>
              {locaisOptions.map((l) => (
                <option key={l.chave} value={l.chave}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="os-int-saida" style={labelStyle}>
              Saída
              <CampoObrigatorioMark />
            </label>
            <input
              id="os-int-saida"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={saida}
              onChange={(e) => setSaida(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="os-int-destino" style={labelStyle}>
              Destino
              <CampoObrigatorioMark />
            </label>
            <select
              id="os-int-destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: mesmoLocal ? "#e84025" : t.cardBorder,
              }}
            >
              <option value="">Selecione…</option>
              {locaisOptions.map((l) => (
                <option key={l.chave} value={l.chave}>
                  {l.label}
                </option>
              ))}
            </select>
            {mesmoLocal ? <div style={{ ...getOsHintStyle(t), color: "#e84025" }}>{ERRO_ORIGEM_DESTINO}</div> : null}
          </div>
          <div>
            <label htmlFor="os-int-retorno" style={labelStyle}>
              Retorno
              {!semRetorno ? <CampoObrigatorioMark /> : null}
            </label>
            <input
              id="os-int-retorno"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={retorno}
              disabled={semRetorno}
              onChange={(e) => setRetorno(mascaraDataBrOs(e.target.value))}
              style={{ ...inputStyle, opacity: semRetorno ? 0.65 : 1 }}
            />
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                fontSize: 12,
                fontWeight: 500,
                color: t.textMuted,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              <input
                type="checkbox"
                checked={semRetorno}
                onChange={(e) => {
                  setSemRetorno(e.target.checked);
                  if (e.target.checked) setRetorno("");
                }}
              />
              Sem retorno
            </label>
          </div>
        </div>
      </ModalTabPanel>

      <PainelItensOs
        idPrefix="nova-int"
        active={aba === "itens"}
        drafts={drafts}
        setDrafts={setDrafts}
        catalogo={itensDisponiveis}
      />
      <PainelObsOs
        idPrefix="nova-int"
        active={aba === "obs"}
        observacao={observacao}
        setObservacao={setObservacao}
        placeholder="Descreva o motivo da movimentação, cuidados no transporte, ponto de contato no destino..."
      />

      <BotaoPrimario onClick={() => void solicitar()} loading={saving} loadingLabel="Solicitando…">
        Solicitar
      </BotaoPrimario>
    </ModalBase>
  );
}

/* ─── Nova O.S. Externa ───────────────────────────────────────────────────── */

export function ModalNovaOsExterna({
  rows,
  itensDisponiveis,
  competenciaPreview,
  userName,
  onClose,
  onCriado,
}: {
  rows: OrdemSaidaRow[];
  itensDisponiveis: OsItemDisponivel[];
  competenciaPreview: string;
  userName: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaModalNova>("dados");
  const [destinoTexto, setDestinoTexto] = useState("");
  const [saida, setSaida] = useState("");
  const [retorno, setRetorno] = useState("");
  const [drafts, setDrafts] = useState<ItemDraft[]>([novaLinhaItem()]);
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);
  const codigo = previewCodigoOs("externa", rows, competenciaPreview);

  async function solicitar() {
    if (!destinoTexto.trim() || !saida.trim() || !retorno.trim() || !observacao.trim()) {
      setErr(ERRO_OBRIGATORIOS);
      setAba(!destinoTexto.trim() || !saida.trim() || !retorno.trim() ? "dados" : "obs");
      return;
    }
    const isoSaida = parseDataBrOs(saida);
    const isoRetorno = parseDataBrOs(retorno);
    if (!isoSaida || !isoRetorno) {
      setErr(ERRO_DATAS);
      setAba("dados");
      return;
    }
    if (isoRetorno <= isoSaida) {
      setErr(ERRO_RETORNO);
      setAba("dados");
      return;
    }
    const itens = montarItensInput(drafts, itensDisponiveis);
    if (!itens) {
      setErr(ERRO_ITENS);
      setAba("itens");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await criarOrdemSaida({
        tipo: "externa",
        destino_texto: destinoTexto.trim(),
        data_saida: isoSaida,
        data_retorno: isoRetorno,
        observacao,
        solicitante_nome: userName,
        itens,
        autorNome: userName,
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao solicitar externa", e);
      setErr(ERRO_SOLICITAR);
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Nova O.S. Externa" onClose={onClose} />
      <ErroInline>{err}</ErroInline>
      <TabsModalNova aba={aba} setAba={setAba} idPrefix="nova-ext" />

      <ModalTabPanel active={aba === "dados"} id="panel-nova-ext-dados" labelledBy="tab-nova-ext-dados">
        <div style={OS_FORM_GRID}>
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoCodigoTravado codigo={codigo} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="os-ext-destino" style={labelStyle}>
              Destino
              <CampoObrigatorioMark />
            </label>
            <input
              id="os-ext-destino"
              type="text"
              value={destinoTexto}
              onChange={(e) => setDestinoTexto(e.target.value)}
              placeholder="Ex.: Evento SiGMA São Paulo, gravação externa..."
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="os-ext-saida" style={labelStyle}>
              Saída
              <CampoObrigatorioMark />
            </label>
            <input
              id="os-ext-saida"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={saida}
              onChange={(e) => setSaida(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="os-ext-retorno" style={labelStyle}>
              Retorno
              <CampoObrigatorioMark />
            </label>
            <input
              id="os-ext-retorno"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={retorno}
              onChange={(e) => setRetorno(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
      </ModalTabPanel>

      <PainelItensOs
        idPrefix="nova-ext"
        active={aba === "itens"}
        drafts={drafts}
        setDrafts={setDrafts}
        catalogo={itensDisponiveis}
      />
      <PainelObsOs
        idPrefix="nova-ext"
        active={aba === "obs"}
        observacao={observacao}
        setObservacao={setObservacao}
        placeholder="Descreva a finalidade da saída externa, endereço, responsável no local..."
      />

      <BotaoPrimario onClick={() => void solicitar()} loading={saving} loadingLabel="Solicitando…">
        Solicitar
      </BotaoPrimario>
    </ModalBase>
  );
}

/* ─── Nova O.S. Manutenção ────────────────────────────────────────────────── */

export function ModalNovaOsManutencao({
  rows,
  fornecedores,
  itensDisponiveis,
  competenciaPreview,
  userName,
  onClose,
  onCriado,
}: {
  rows: OrdemSaidaRow[];
  fornecedores: EstoqueFornecedorRow[];
  itensDisponiveis: OsItemDisponivel[];
  competenciaPreview: string;
  userName: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaModalNova>("dados");
  const [fornecedorId, setFornecedorId] = useState("");
  const [saida, setSaida] = useState("");
  const [retorno, setRetorno] = useState("");
  const [semPrevisao, setSemPrevisao] = useState(false);
  const [drafts, setDrafts] = useState<ItemDraft[]>([novaLinhaItem()]);
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);
  const codigo = previewCodigoOs("manutencao", rows, competenciaPreview);

  async function solicitar() {
    if (!fornecedorId || !saida.trim() || !observacao.trim() || (!semPrevisao && !retorno.trim())) {
      setErr(ERRO_OBRIGATORIOS);
      setAba(!fornecedorId || !saida.trim() || (!semPrevisao && !retorno.trim()) ? "dados" : "obs");
      return;
    }
    const isoSaida = parseDataBrOs(saida);
    if (!isoSaida) {
      setErr(ERRO_DATAS);
      setAba("dados");
      return;
    }
    let isoRetorno: string | null = null;
    if (!semPrevisao) {
      isoRetorno = parseDataBrOs(retorno);
      if (!isoRetorno) {
        setErr(ERRO_DATAS);
        setAba("dados");
        return;
      }
      if (isoRetorno <= isoSaida) {
        setErr(ERRO_PREVISAO);
        setAba("dados");
        return;
      }
    }
    const itens = montarItensInput(drafts, itensDisponiveis);
    if (!itens) {
      setErr(ERRO_ITENS);
      setAba("itens");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await criarOrdemSaida({
        tipo: "manutencao",
        fornecedor_id: fornecedorId,
        data_saida: isoSaida,
        data_retorno: isoRetorno,
        sem_retorno: semPrevisao,
        observacao,
        solicitante_nome: userName,
        itens,
        autorNome: userName,
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao solicitar manutenção", e);
      setErr(ERRO_SOLICITAR);
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Nova O.S. Manutenção" onClose={onClose} />
      <ErroInline>{err}</ErroInline>
      <TabsModalNova aba={aba} setAba={setAba} idPrefix="nova-man" />

      <ModalTabPanel active={aba === "dados"} id="panel-nova-man-dados" labelledBy="tab-nova-man-dados">
        <div style={OS_FORM_GRID}>
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoCodigoTravado codigo={codigo} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="os-man-forn" style={labelStyle}>
              Fornecedor
              <CampoObrigatorioMark />
            </label>
            <select
              id="os-man-forn"
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razao_social}
                  {f.tipo ? ` — ${f.tipo}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="os-man-saida" style={labelStyle}>
              Saída
              <CampoObrigatorioMark />
            </label>
            <input
              id="os-man-saida"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={saida}
              onChange={(e) => setSaida(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="os-man-retorno" style={labelStyle}>
              Previsão de Retorno
              {!semPrevisao ? <CampoObrigatorioMark /> : null}
            </label>
            <input
              id="os-man-retorno"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={retorno}
              disabled={semPrevisao}
              onChange={(e) => setRetorno(mascaraDataBrOs(e.target.value))}
              style={{ ...inputStyle, opacity: semPrevisao ? 0.65 : 1 }}
            />
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                fontSize: 12,
                fontWeight: 500,
                color: t.textMuted,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              <input
                type="checkbox"
                checked={semPrevisao}
                onChange={(e) => {
                  setSemPrevisao(e.target.checked);
                  if (e.target.checked) setRetorno("");
                }}
              />
              Sem previsão
            </label>
          </div>
        </div>
      </ModalTabPanel>

      <PainelItensOs
        idPrefix="nova-man"
        active={aba === "itens"}
        drafts={drafts}
        setDrafts={setDrafts}
        catalogo={itensDisponiveis}
      />
      <PainelObsOs
        idPrefix="nova-man"
        active={aba === "obs"}
        observacao={observacao}
        setObservacao={setObservacao}
        placeholder="Descreva o defeito, o serviço solicitado ao fornecedor, número de orçamento..."
      />

      <BotaoPrimario onClick={() => void solicitar()} loading={saving} loadingLabel="Solicitando…">
        Solicitar
      </BotaoPrimario>
    </ModalBase>
  );
}

/* ─── Ver O.S. ────────────────────────────────────────────────────────────── */

type AbaVer = "dados" | "itens" | "historico";

export function ModalVerOs({
  row,
  estudioNomePorSlug,
  onClose,
}: {
  row: OrdemSaidaRow;
  estudioNomePorSlug: Record<string, string>;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaVer>("dados");
  const [historico, setHistorico] = useState<
    { id: string; acao: string; detalhe: string | null; autor_nome: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const hi = await fetchHistoricoOrdemSaida(row.id);
        if (!cancel) setHistorico(hi);
      } catch (e) {
        console.error("Ordem de Saída: falha ao carregar histórico", e);
        if (!cancel) setErro(ERRO_CARREGAR);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [row.id]);

  const codigo = formatCodigoOrdemSaida(row.tipo, row.competencia, row.codigo_num);
  const tabs: { id: AbaVer; label: string; icon: ReactNode }[] = [
    { id: "dados", label: "Dados da OS", icon: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "itens", label: "Itens", icon: <ListOrdered {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "historico", label: "Histórico", icon: <History {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  const retornoLabel =
    row.tipo === "manutencao"
      ? row.sem_retorno
        ? "Sem previsão"
        : formatDataBrOs(row.data_retorno)
      : row.sem_retorno
        ? "Sem retorno"
        : formatDataBrOs(row.data_retorno);

  const cardItemStyle = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    fontFamily: FONT.body,
  } as const;

  return (
    <ModalBase onClose={onClose} maxWidth={620}>
      <ModalHeader title="Ver O.S." onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{codigo}</p>

      <div
        role="tablist"
        aria-label="Detalhes da ordem"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-ver-os-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-ver-os-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-ver-os-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel active={aba === "dados"} id="panel-ver-os-dados" labelledBy="tab-ver-os-dados">
        <div style={OS_FORM_GRID}>
          <CampoLeitura label="Código" valor={codigo} />
          <CampoLeitura
            label="Status"
            valor={
              <BadgeOs
                label={labelStatusOrdemSaida(row.status, row.tipo)}
                cor={OS_STATUS_COLOR[row.status]}
              />
            }
          />
          {row.tipo === "interna" ? (
            <>
              <CampoLeitura label="Origem" valor={labelLocalOs(row.origem_chave, estudioNomePorSlug)} />
              <CampoLeitura label="Destino" valor={labelLocalOs(row.destino_chave, estudioNomePorSlug)} />
            </>
          ) : null}
          {row.tipo === "externa" ? (
            <CampoLeitura label="Destino" valor={row.destino_texto || "—"} />
          ) : null}
          {row.tipo === "manutencao" ? (
            <CampoLeitura label="Fornecedor" valor={row.fornecedor_razao_social || "—"} />
          ) : null}
          <CampoLeitura label="Saída" valor={formatDataBrOs(row.data_saida)} />
          <CampoLeitura
            label={row.tipo === "manutencao" ? "Previsão de Retorno" : "Retorno"}
            valor={retornoLabel}
          />
          <CampoLeitura label="Saída realizada" valor={formatDataBrOs(row.data_saida_realizada)} />
          <CampoLeitura label="Retorno realizado" valor={formatDataBrOs(row.data_retorno_realizada)} />
          <CampoLeitura
            label="Solicitante"
            valor={formatSolicitanteOs(row.solicitante_nome, row.solicitante_time)}
          />
          <CampoLeitura label="Responsável" valor={row.responsavel_nome || "—"} />
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoLeitura label="Observação" valor={row.observacao || "—"} />
          </div>
        </div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "itens"} id="panel-ver-os-itens" labelledBy="tab-ver-os-itens">
        {row.itens.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, textAlign: "center", padding: "20px 0" }}>
            Nenhum item nesta ordem.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {row.itens.map((it) => (
              <div key={it.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{it.label_snapshot}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                  Quantidade: {it.quantidade}
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "historico"} id="panel-ver-os-historico" labelledBy="tab-ver-os-historico">
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
        ) : historico.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Nenhuma ação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {historico.map((h) => (
              <div key={h.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>{h.acao}</div>
                {h.detalhe ? (
                  <div style={{ fontSize: 12, color: t.textMuted, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {h.detalhe}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{h.autor_nome || "—"}</span>
                  <span>{formatDataHoraEstoque(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>
    </ModalBase>
  );
}

/* ─── Atualizar O.S. ──────────────────────────────────────────────────────── */

function statusOpcoesPara(atual: OrdemSaidaStatus): OrdemSaidaStatus[] {
  if (atual === "solicitada") return ["solicitada", "aberta", "cancelada"];
  if (atual === "aberta") return ["aberta", "concluida", "cancelada"];
  return [atual];
}

export function ModalAtualizarOs({
  row,
  userName,
  onClose,
  onAtualizado,
}: {
  row: OrdemSaidaRow;
  userName: string;
  onClose: () => void;
  onAtualizado: () => void;
}) {
  const { theme: t } = useApp();
  const [status, setStatus] = useState<OrdemSaidaStatus>(row.status);
  const [saidaReal, setSaidaReal] = useState(
    row.data_saida_realizada ? formatDataBrOs(row.data_saida_realizada) : "",
  );
  const [retornoReal, setRetornoReal] = useState(
    row.data_retorno_realizada ? formatDataBrOs(row.data_retorno_realizada) : "",
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);
  const codigo = formatCodigoOrdemSaida(row.tipo, row.competencia, row.codigo_num);
  const opcoes = statusOpcoesPara(row.status);

  async function salvar() {
    if (status === row.status && !saidaReal.trim() && !retornoReal.trim()) {
      onClose();
      return;
    }
    let isoSaida: string | null | undefined;
    let isoRetorno: string | null | undefined;
    if (status === "aberta" || status === "concluida") {
      if (saidaReal.trim()) {
        isoSaida = parseDataBrOs(saidaReal);
        if (!isoSaida) {
          setErr(ERRO_DATAS);
          return;
        }
      } else if (status === "aberta" && !row.data_saida_realizada) {
        isoSaida = row.data_saida;
      }
    }
    if (status === "concluida") {
      if (retornoReal.trim()) {
        isoRetorno = parseDataBrOs(retornoReal);
        if (!isoRetorno) {
          setErr(ERRO_DATAS);
          return;
        }
      }
    }
    setErr(null);
    setSaving(true);
    try {
      await atualizarStatusOrdemSaida({
        row,
        status,
        data_saida_realizada: isoSaida,
        data_retorno_realizada: isoRetorno,
        autorNome: userName,
      });
      onAtualizado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao atualizar status", e);
      setErr(ERRO_ATUALIZAR);
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Atualizar O.S." onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{codigo}</p>
      <ErroInline>{err}</ErroInline>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label htmlFor="os-upd-status" style={labelStyle}>
            Status
            <CampoObrigatorioMark />
          </label>
          <select
            id="os-upd-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrdemSaidaStatus)}
            style={inputStyle}
          >
            {opcoes.map((s) => (
              <option key={s} value={s}>
                {labelStatusOrdemSaida(s, row.tipo)}
              </option>
            ))}
          </select>
          <div style={getOsHintStyle(t)}>
            Fluxo: {OS_STATUS_LABEL.solicitada} → {OS_STATUS_LABEL.aberta} → {OS_STATUS_LABEL.concluida} /{" "}
            {OS_STATUS_LABEL.cancelada}
          </div>
        </div>
        {(status === "aberta" || status === "concluida") && (
          <div>
            <label htmlFor="os-upd-saida-real" style={labelStyle}>
              Data de saída realizada
            </label>
            <input
              id="os-upd-saida-real"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={saidaReal === "—" ? "" : saidaReal}
              onChange={(e) => setSaidaReal(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}
        {status === "concluida" && (
          <div>
            <label htmlFor="os-upd-retorno-real" style={labelStyle}>
              Data de retorno realizada
            </label>
            <input
              id="os-upd-retorno-real"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              autoComplete="off"
              value={retornoReal === "—" ? "" : retornoReal}
              onChange={(e) => setRetornoReal(mascaraDataBrOs(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}
      </div>
      <BotaoPrimario onClick={() => void salvar()} loading={saving} loadingLabel="Salvando…">
        Salvar
      </BotaoPrimario>
    </ModalBase>
  );
}
