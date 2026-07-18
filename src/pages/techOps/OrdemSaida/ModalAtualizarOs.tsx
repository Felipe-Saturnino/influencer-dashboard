import { useMemo, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
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
  alterarOrdemSaida,
  cancelarOrdemSaida,
  catalogoComItensDaOs,
  clampQuantidadeOs,
  confirmarRetornoOrdemSaida,
  draftsFromOrdemItens,
  formatCodigoOrdemSaida,
  hojeDataBrOs,
  novaLinhaItemOs,
  opcoesTipoAtualizacaoOs,
  parseDataBrOs,
  subtituloModalOs,
  type ItemDraftOs,
  type OrdemSaidaRow,
  type OsItemDisponivel,
  type OsItemInput,
  type OsModalContexto,
  type OsTipoAtualizacao,
} from "../../../lib/techOpsOrdemSaida";
import {
  BotaoPrimario,
  ErroInline,
  getOsHintStyle,
  getOsInputStyle,
  getOsLabelStyle,
  mascaraDataBrOs,
  OS_FORM_GRID,
} from "./ordemSaidaUi";

type LocalOption = { chave: string; label: string };

const ERRO_OBRIGATORIOS = "Preencha todos os campos obrigatórios.";
const ERRO_MOTIVO = "Informe o motivo do cancelamento.";
const ERRO_DATAS = "Informe datas no formato DD/MM/AAAA.";
const ERRO_RETORNO = "A data de Retorno deve ser maior que a data de Saída.";
const ERRO_PREVISAO = "A data de Previsão de Retorno deve ser maior que a data de Saída.";
const ERRO_ORIGEM_DESTINO = "Não pode ser o mesmo valor da Origem.";
const ERRO_ITENS = "Adicione ao menos um item válido.";
const ERRO_QTD_ESTOQUE =
  "A quantidade não pode ser maior que o disponível no estoque (Itens: Estoque; Jogo: Qtd Atual).";
const ERRO_QTD_INDISPONIVEL =
  "Não há quantidade disponível no estoque para o item ou lote selecionado.";
const ERRO_RETORNO_ITENS = "Confirme o retorno de todos os itens antes de salvar.";
const ERRO_ATUALIZAR =
  "Não foi possível atualizar a ordem. Se o problema persistir, entre em contato com o suporte.";

const TIPO_ATUALIZACAO_LABEL: Record<OsTipoAtualizacao, string> = {
  cancelar: "Cancelar OS",
  confirmar_retorno: "Confirmar Retorno",
  alterar: "Alterar OS",
};

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

type MontarItensResult = { ok: true; itens: OsItemInput[] } | { ok: false; erro: string };

function montarItensInput(drafts: ItemDraftOs[], catalogo: OsItemDisponivel[]): MontarItensResult {
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

/** Editor compacto de itens — mesmo visual de `PainelItensOs` (ModaisOrdemSaida), sem o wrapper de aba. */
function ItensEditorOs({
  drafts,
  setDrafts,
  catalogo,
}: {
  drafts: ItemDraftOs[];
  setDrafts: (fn: (prev: ItemDraftOs[]) => ItemDraftOs[]) => void;
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
            style={{ display: "grid", gridTemplateColumns: "1fr 88px 36px", gap: 10, alignItems: "end" }}
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
                      return { ...row, entidadeKey: key, quantidade: clampQuantidadeOs(base, max) };
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
                    prev.map((row) => (row.key === d.key ? { ...row, quantidade: clampQuantidadeOs(raw, max) } : row)),
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
              onClick={() => setDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== d.key)))}
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
        onClick={() => setDrafts((prev) => [...prev, novaLinhaItemOs()])}
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
  );
}

