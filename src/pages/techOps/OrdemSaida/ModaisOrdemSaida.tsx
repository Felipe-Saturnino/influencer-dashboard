import { useMemo, useState, type ReactNode } from "react";
import { ClipboardList, ListOrdered, MessageSquareText, Plus, Trash2 } from "lucide-react";
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
import type { EstoqueFornecedorRow } from "../../../lib/techOpsEstoque";
import {
  criarOrdemSaida,
  parseDataBrOs,
  type OrdemSaidaRow,
  clampQuantidadeOs,
  type OsItemDisponivel,
  type OsItemInput,
} from "../../../lib/techOpsOrdemSaida";
import {
  BotaoPrimario,
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
const ERRO_QTD_ESTOQUE =
  "A quantidade não pode ser maior que o disponível no estoque (Itens: Estoque; Jogo: Qtd Atual).";
const ERRO_QTD_INDISPONIVEL =
  "Não há quantidade disponível no estoque para o item ou lote selecionado.";
const ERRO_SOLICITAR =
  "Não foi possível solicitar a ordem. Se o problema persistir, entre em contato com o suporte.";

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

type MontarItensResult =
  | { ok: true; itens: OsItemInput[] }
  | { ok: false; erro: string };

function montarItensInput(drafts: ItemDraft[], catalogo: OsItemDisponivel[]): MontarItensResult {
  const out: OsItemInput[] = [];
  for (const d of drafts) {
    if (!d.entidadeKey) return { ok: false, erro: ERRO_ITENS };
    const parsed = parseEntidadeKey(d.entidadeKey);
    if (!parsed) return { ok: false, erro: ERRO_ITENS };
    const cat = catalogo.find((c) => c.entidade_tipo === parsed.entidade_tipo && c.entidade_id === parsed.entidade_id);
    if (!cat) return { ok: false, erro: ERRO_ITENS };
    if (parsed.entidade_tipo === "equipamento") {
      out.push({
        entidade_tipo: "equipamento",
        entidade_id: parsed.entidade_id,
        quantidade: 1,
        label_snapshot: cat.label,
      });
      continue;
    }
    if (cat.maxQtd < 1) return { ok: false, erro: ERRO_QTD_INDISPONIVEL };
    const qtd = Number.parseInt(d.quantidade.trim(), 10);
    if (!Number.isInteger(qtd) || qtd < 1) return { ok: false, erro: ERRO_ITENS };
    if (qtd > cat.maxQtd) return { ok: false, erro: ERRO_QTD_ESTOQUE };
    out.push({
      entidade_tipo: parsed.entidade_tipo,
      entidade_id: parsed.entidade_id,
      quantidade: qtd,
      label_snapshot: cat.label,
    });
  }
  return out.length ? { ok: true, itens: out } : { ok: false, erro: ERRO_ITENS };
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
                    const selected = p
                      ? catalogo.find((c) => c.entidade_tipo === p.entidade_tipo && c.entidade_id === p.entidade_id)
                      : null;
                    setDrafts((prev) =>
                      prev.map((row) => {
                        if (row.key !== d.key) return row;
                        if (!p || p.entidade_tipo === "equipamento") {
                          return { ...row, entidadeKey: key, quantidade: "1" };
                        }
                        const max = selected?.maxQtd ?? 0;
                        const base = row.quantidade.trim() ? row.quantidade : "1";
                        return {
                          ...row,
                          entidadeKey: key,
                          quantidade: clampQuantidadeOs(base, max),
                        };
                      }),
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
                  min={cat && !isEquip ? (cat.maxQtd < 1 ? 0 : 1) : 1}
                  max={isEquip ? 1 : (cat?.maxQtd ?? undefined)}
                  value={isEquip ? "1" : d.quantidade}
                  disabled={isEquip || !parsed}
                  title={
                    isEquip
                      ? "Equipamentos são únicos — quantidade fixa em 1"
                      : cat
                        ? `Máximo disponível: ${cat.maxQtd}`
                        : "Selecione um item ou lote de jogo"
                  }
                  aria-label="Quantidade"
                  onChange={(e) => {
                    const raw = e.target.value;
                    const max = cat?.maxQtd ?? 0;
                    setDrafts((prev) =>
                      prev.map((row) =>
                        row.key === d.key
                          ? { ...row, quantidade: clampQuantidadeOs(raw, max) }
                          : row,
                      ),
                    );
                  }}
                  style={{ ...inputStyle, opacity: isEquip || !parsed ? 0.65 : 1 }}
                />
                {cat && !isEquip ? (
                  <div style={{ ...getOsHintStyle(t), marginTop: 4 }}>
                    Máx.: {cat.maxQtd}
                    {parsed?.entidade_tipo === "item" ? " (Estoque)" : null}
                    {parsed?.entidade_tipo === "jogo" ? " (Qtd Atual)" : null}
                  </div>
                ) : null}
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
  const { theme: t, user } = useApp();
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
    const montados = montarItensInput(drafts, itensDisponiveis);
    if (!montados.ok) {
      setErr(montados.erro);
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
        solicitante_user_id: user?.id ?? null,
        itens: montados.itens,
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
  const { theme: t, user } = useApp();
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
    const montados = montarItensInput(drafts, itensDisponiveis);
    if (!montados.ok) {
      setErr(montados.erro);
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
        solicitante_user_id: user?.id ?? null,
        itens: montados.itens,
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
  const { theme: t, user } = useApp();
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
    const montados = montarItensInput(drafts, itensDisponiveis);
    if (!montados.ok) {
      setErr(montados.erro);
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
        solicitante_user_id: user?.id ?? null,
        itens: montados.itens,
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

/* ─── Ver / Atualizar O.S. — movidos para arquivos próprios ──────────────── */

export { ModalVerOs } from "./ModalVerOs";
export { ModalAtualizarOs } from "./ModalAtualizarOs";
