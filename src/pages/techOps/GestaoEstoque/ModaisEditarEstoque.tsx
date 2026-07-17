import { useState, type ReactNode } from "react";
import { MessageSquareText, Plus, SlidersHorizontal } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import {
  codigoEstoqueEquipamento,
  codigoEstoqueItem,
  codigoEstoqueJogoLote,
  ESTOQUE_EQUIP_CATEGORIAS,
  ESTOQUE_EQUIP_CATEGORIA_LABEL,
  ESTOQUE_ITEM_CATEGORIAS,
  ESTOQUE_ITEM_CATEGORIA_LABEL,
  ESTOQUE_JOGO_CATEGORIAS,
  ESTOQUE_JOGO_CATEGORIA_LABEL,
  formatCnpjEstoque,
  registrarAnotacaoEstoque,
  registrarHistoricoEstoque,
  uploadAnexoAnotacaoEstoque,
  type EstoqueEntidadeTipo,
  type EstoqueEquipamentoRow,
  type EstoqueFornecedorRow,
  type EstoqueItemRow,
  type EstoqueJogoLoteRow,
} from "../../../lib/techOpsEstoque";
import {
  BotaoPrimarioModalEstoque,
  ErroInlineEstoque,
  ESTOQUE_FORM_GRID,
  getEstoqueHintStyle,
  getEstoqueInputStyle,
  getEstoqueLabelStyle,
  parseValorEstoque,
} from "./estoqueUi";

const ERRO_NADA_A_SALVAR =
  "Selecione um tipo de alteração ou escreva uma anotação antes de salvar.";
const ERRO_ANEXO_SEM_TEXTO = "Para enviar um anexo, escreva o texto da anotação.";
const ERRO_VALOR = "Informe um valor numérico válido.";
const ERRO_QUANTIDADE = "Informe uma quantidade válida (número inteiro ≥ 0).";

function erroSalvar(entidade: string): string {
  return `Não foi possível salvar as alterações de ${entidade}. Se o problema persistir, entre em contato com o suporte.`;
}