export function ModalAtualizarOs({
  row,
  contexto,
  userName,
  locaisOptions,
  fornecedores,
  itensDisponiveis,
  onClose,
  onAtualizado,
}: {
  row: OrdemSaidaRow;
  contexto: OsModalContexto;
  userName: string;
  estudioNomePorSlug?: Record<string, string>;
  locaisOptions?: LocalOption[];
  fornecedores?: EstoqueFornecedorRow[];
  itensDisponiveis: OsItemDisponivel[];
  onClose: () => void;
  onAtualizado: () => void;
}) {
  const { theme: t } = useApp();

  const opcoes = useMemo(() => opcoesTipoAtualizacaoOs(contexto, row.status), [contexto, row.status]);
  const [tipo, setTipo] = useState<OsTipoAtualizacao | null>(opcoes[0] ?? null);

  const [motivo, setMotivo] = useState("");

  const [retornoRealizado, setRetornoRealizado] = useState(hojeDataBrOs());
  const [itensConfirmados, setItensConfirmados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(row.itens.map((it) => [it.id, it.retorno_confirmado])),
  );
  const [observacoesRetorno, setObservacoesRetorno] = useState("");

  const [origem, setOrigem] = useState(row.origem_chave ?? "");
  const [destino, setDestino] = useState(row.destino_chave ?? "");
  const [destinoTexto, setDestinoTexto] = useState(row.destino_texto ?? "");
  const [fornecedorId, setFornecedorId] = useState(row.fornecedor_id ?? "");
  const [saida, setSaida] = useState(row.data_saida ? formatDataBrOsInput(row.data_saida) : "");
  const [retorno, setRetorno] = useState(row.data_retorno ? formatDataBrOsInput(row.data_retorno) : "");
  const [semRetorno, setSemRetorno] = useState(row.sem_retorno);
  const catalogoAlterar = useMemo(
    () => catalogoComItensDaOs(itensDisponiveis, row.itens),
    [itensDisponiveis, row.itens],
  );
  const [drafts, setDrafts] = useState<ItemDraftOs[]>(() => draftsFromOrdemItens(row.itens));

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getOsLabelStyle(t);
  const inputStyle = getOsInputStyle(t);
  const codigo = formatCodigoOrdemSaida(row.tipo, row.competencia, row.codigo_num);
  const subtitulo = subtituloModalOs(row);
  const mesmoLocal = row.tipo === "interna" && Boolean(origem && destino && origem === destino);
  const itensLabel = row.tipo === "manutencao" ? "Equipamento" : "Itens";

  async function salvar() {
    if (!tipo) {
      onClose();
      return;
    }

    if (tipo === "cancelar") {
      if (!motivo.trim()) {
        setErr(ERRO_MOTIVO);
        return;
      }
      setErr(null);
      setSaving(true);
      try {
        await cancelarOrdemSaida({ row, motivo, autorNome: userName });
        onAtualizado();
        onClose();
      } catch (e) {
        console.error("Ordem de Saída: falha ao cancelar", e);
        setErr(ERRO_ATUALIZAR);
        setSaving(false);
      }
      return;
    }

    if (tipo === "confirmar_retorno") {
      const todosConfirmados = row.itens.length === 0 || row.itens.every((it) => itensConfirmados[it.id]);
      if (!todosConfirmados) {
        setErr(ERRO_RETORNO_ITENS);
        return;
      }
      const iso = parseDataBrOs(retornoRealizado);
      if (!iso) {
        setErr(ERRO_DATAS);
        return;
      }
      setErr(null);
      setSaving(true);
      try {
        await confirmarRetornoOrdemSaida({
          row,
          dataRetornoRealizada: iso,
          itemIdsConfirmados: row.itens.map((it) => it.id),
          observacoesRetorno,
          autorNome: userName,
        });
        onAtualizado();
        onClose();
      } catch (e) {
        console.error("Ordem de Saída: falha ao confirmar retorno", e);
        setErr(ERRO_ATUALIZAR);
        setSaving(false);
      }
      return;
    }

    // tipo === "alterar"
    if (row.tipo === "interna") {
      if (!origem || !destino || !saida.trim() || (!semRetorno && !retorno.trim())) {
        setErr(ERRO_OBRIGATORIOS);
        return;
      }
      if (mesmoLocal) {
        setErr(ERRO_ORIGEM_DESTINO);
        return;
      }
      const isoSaida = parseDataBrOs(saida);
      if (!isoSaida) {
        setErr(ERRO_DATAS);
        return;
      }
      let isoRetorno: string | null = null;
      if (!semRetorno) {
        isoRetorno = parseDataBrOs(retorno);
        if (!isoRetorno) {
          setErr(ERRO_DATAS);
          return;
        }
        if (isoRetorno <= isoSaida) {
          setErr(ERRO_RETORNO);
          return;
        }
      }
      const montados = montarItensInput(drafts, catalogoAlterar);
      if (!montados.ok) {
        setErr(montados.erro);
        return;
      }
      setErr(null);
      setSaving(true);
      try {
        await alterarOrdemSaida({
          row,
          origem_chave: origem,
          destino_chave: destino,
          data_saida: isoSaida,
          data_retorno: isoRetorno,
          sem_retorno: semRetorno,
          itens: montados.itens,
          autorNome: userName,
        });
        onAtualizado();
        onClose();
      } catch (e) {
        console.error("Ordem de Saída: falha ao alterar (interna)", e);
        setErr(ERRO_ATUALIZAR);
        setSaving(false);
      }
      return;
    }

    if (row.tipo === "externa") {
      if (!destinoTexto.trim() || !saida.trim() || !retorno.trim()) {
        setErr(ERRO_OBRIGATORIOS);
        return;
      }
      const isoSaida = parseDataBrOs(saida);
      const isoRetorno = parseDataBrOs(retorno);
      if (!isoSaida || !isoRetorno) {
        setErr(ERRO_DATAS);
        return;
      }
      if (isoRetorno <= isoSaida) {
        setErr(ERRO_RETORNO);
        return;
      }
      const montados = montarItensInput(drafts, catalogoAlterar);
      if (!montados.ok) {
        setErr(montados.erro);
        return;
      }
      setErr(null);
      setSaving(true);
      try {
        await alterarOrdemSaida({
          row,
          destino_texto: destinoTexto.trim(),
          data_saida: isoSaida,
          data_retorno: isoRetorno,
          itens: montados.itens,
          autorNome: userName,
        });
        onAtualizado();
        onClose();
      } catch (e) {
        console.error("Ordem de Saída: falha ao alterar (externa)", e);
        setErr(ERRO_ATUALIZAR);
        setSaving(false);
      }
      return;
    }

    // row.tipo === "manutencao"
    if (!fornecedorId || !saida.trim() || (!semRetorno && !retorno.trim())) {
      setErr(ERRO_OBRIGATORIOS);
      return;
    }
    const isoSaida = parseDataBrOs(saida);
    if (!isoSaida) {
      setErr(ERRO_DATAS);
      return;
    }
    let isoRetorno: string | null = null;
    if (!semRetorno) {
      isoRetorno = parseDataBrOs(retorno);
      if (!isoRetorno) {
        setErr(ERRO_DATAS);
        return;
      }
      if (isoRetorno <= isoSaida) {
        setErr(ERRO_PREVISAO);
        return;
      }
    }
    const montados = montarItensInput(drafts, catalogoAlterar);
    if (!montados.ok) {
      setErr(montados.erro);
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await alterarOrdemSaida({
        row,
        fornecedor_id: fornecedorId,
        data_saida: isoSaida,
        data_retorno: isoRetorno,
        sem_retorno: semRetorno,
        itens: montados.itens,
        autorNome: userName,
      });
      onAtualizado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao alterar (manutenção)", e);
      setErr(ERRO_ATUALIZAR);
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={620}>
      <ModalHeader title={codigo} onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{subtitulo}</p>
      <ErroInline>{err}</ErroInline>

      <div
        role="tablist"
        aria-label="Atualização da ordem"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ["dados"], () => undefined, (k) => `tab-atualizar-os-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-atualizar-os-dados"
          active
          aria-controls="panel-atualizar-os-dados"
          onClick={() => undefined}
          icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Dados da OS
        </FiltroBarTabButton>
      </div>

      <ModalTabPanel active id="panel-atualizar-os-dados" labelledBy="tab-atualizar-os-dados">
        {opcoes.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Não há atualizações disponíveis para esta ordem.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="os-upd-tipo" style={labelStyle}>
                Tipo de Atualização
                <CampoObrigatorioMark />
              </label>
              <select
                id="os-upd-tipo"
                value={tipo ?? ""}
                onChange={(e) => setTipo(e.target.value as OsTipoAtualizacao)}
                style={inputStyle}
              >
                {opcoes.map((o) => (
                  <option key={o} value={o}>
                    {TIPO_ATUALIZACAO_LABEL[o]}
                  </option>
                ))}
              </select>
            </div>

            {tipo === "cancelar" ? (
              <div>
                <label htmlFor="os-upd-motivo" style={labelStyle}>
                  Motivo do Cancelamento
                  <CampoObrigatorioMark />
                </label>
                <textarea
                  id="os-upd-motivo"
                  rows={4}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento da ordem..."
                  aria-label="Motivo do Cancelamento"
                  style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                />
              </div>
            ) : null}

            {tipo === "confirmar_retorno" ? (
              <>
                <div>
                  <label htmlFor="os-upd-retorno-real" style={labelStyle}>
                    Retorno Realizado
                    <CampoObrigatorioMark />
                  </label>
                  <input
                    id="os-upd-retorno-real"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    autoComplete="off"
                    value={retornoRealizado}
                    onChange={(e) => setRetornoRealizado(mascaraDataBrOs(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    {itensLabel}
                    <CampoObrigatorioMark />
                  </label>
                  {row.itens.length === 0 ? (
                    <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, textAlign: "center", padding: "12px 0" }}>
                      Nenhum item nesta ordem.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {row.itens.map((it) => (
                        <label
                          key={it.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            border: `1px solid ${t.cardBorder}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontFamily: FONT.body,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                            {it.label_snapshot}
                            {it.entidade_tipo !== "equipamento" ? ` (x${it.quantidade})` : ""}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              color: t.textMuted,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(itensConfirmados[it.id])}
                              onChange={(e) =>
                                setItensConfirmados((prev) => ({ ...prev, [it.id]: e.target.checked }))
                              }
                            />
                            Confirmar Retorno
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="os-upd-obs-retorno" style={labelStyle}>
                    Observações do Retorno
                  </label>
                  <textarea
                    id="os-upd-obs-retorno"
                    rows={4}
                    value={observacoesRetorno}
                    onChange={(e) => setObservacoesRetorno(e.target.value)}
                    placeholder="Registre o estado dos itens, avarias, pendências no retorno..."
                    aria-label="Observações do Retorno"
                    style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                  />
                </div>
              </>
            ) : null}

            {tipo === "alterar" && row.tipo === "interna" ? (
              <>
                <div style={OS_FORM_GRID}>
                  <div>
                    <label htmlFor="os-upd-origem" style={labelStyle}>
                      Origem
                      <CampoObrigatorioMark />
                    </label>
                    <select
                      id="os-upd-origem"
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Selecione…</option>
                      {(locaisOptions ?? []).map((l) => (
                        <option key={l.chave} value={l.chave}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="os-upd-saida" style={labelStyle}>
                      Saída
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="os-upd-saida"
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
                    <label htmlFor="os-upd-destino" style={labelStyle}>
                      Destino
                      <CampoObrigatorioMark />
                    </label>
                    <select
                      id="os-upd-destino"
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      style={{ ...inputStyle, borderColor: mesmoLocal ? "#e84025" : t.cardBorder }}
                    >
                      <option value="">Selecione…</option>
                      {(locaisOptions ?? []).map((l) => (
                        <option key={l.chave} value={l.chave}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    {mesmoLocal ? <div style={{ ...getOsHintStyle(t), color: "#e84025" }}>{ERRO_ORIGEM_DESTINO}</div> : null}
                  </div>
                  <div>
                    <label htmlFor="os-upd-retorno" style={labelStyle}>
                      Retorno
                      {!semRetorno ? <CampoObrigatorioMark /> : null}
                    </label>
                    <input
                      id="os-upd-retorno"
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
                <div>
                  <label style={labelStyle}>
                    {itensLabel}
                    <CampoObrigatorioMark />
                  </label>
                  <ItensEditorOs drafts={drafts} setDrafts={setDrafts} catalogo={catalogoAlterar} />
                </div>
              </>
            ) : null}

            {tipo === "alterar" && row.tipo === "externa" ? (
              <>
                <div style={OS_FORM_GRID}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="os-upd-destino-texto" style={labelStyle}>
                      Destino
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="os-upd-destino-texto"
                      type="text"
                      value={destinoTexto}
                      onChange={(e) => setDestinoTexto(e.target.value)}
                      placeholder="Ex.: Evento SiGMA São Paulo, gravação externa..."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="os-upd-prev-saida" style={labelStyle}>
                      Previsão de Saída
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="os-upd-prev-saida"
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
                    <label htmlFor="os-upd-prev-retorno" style={labelStyle}>
                      Previsão de Retorno
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="os-upd-prev-retorno"
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
                <div>
                  <label style={labelStyle}>
                    {itensLabel}
                    <CampoObrigatorioMark />
                  </label>
                  <ItensEditorOs drafts={drafts} setDrafts={setDrafts} catalogo={catalogoAlterar} />
                </div>
              </>
            ) : null}

            {tipo === "alterar" && row.tipo === "manutencao" ? (
              <>
                <div style={OS_FORM_GRID}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="os-upd-fornecedor" style={labelStyle}>
                      Fornecedor
                      <CampoObrigatorioMark />
                    </label>
                    <select
                      id="os-upd-fornecedor"
                      value={fornecedorId}
                      onChange={(e) => setFornecedorId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Selecione…</option>
                      {(fornecedores ?? []).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.razao_social}
                          {f.tipo ? ` — ${f.tipo}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="os-upd-man-saida" style={labelStyle}>
                      Saída
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="os-upd-man-saida"
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
                    <label htmlFor="os-upd-man-retorno" style={labelStyle}>
                      Previsão de Retorno
                      {!semRetorno ? <CampoObrigatorioMark /> : null}
                    </label>
                    <input
                      id="os-upd-man-retorno"
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
                      Sem previsão
                    </label>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    {itensLabel}
                    <CampoObrigatorioMark />
                  </label>
                  <ItensEditorOs drafts={drafts} setDrafts={setDrafts} catalogo={catalogoAlterar} />
                </div>
              </>
            ) : null}
          </div>
        )}
      </ModalTabPanel>

      {opcoes.length > 0 ? (
        <BotaoPrimario onClick={() => void salvar()} loading={saving} loadingLabel="Salvando…">
          Salvar
        </BotaoPrimario>
      ) : null}
    </ModalBase>
  );
}

/** Converte ISO (YYYY-MM-DD) para DD/MM/AAAA para pré-preencher campos editáveis. */
function formatDataBrOsInput(iso: string): string {
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}