function parseQtd(texto: string): number | null {
  const n = Number(texto.trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/* ─── Aba Anotações (form) — estado no modal pai ──────────────────────────── */

type AnotacaoDraft = { texto: string; arquivo: File | null };

function PainelAnotacaoForm({
  draft,
  onChange,
  idPrefix,
}: {
  draft: AnotacaoDraft;
  onChange: (patch: Partial<AnotacaoDraft>) => void;
  idPrefix: string;
}) {
  const { theme: t } = useApp();
  const labelStyle = getEstoqueLabelStyle(t);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <label htmlFor={`${idPrefix}-anotacao-texto`} style={labelStyle}>
          Anotação
          <CampoObrigatorioMark />
        </label>
        <textarea
          id={`${idPrefix}-anotacao-texto`}
          value={draft.texto}
          onChange={(e) => onChange({ texto: e.target.value })}
          rows={5}
          style={{ ...getEstoqueInputStyle(t), resize: "vertical" }}
        />
        <div style={getEstoqueHintStyle(t)}>
          A anotação fica registrada no histórico do registro com autor e data.
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-anotacao-anexo`} style={labelStyle}>
          Anexo
        </label>
        <input
          id={`${idPrefix}-anotacao-anexo`}
          type="file"
          onChange={(e) => onChange({ arquivo: e.target.files?.[0] ?? null })}
          style={{ ...getEstoqueInputStyle(t), padding: "8px 12px" }}
        />
      </div>
    </div>
  );
}

async function salvarAnotacaoSePreenchida(params: {
  entidadeTipo: EstoqueEntidadeTipo;
  entidadeId: string;
  draft: AnotacaoDraft;
  autorNome: string;
}): Promise<boolean> {
  const texto = params.draft.texto.trim();
  if (!texto) return false;
  let anexoUrl: string | null = null;
  if (params.draft.arquivo) {
    anexoUrl = await uploadAnexoAnotacaoEstoque(params.draft.arquivo);
  }
  await registrarAnotacaoEstoque({
    entidadeTipo: params.entidadeTipo,
    entidadeId: params.entidadeId,
    texto,
    anexoUrl,
    autorNome: params.autorNome,
  });
  await registrarHistoricoEstoque({
    entidadeTipo: params.entidadeTipo,
    entidadeId: params.entidadeId,
    acao: "Anotação registrada",
    autorNome: params.autorNome,
  });
  return true;
}

/* ─── Shell partilhado (header + tablist Alterações / Anotações) ──────────── */

function ModalEditarShell({
  titulo,
  subtitulo,
  idPrefix,
  aba,
  setAba,
  err,
  alteracoes,
  anotacoes,
  onSalvar,
  saving,
  onClose,
  maxWidth = 560,
}: {
  titulo: string;
  subtitulo: string;
  idPrefix: string;
  aba: "alteracoes" | "anotacoes";
  setAba: (a: "alteracoes" | "anotacoes") => void;
  err: string | null;
  alteracoes: ReactNode;
  anotacoes: ReactNode;
  onSalvar: () => void;
  saving: boolean;
  onClose: () => void;
  maxWidth?: number;
}) {
  const { theme: t } = useApp();
  const tabs: { id: "alteracoes" | "anotacoes"; label: string; icon: ReactNode }[] = [
    { id: "alteracoes", label: "Alterações", icon: <SlidersHorizontal {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "anotacoes", label: "Anotações", icon: <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];
  return (
    <ModalBase onClose={onClose} maxWidth={maxWidth}>
      <ModalHeader title={titulo} onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{subtitulo}</p>
      <ErroInlineEstoque>{err}</ErroInlineEstoque>
      <div
        role="tablist"
        aria-label={`Editar — ${titulo}`}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `${idPrefix}-tab-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`${idPrefix}-tab-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`${idPrefix}-panel-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>
      <ModalTabPanel active={aba === "alteracoes"} id={`${idPrefix}-panel-alteracoes`} labelledBy={`${idPrefix}-tab-alteracoes`}>
        {alteracoes}
      </ModalTabPanel>
      <ModalTabPanel active={aba === "anotacoes"} id={`${idPrefix}-panel-anotacoes`} labelledBy={`${idPrefix}-tab-anotacoes`}>
        {anotacoes}
      </ModalTabPanel>
      <BotaoPrimarioModalEstoque onClick={onSalvar} loading={saving}>
        Salvar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}

/* ─── Editar Item ─────────────────────────────────────────────────────────── */

type TipoAlteracaoItem = "" | "novas_unidades" | "alteracao_valor" | "alteracao_cadastral";

export function ModalEditarItemEstoque({
  row,
  onClose,
  onSalvo,
}: {
  row: EstoqueItemRow;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"alteracoes" | "anotacoes">("alteracoes");
  const [tipo, setTipo] = useState<TipoAlteracaoItem>("");
  const [quantidade, setQuantidade] = useState(String(row.quantidade_total));
  const [valorUnitario, setValorUnitario] = useState(String(row.valor_unitario).replace(".", ","));
  const [nome, setNome] = useState(row.nome);
  const [categoria, setCategoria] = useState<string>(row.categoria);
  const [marca, setMarca] = useState(row.marca);
  const [modelo, setModelo] = useState(row.modelo);
  const [anotacao, setAnotacao] = useState<AnotacaoDraft>({ texto: "", arquivo: null });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);
  const autorNome = user?.name ?? "";

  async function salvar() {
    const temAnotacao = anotacao.texto.trim().length > 0;
    if (!tipo && !temAnotacao) {
      setErr(anotacao.arquivo ? ERRO_ANEXO_SEM_TEXTO : ERRO_NADA_A_SALVAR);
      return;
    }
    if (anotacao.arquivo && !temAnotacao) {
      setErr(ERRO_ANEXO_SEM_TEXTO);
      return;
    }

    let payload: Record<string, unknown> | null = null;
    let acao = "";
    let detalhe = "";

    if (tipo === "novas_unidades") {
      const qtd = parseQtd(quantidade);
      if (qtd == null) {
        setErr(ERRO_QUANTIDADE);
        return;
      }
      payload = { quantidade_total: qtd };
      acao = "Novas Unidades";
      detalhe = `Quantidade total: ${row.quantidade_total} → ${qtd}`;
    } else if (tipo === "alteracao_valor") {
      const v = parseValorEstoque(valorUnitario);
      if (v == null) {
        setErr(ERRO_VALOR);
        return;
      }
      payload = { valor_unitario: v };
      acao = "Alteração de Valor";
      detalhe = `Valor unitário: ${fmtBRL(row.valor_unitario)} → ${fmtBRL(v)}`;
    } else if (tipo === "alteracao_cadastral") {
      if (!nome.trim() || !categoria || !marca.trim() || !modelo.trim()) {
        setErr("Preencha todos os campos da alteração cadastral.");
        return;
      }
      payload = { nome: nome.trim(), categoria, marca: marca.trim(), modelo: modelo.trim() };
      acao = "Alteração Cadastral";
      const mudancas: string[] = [];
      if (nome.trim() !== row.nome) mudancas.push(`Nome: ${row.nome} → ${nome.trim()}`);
      if (categoria !== row.categoria)
        mudancas.push(
          `Categoria: ${ESTOQUE_ITEM_CATEGORIA_LABEL[row.categoria]} → ${ESTOQUE_ITEM_CATEGORIA_LABEL[categoria as EstoqueItemRow["categoria"]]}`,
        );
      if (marca.trim() !== row.marca) mudancas.push(`Marca: ${row.marca} → ${marca.trim()}`);
      if (modelo.trim() !== row.modelo) mudancas.push(`Modelo: ${row.modelo} → ${modelo.trim()}`);
      detalhe = mudancas.join("\n");
    }

    setErr(null);
    setSaving(true);
    try {
      if (payload) {
        const { error } = await supabase.from("tech_ops_estoque_itens").update(payload).eq("id", row.id);
        if (error) throw error;
        await registrarHistoricoEstoque({
          entidadeTipo: "item",
          entidadeId: row.id,
          acao,
          detalhe: detalhe || null,
          autorNome,
        });
      }
      await salvarAnotacaoSePreenchida({ entidadeTipo: "item", entidadeId: row.id, draft: anotacao, autorNome });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao editar item", e);
      setErr(erroSalvar("do item"));
      setSaving(false);
    }
  }

  return (
    <ModalEditarShell
      titulo={row.nome}
      subtitulo={`${codigoEstoqueItem(row)} — ${ESTOQUE_ITEM_CATEGORIA_LABEL[row.categoria]}`}
      idPrefix="edit-item"
      aba={aba}
      setAba={setAba}
      err={err}
      saving={saving}
      onSalvar={() => void salvar()}
      onClose={onClose}
      alteracoes={
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="edit-item-tipo" style={labelStyle}>
              Tipo de Alteração
              <CampoObrigatorioMark />
            </label>
            <select
              id="edit-item-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAlteracaoItem)}
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              <option value="novas_unidades">Novas Unidades</option>
              <option value="alteracao_valor">Alteração de Valor</option>
              <option value="alteracao_cadastral">Alteração Cadastral</option>
            </select>
          </div>
          {tipo === "novas_unidades" ? (
            <div>
              <label htmlFor="edit-item-qtd" style={labelStyle}>
                Quantidade
                <CampoObrigatorioMark />
              </label>
              <input
                id="edit-item-qtd"
                type="number"
                min={0}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                style={inputStyle}
              />
            </div>
          ) : null}
          {tipo === "alteracao_valor" ? (
            <div>
              <label htmlFor="edit-item-valor" style={labelStyle}>
                Valor Unitário (R$)
                <CampoObrigatorioMark />
              </label>
              <input
                id="edit-item-valor"
                type="text"
                inputMode="decimal"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                style={inputStyle}
              />
            </div>
          ) : null}
          {tipo === "alteracao_cadastral" ? (
            <>
              <div>
                <label htmlFor="edit-item-nome" style={labelStyle}>
                  Nome
                  <CampoObrigatorioMark />
                </label>
                <input id="edit-item-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label htmlFor="edit-item-categoria" style={labelStyle}>
                  Categoria
                  <CampoObrigatorioMark />
                </label>
                <select
                  id="edit-item-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={inputStyle}
                >
                  {ESTOQUE_ITEM_CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {ESTOQUE_ITEM_CATEGORIA_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div style={ESTOQUE_FORM_GRID}>
                <div>
                  <label htmlFor="edit-item-marca" style={labelStyle}>
                    Marca
                    <CampoObrigatorioMark />
                  </label>
                  <input id="edit-item-marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="edit-item-modelo" style={labelStyle}>
                    Modelo
                    <CampoObrigatorioMark />
                  </label>
                  <input id="edit-item-modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      }
      anotacoes={<PainelAnotacaoForm idPrefix="edit-item" draft={anotacao} onChange={(p) => setAnotacao((prev) => ({ ...prev, ...p }))} />}
    />
  );
}

/* ─── Editar Equipamento ──────────────────────────────────────────────────── */

type TipoAlteracaoEquip = "" | "alteracao_valor" | "alteracao_cadastral";

export function ModalEditarEquipamentoEstoque({
  row,
  onClose,
  onSalvo,
}: {
  row: EstoqueEquipamentoRow;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"alteracoes" | "anotacoes">("alteracoes");
  const [tipo, setTipo] = useState<TipoAlteracaoEquip>("");
  const [valor, setValor] = useState(String(row.valor).replace(".", ","));
  const [nome, setNome] = useState(row.nome);
  const [categoria, setCategoria] = useState<string>(row.categoria);
  const [numeroSerie, setNumeroSerie] = useState(row.numero_serie);
  const [marca, setMarca] = useState(row.marca);
  const [modelo, setModelo] = useState(row.modelo);
  const [anotacao, setAnotacao] = useState<AnotacaoDraft>({ texto: "", arquivo: null });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);
  const autorNome = user?.name ?? "";

  async function salvar() {
    const temAnotacao = anotacao.texto.trim().length > 0;
    if (!tipo && !temAnotacao) {
      setErr(anotacao.arquivo ? ERRO_ANEXO_SEM_TEXTO : ERRO_NADA_A_SALVAR);
      return;
    }
    if (anotacao.arquivo && !temAnotacao) {
      setErr(ERRO_ANEXO_SEM_TEXTO);
      return;
    }

    let payload: Record<string, unknown> | null = null;
    let acao = "";
    let detalhe = "";

    if (tipo === "alteracao_valor") {
      const v = parseValorEstoque(valor);
      if (v == null) {
        setErr(ERRO_VALOR);
        return;
      }
      payload = { valor: v };
      acao = "Alteração de Valor";
      detalhe = `Valor: ${fmtBRL(row.valor)} → ${fmtBRL(v)}`;
    } else if (tipo === "alteracao_cadastral") {
      if (!nome.trim() || !categoria || !numeroSerie.trim() || !marca.trim() || !modelo.trim()) {
        setErr("Preencha todos os campos da alteração cadastral.");
        return;
      }
      payload = {
        nome: nome.trim(),
        categoria,
        numero_serie: numeroSerie.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
      };
      acao = "Alteração Cadastral";
      const mudancas: string[] = [];
      if (nome.trim() !== row.nome) mudancas.push(`Nome: ${row.nome} → ${nome.trim()}`);
      if (categoria !== row.categoria)
        mudancas.push(
          `Categoria: ${ESTOQUE_EQUIP_CATEGORIA_LABEL[row.categoria]} → ${ESTOQUE_EQUIP_CATEGORIA_LABEL[categoria as EstoqueEquipamentoRow["categoria"]]}`,
        );
      if (numeroSerie.trim() !== row.numero_serie)
        mudancas.push(`Número de série: ${row.numero_serie} → ${numeroSerie.trim()}`);
      if (marca.trim() !== row.marca) mudancas.push(`Marca: ${row.marca} → ${marca.trim()}`);
      if (modelo.trim() !== row.modelo) mudancas.push(`Modelo: ${row.modelo} → ${modelo.trim()}`);
      detalhe = mudancas.join("\n");
    }

    setErr(null);
    setSaving(true);
    try {
      if (payload) {
        const { error } = await supabase.from("tech_ops_estoque_equipamentos").update(payload).eq("id", row.id);
        if (error) throw error;
        await registrarHistoricoEstoque({
          entidadeTipo: "equipamento",
          entidadeId: row.id,
          acao,
          detalhe: detalhe || null,
          autorNome,
        });
      }
      await salvarAnotacaoSePreenchida({ entidadeTipo: "equipamento", entidadeId: row.id, draft: anotacao, autorNome });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao editar equipamento", e);
      setErr(erroSalvar("do equipamento"));
      setSaving(false);
    }
  }

  return (
    <ModalEditarShell
      titulo={row.nome}
      subtitulo={`${codigoEstoqueEquipamento(row)} — ${ESTOQUE_EQUIP_CATEGORIA_LABEL[row.categoria]}`}
      idPrefix="edit-eqp"
      aba={aba}
      setAba={setAba}
      err={err}
      saving={saving}
      onSalvar={() => void salvar()}
      onClose={onClose}
      alteracoes={
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="edit-eqp-tipo" style={labelStyle}>
              Tipo de Alteração
              <CampoObrigatorioMark />
            </label>
            <select
              id="edit-eqp-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAlteracaoEquip)}
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              <option value="alteracao_valor">Alteração de Valor</option>
              <option value="alteracao_cadastral">Alteração Cadastral</option>
            </select>
          </div>
          {tipo === "alteracao_valor" ? (
            <div>
              <label htmlFor="edit-eqp-valor" style={labelStyle}>
                Valor (R$)
                <CampoObrigatorioMark />
              </label>
              <input
                id="edit-eqp-valor"
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                style={inputStyle}
              />
            </div>
          ) : null}
          {tipo === "alteracao_cadastral" ? (
            <>
              <div>
                <label htmlFor="edit-eqp-nome" style={labelStyle}>
                  Nome
                  <CampoObrigatorioMark />
                </label>
                <input id="edit-eqp-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label htmlFor="edit-eqp-categoria" style={labelStyle}>
                  Categoria
                  <CampoObrigatorioMark />
                </label>
                <select
                  id="edit-eqp-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={inputStyle}
                >
                  {ESTOQUE_EQUIP_CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {ESTOQUE_EQUIP_CATEGORIA_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-eqp-serie" style={labelStyle}>
                  Número de Série
                  <CampoObrigatorioMark />
                </label>
                <input
                  id="edit-eqp-serie"
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={ESTOQUE_FORM_GRID}>
                <div>
                  <label htmlFor="edit-eqp-marca" style={labelStyle}>
                    Marca
                    <CampoObrigatorioMark />
                  </label>
                  <input id="edit-eqp-marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="edit-eqp-modelo" style={labelStyle}>
                    Modelo
                    <CampoObrigatorioMark />
                  </label>
                  <input id="edit-eqp-modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      }
      anotacoes={<PainelAnotacaoForm idPrefix="edit-eqp" draft={anotacao} onChange={(p) => setAnotacao((prev) => ({ ...prev, ...p }))} />}
    />
  );
}

/* ─── Editar Item de Jogo ─────────────────────────────────────────────────── */

export function ModalEditarJogoEstoque({
  row,
  onClose,
  onSalvo,
}: {
  row: EstoqueJogoLoteRow;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"alteracoes" | "anotacoes">("alteracoes");
  const [nomeLote, setNomeLote] = useState(row.nome_lote);
  const [categoria, setCategoria] = useState<string>(row.categoria);
  const [quantidade, setQuantidade] = useState(String(row.qtd_inicial));
  const [anotacao, setAnotacao] = useState<AnotacaoDraft>({ texto: "", arquivo: null });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);
  const autorNome = user?.name ?? "";

  async function salvar() {
    const temAnotacao = anotacao.texto.trim().length > 0;
    if (anotacao.arquivo && !temAnotacao) {
      setErr(ERRO_ANEXO_SEM_TEXTO);
      return;
    }
    if (!nomeLote.trim() || !categoria) {
      setErr("Preencha os campos obrigatórios.");
      return;
    }
    const qtd = parseQtd(quantidade);
    if (qtd == null) {
      setErr(ERRO_QUANTIDADE);
      return;
    }

    const mudancas: string[] = [];
    if (nomeLote.trim() !== row.nome_lote) mudancas.push(`Nome do lote: ${row.nome_lote} → ${nomeLote.trim()}`);
    if (categoria !== row.categoria)
      mudancas.push(
        `Categoria: ${ESTOQUE_JOGO_CATEGORIA_LABEL[row.categoria]} → ${ESTOQUE_JOGO_CATEGORIA_LABEL[categoria as EstoqueJogoLoteRow["categoria"]]}`,
      );
    if (qtd !== row.qtd_inicial) mudancas.push(`Quantidade inicial: ${row.qtd_inicial} → ${qtd}`);

    if (mudancas.length === 0 && !temAnotacao) {
      setErr(ERRO_NADA_A_SALVAR);
      return;
    }

    setErr(null);
    setSaving(true);
    try {
      if (mudancas.length > 0) {
        const { error } = await supabase
          .from("tech_ops_estoque_jogo_lotes")
          .update({ nome_lote: nomeLote.trim(), categoria, qtd_inicial: qtd })
          .eq("id", row.id);
        if (error) throw error;
        await registrarHistoricoEstoque({
          entidadeTipo: "jogo",
          entidadeId: row.id,
          acao: "Alteração",
          detalhe: mudancas.join("\n"),
          autorNome,
        });
      }
      await salvarAnotacaoSePreenchida({ entidadeTipo: "jogo", entidadeId: row.id, draft: anotacao, autorNome });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao editar item de jogo", e);
      setErr(erroSalvar("do item de jogo"));
      setSaving(false);
    }
  }

  return (
    <ModalEditarShell
      titulo={row.nome_lote}
      subtitulo={`${codigoEstoqueJogoLote(row)} — ${ESTOQUE_JOGO_CATEGORIA_LABEL[row.categoria]}`}
      idPrefix="edit-jogo"
      aba={aba}
      setAba={setAba}
      err={err}
      saving={saving}
      onSalvar={() => void salvar()}
      onClose={onClose}
      alteracoes={
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="edit-jogo-lote" style={labelStyle}>
              Nome do Lote
              <CampoObrigatorioMark />
            </label>
            <input id="edit-jogo-lote" type="text" value={nomeLote} onChange={(e) => setNomeLote(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="edit-jogo-categoria" style={labelStyle}>
              Categoria
              <CampoObrigatorioMark />
            </label>
            <select
              id="edit-jogo-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={inputStyle}
            >
              {ESTOQUE_JOGO_CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {ESTOQUE_JOGO_CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-jogo-qtd" style={labelStyle}>
              Quantidade
              <CampoObrigatorioMark />
            </label>
            <input
              id="edit-jogo-qtd"
              type="number"
              min={0}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              style={inputStyle}
            />
            <div style={getEstoqueHintStyle(t)}>Altera a Quantidade Inicial do lote.</div>
          </div>
        </div>
      }
      anotacoes={<PainelAnotacaoForm idPrefix="edit-jogo" draft={anotacao} onChange={(p) => setAnotacao((prev) => ({ ...prev, ...p }))} />}
    />
  );
}

/* ─── Editar Fornecedor ───────────────────────────────────────────────────── */

type TipoAlteracaoForn = "" | "alteracao_contato" | "alteracao_cadastral";

type ContatoEdit = {
  id: string | null;
  nome: string;
  telefone: string;
  email: string;
};

export function ModalEditarFornecedorEstoque({
  row,
  onClose,
  onSalvo,
}: {
  row: EstoqueFornecedorRow;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"alteracoes" | "anotacoes">("alteracoes");
  const [tipoAlt, setTipoAlt] = useState<TipoAlteracaoForn>("");
  const [contatos, setContatos] = useState<ContatoEdit[]>(
    row.contatos.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email })),
  );
  const [razaoSocial, setRazaoSocial] = useState(row.razao_social);
  const [cnpj, setCnpj] = useState(row.cnpj);
  const [tipo, setTipo] = useState(row.tipo);
  const [anotacao, setAnotacao] = useState<AnotacaoDraft>({ texto: "", arquivo: null });
  const [novoContatoAberto, setNovoContatoAberto] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);
  const autorNome = user?.name ?? "";

  function setContato(idx: number, patch: Partial<ContatoEdit>) {
    setContatos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function salvar() {
    const temAnotacao = anotacao.texto.trim().length > 0;
    if (!tipoAlt && !temAnotacao) {
      setErr(anotacao.arquivo ? ERRO_ANEXO_SEM_TEXTO : ERRO_NADA_A_SALVAR);
      return;
    }
    if (anotacao.arquivo && !temAnotacao) {
      setErr(ERRO_ANEXO_SEM_TEXTO);
      return;
    }

    setErr(null);
    setSaving(true);
    try {
      if (tipoAlt === "alteracao_contato") {
        if (contatos.some((c) => !c.nome.trim())) {
          setErr("Todo contato deve ter Nome.");
          setSaving(false);
          return;
        }
        const mudancas: string[] = [];
        for (const c of contatos) {
          if (c.id) {
            const original = row.contatos.find((o) => o.id === c.id);
            const mudou =
              !original ||
              original.nome !== c.nome.trim() ||
              original.telefone !== c.telefone.trim() ||
              original.email !== c.email.trim();
            if (mudou) {
              const { error } = await supabase
                .from("tech_ops_estoque_fornecedor_contatos")
                .update({ nome: c.nome.trim(), telefone: c.telefone.trim(), email: c.email.trim() })
                .eq("id", c.id);
              if (error) throw error;
              mudancas.push(`Contato atualizado: ${c.nome.trim()}`);
            }
          } else {
            const { error } = await supabase.from("tech_ops_estoque_fornecedor_contatos").insert({
              fornecedor_id: row.id,
              nome: c.nome.trim(),
              telefone: c.telefone.trim(),
              email: c.email.trim(),
            });
            if (error) throw error;
            mudancas.push(`Contato adicionado: ${c.nome.trim()}`);
          }
        }
        if (mudancas.length > 0) {
          await registrarHistoricoEstoque({
            entidadeTipo: "fornecedor",
            entidadeId: row.id,
            acao: "Alteração de Contato",
            detalhe: mudancas.join("\n"),
            autorNome,
          });
        }
      } else if (tipoAlt === "alteracao_cadastral") {
        if (!razaoSocial.trim() || !cnpj.trim() || !tipo.trim()) {
          setErr("Preencha todos os campos da alteração cadastral.");
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from("tech_ops_estoque_fornecedores")
          .update({ razao_social: razaoSocial.trim(), cnpj: cnpj.trim(), tipo: tipo.trim() })
          .eq("id", row.id);
        if (error) throw error;
        const mudancas: string[] = [];
        if (razaoSocial.trim() !== row.razao_social)
          mudancas.push(`Razão social: ${row.razao_social} → ${razaoSocial.trim()}`);
        if (cnpj.trim() !== row.cnpj)
          mudancas.push(`CNPJ: ${formatCnpjEstoque(row.cnpj)} → ${formatCnpjEstoque(cnpj.trim())}`);
        if (tipo.trim() !== row.tipo) mudancas.push(`Tipo: ${row.tipo} → ${tipo.trim()}`);
        await registrarHistoricoEstoque({
          entidadeTipo: "fornecedor",
          entidadeId: row.id,
          acao: "Alteração Cadastral",
          detalhe: mudancas.join("\n") || null,
          autorNome,
        });
      }
      await salvarAnotacaoSePreenchida({ entidadeTipo: "fornecedor", entidadeId: row.id, draft: anotacao, autorNome });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao editar fornecedor", e);
      setErr(erroSalvar("do fornecedor"));
      setSaving(false);
    }
  }

  return (
    <>
      <ModalEditarShell
        titulo={row.tipo}
        subtitulo={`${row.razao_social} — ${formatCnpjEstoque(row.cnpj)}`}
        idPrefix="edit-forn"
        aba={aba}
        setAba={setAba}
        err={err}
        saving={saving}
        onSalvar={() => void salvar()}
        onClose={onClose}
        maxWidth={600}
        alteracoes={
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label htmlFor="edit-forn-tipo-alt" style={labelStyle}>
                Tipo de Alteração
                <CampoObrigatorioMark />
              </label>
              <select
                id="edit-forn-tipo-alt"
                value={tipoAlt}
                onChange={(e) => setTipoAlt(e.target.value as TipoAlteracaoForn)}
                style={inputStyle}
              >
                <option value="">Selecione…</option>
                <option value="alteracao_contato">Alteração de Contato</option>
                <option value="alteracao_cadastral">Alteração Cadastral</option>
              </select>
            </div>

            {tipoAlt === "alteracao_contato" ? (
              <div style={{ display: "grid", gap: 14 }}>
                {contatos.map((c, i) => (
                  <div
                    key={c.id ?? `novo-${i}`}
                    style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 14, display: "grid", gap: 12 }}
                  >
                    <div>
                      <label htmlFor={`edit-forn-contato-nome-${i}`} style={labelStyle}>
                        Nome
                        <CampoObrigatorioMark />
                      </label>
                      <input
                        id={`edit-forn-contato-nome-${i}`}
                        type="text"
                        value={c.nome}
                        onChange={(e) => setContato(i, { nome: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={ESTOQUE_FORM_GRID}>
                      <div>
                        <label htmlFor={`edit-forn-contato-tel-${i}`} style={labelStyle}>
                          Telefone
                        </label>
                        <input
                          id={`edit-forn-contato-tel-${i}`}
                          type="tel"
                          value={c.telefone}
                          onChange={(e) => setContato(i, { telefone: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-forn-contato-email-${i}`} style={labelStyle}>
                          E-mail
                        </label>
                        <input
                          id={`edit-forn-contato-email-${i}`}
                          type="email"
                          value={c.email}
                          onChange={(e) => setContato(i, { email: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNovoContatoAberto(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 16px",
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
                  <Plus size={14} aria-hidden />
                  Adicionar contato
                </button>
              </div>
            ) : null}

            {tipoAlt === "alteracao_cadastral" ? (
              <>
                <div>
                  <label htmlFor="edit-forn-razao" style={labelStyle}>
                    Razão Social
                    <CampoObrigatorioMark />
                  </label>
                  <input
                    id="edit-forn-razao"
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={ESTOQUE_FORM_GRID}>
                  <div>
                    <label htmlFor="edit-forn-cnpj" style={labelStyle}>
                      CNPJ
                      <CampoObrigatorioMark />
                    </label>
                    <input
                      id="edit-forn-cnpj"
                      type="text"
                      inputMode="numeric"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-forn-tipo" style={labelStyle}>
                      Tipo
                      <CampoObrigatorioMark />
                    </label>
                    <input id="edit-forn-tipo" type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        }
        anotacoes={<PainelAnotacaoForm idPrefix="edit-forn" draft={anotacao} onChange={(p) => setAnotacao((prev) => ({ ...prev, ...p }))} />}
      />

      {novoContatoAberto ? (
        <ModalNovoContatoFornecedor
          onCancel={() => setNovoContatoAberto(false)}
          onAdd={(c) => {
            setContatos((prev) => [...prev, { id: null, ...c }]);
            setNovoContatoAberto(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Sub-modal de novo contato — adiciona ao rascunho; persiste no Salvar do modal pai. */
function ModalNovoContatoFornecedor({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (c: { nome: string; telefone: string; email: string }) => void;
}) {
  const { theme: t } = useApp();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);

  return (
    <ModalBase onClose={onCancel} maxWidth={440} zIndex={1100}>
      <ModalHeader title="Adicionar Contato" onClose={onCancel} />
      <ErroInlineEstoque>{err}</ErroInlineEstoque>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label htmlFor="novo-contato-nome" style={labelStyle}>
            Nome do Contato
            <CampoObrigatorioMark />
          </label>
          <input id="novo-contato-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="novo-contato-tel" style={labelStyle}>
            Telefone
          </label>
          <input id="novo-contato-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="novo-contato-email" style={labelStyle}>
            E-mail
          </label>
          <input id="novo-contato-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <BotaoPrimarioModalEstoque
        onClick={() => {
          if (!nome.trim()) {
            setErr("Informe o Nome do Contato.");
            return;
          }
          onAdd({ nome: nome.trim(), telefone: telefone.trim(), email: email.trim() });
        }}
      >
        Adicionar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}
