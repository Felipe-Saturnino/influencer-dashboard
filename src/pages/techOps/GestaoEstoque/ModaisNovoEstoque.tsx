import { useState, type ReactNode } from "react";
import { Building2, Plus, Trash2, UsersRound } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import {
  ESTOQUE_EQUIP_CATEGORIAS,
  ESTOQUE_EQUIP_CATEGORIA_LABEL,
  ESTOQUE_ITEM_CATEGORIAS,
  ESTOQUE_ITEM_CATEGORIA_LABEL,
  ESTOQUE_JOGO_CATEGORIAS,
  ESTOQUE_JOGO_CATEGORIA_LABEL,
  registrarHistoricoEstoque,
  type EstoqueEntidadeTipo,
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

const ERRO_OBRIGATORIOS = "Preencha todos os campos obrigatórios.";
const ERRO_VALOR = "Informe um valor numérico válido.";
const ERRO_QUANTIDADE = "Informe uma quantidade válida (número inteiro ≥ 0).";

function erroRegistrar(entidade: string): string {
  return `Não foi possível registrar ${entidade}. Se o problema persistir, entre em contato com o suporte.`;
}

function parseQtd(texto: string): number | null {
  const n = Number(texto.trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

async function inserirComHistorico(params: {
  tabela: string;
  payload: Record<string, unknown>;
  entidadeTipo: EstoqueEntidadeTipo;
  autorNome: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from(params.tabela)
    .insert(params.payload)
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;
  await registrarHistoricoEstoque({
    entidadeTipo: params.entidadeTipo,
    entidadeId: id,
    acao: "Criação",
    autorNome: params.autorNome,
  });
  return id;
}

function CampoCodigoTravado({ codigo }: { codigo: string }) {
  const { theme: t } = useApp();
  return (
    <div>
      <label style={getEstoqueLabelStyle(t)}>Código</label>
      <input
        type="text"
        value={codigo}
        disabled
        aria-label="Código gerado automaticamente"
        style={{ ...getEstoqueInputStyle(t), opacity: 0.65 }}
      />
    </div>
  );
}

/* ─── Novo Item ───────────────────────────────────────────────────────────── */

export function ModalNovoItemEstoque({
  proximoCodigo,
  onClose,
  onCriado,
}: {
  proximoCodigo: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t, user } = useApp();
  const [categoria, setCategoria] = useState("");
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);

  async function salvar() {
    if (!categoria || !nome.trim() || !marca.trim() || !modelo.trim() || !quantidade.trim() || !valorUnitario.trim()) {
      setErr(ERRO_OBRIGATORIOS);
      return;
    }
    const qtd = parseQtd(quantidade);
    if (qtd == null) {
      setErr(ERRO_QUANTIDADE);
      return;
    }
    const valor = parseValorEstoque(valorUnitario);
    if (valor == null) {
      setErr(ERRO_VALOR);
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await inserirComHistorico({
        tabela: "tech_ops_estoque_itens",
        payload: {
          categoria,
          nome: nome.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          quantidade_total: qtd,
          quantidade_em_uso: 0,
          quantidade_manutencao: 0,
          valor_unitario: valor,
        },
        entidadeTipo: "item",
        autorNome: user?.name ?? "",
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao registrar item", e);
      setErr(erroRegistrar("o item"));
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Novo Item" onClose={onClose} />
      <ErroInlineEstoque>{err}</ErroInlineEstoque>
      <div style={{ display: "grid", gap: 14 }}>
        <CampoCodigoTravado codigo={proximoCodigo} />
        <div>
          <label htmlFor="novo-item-categoria" style={labelStyle}>
            Categoria
            <CampoObrigatorioMark />
          </label>
          <select
            id="novo-item-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {ESTOQUE_ITEM_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ESTOQUE_ITEM_CATEGORIA_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="novo-item-nome" style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input id="novo-item-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
        </div>
        <div style={ESTOQUE_FORM_GRID}>
          <div>
            <label htmlFor="novo-item-marca" style={labelStyle}>
              Marca
              <CampoObrigatorioMark />
            </label>
            <input id="novo-item-marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="novo-item-modelo" style={labelStyle}>
              Modelo
              <CampoObrigatorioMark />
            </label>
            <input id="novo-item-modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={ESTOQUE_FORM_GRID}>
          <div>
            <label htmlFor="novo-item-quantidade" style={labelStyle}>
              Quantidade
              <CampoObrigatorioMark />
            </label>
            <input
              id="novo-item-quantidade"
              type="number"
              min={0}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="novo-item-valor" style={labelStyle}>
              Valor Unitário (R$)
              <CampoObrigatorioMark />
            </label>
            <input
              id="novo-item-valor"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>
      <BotaoPrimarioModalEstoque onClick={() => void salvar()} loading={saving} loadingLabel="Registrando…">
        Registrar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}

/* ─── Novo Equipamento ────────────────────────────────────────────────────── */

export function ModalNovoEquipamentoEstoque({
  proximoCodigo,
  onClose,
  onCriado,
}: {
  proximoCodigo: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t, user } = useApp();
  const [categoria, setCategoria] = useState("");
  const [nome, setNome] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [valor, setValor] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);

  async function salvar() {
    if (!categoria || !nome.trim() || !numeroSerie.trim() || !marca.trim() || !modelo.trim() || !valor.trim()) {
      setErr(ERRO_OBRIGATORIOS);
      return;
    }
    const v = parseValorEstoque(valor);
    if (v == null) {
      setErr(ERRO_VALOR);
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await inserirComHistorico({
        tabela: "tech_ops_estoque_equipamentos",
        payload: {
          categoria,
          nome: nome.trim(),
          numero_serie: numeroSerie.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          valor: v,
          status: "estoque",
        },
        entidadeTipo: "equipamento",
        autorNome: user?.name ?? "",
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao registrar equipamento", e);
      setErr(erroRegistrar("o equipamento"));
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Novo Equipamento" onClose={onClose} />
      <ErroInlineEstoque>{err}</ErroInlineEstoque>
      <div style={{ display: "grid", gap: 14 }}>
        <CampoCodigoTravado codigo={proximoCodigo} />
        <div>
          <label htmlFor="novo-eqp-categoria" style={labelStyle}>
            Categoria
            <CampoObrigatorioMark />
          </label>
          <select
            id="novo-eqp-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {ESTOQUE_EQUIP_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ESTOQUE_EQUIP_CATEGORIA_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="novo-eqp-nome" style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input id="novo-eqp-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="novo-eqp-serie" style={labelStyle}>
            Número de Série
            <CampoObrigatorioMark />
          </label>
          <input
            id="novo-eqp-serie"
            type="text"
            value={numeroSerie}
            onChange={(e) => setNumeroSerie(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={ESTOQUE_FORM_GRID}>
          <div>
            <label htmlFor="novo-eqp-marca" style={labelStyle}>
              Marca
              <CampoObrigatorioMark />
            </label>
            <input id="novo-eqp-marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="novo-eqp-modelo" style={labelStyle}>
              Modelo
              <CampoObrigatorioMark />
            </label>
            <input id="novo-eqp-modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label htmlFor="novo-eqp-valor" style={labelStyle}>
            Valor (R$)
            <CampoObrigatorioMark />
          </label>
          <input
            id="novo-eqp-valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <BotaoPrimarioModalEstoque onClick={() => void salvar()} loading={saving} loadingLabel="Registrando…">
        Registrar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}

/* ─── Novo Item de Jogo ───────────────────────────────────────────────────── */

export function ModalNovoJogoEstoque({
  proximoCodigo,
  onClose,
  onCriado,
}: {
  proximoCodigo: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t, user } = useApp();
  const [categoria, setCategoria] = useState("");
  const [nomeLote, setNomeLote] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);

  async function salvar() {
    if (!categoria || !nomeLote.trim() || !quantidade.trim()) {
      setErr(ERRO_OBRIGATORIOS);
      return;
    }
    const qtd = parseQtd(quantidade);
    if (qtd == null) {
      setErr(ERRO_QUANTIDADE);
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await inserirComHistorico({
        tabela: "tech_ops_estoque_jogo_lotes",
        payload: {
          categoria,
          nome_lote: nomeLote.trim(),
          qtd_inicial: qtd,
          qtd_consumida: 0,
          qtd_descartada: 0,
        },
        entidadeTipo: "jogo",
        autorNome: user?.name ?? "",
      });
      onCriado();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao registrar item de jogo", e);
      setErr(erroRegistrar("o item de jogo"));
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Novo Item de Jogo" onClose={onClose} />
      <ErroInlineEstoque>{err}</ErroInlineEstoque>
      <div style={{ display: "grid", gap: 14 }}>
        <CampoCodigoTravado codigo={proximoCodigo} />
        <div>
          <label htmlFor="novo-jogo-categoria" style={labelStyle}>
            Categoria
            <CampoObrigatorioMark />
          </label>
          <select
            id="novo-jogo-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {ESTOQUE_JOGO_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ESTOQUE_JOGO_CATEGORIA_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="novo-jogo-lote" style={labelStyle}>
            Nome do Lote
            <CampoObrigatorioMark />
          </label>
          <input id="novo-jogo-lote" type="text" value={nomeLote} onChange={(e) => setNomeLote(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="novo-jogo-qtd" style={labelStyle}>
            Quantidade
            <CampoObrigatorioMark />
          </label>
          <input
            id="novo-jogo-qtd"
            type="number"
            min={0}
            step={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            style={inputStyle}
          />
          <div style={getEstoqueHintStyle(t)}>Será registrada como Quantidade Inicial.</div>
        </div>
      </div>
      <BotaoPrimarioModalEstoque onClick={() => void salvar()} loading={saving} loadingLabel="Registrando…">
        Registrar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}

/* ─── Novo Fornecedor (abas Empresa / Contato) ────────────────────────────── */

type ContatoDraft = { nome: string; telefone: string; email: string };

const CONTATO_VAZIO: ContatoDraft = { nome: "", telefone: "", email: "" };

export function ModalNovoFornecedorEstoque({
  onClose,
  onCriado,
}: {
  onClose: () => void;
  onCriado: () => void;
}) {
  const { theme: t, user } = useApp();
  const [aba, setAba] = useState<"empresa" | "contato">("empresa");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tipo, setTipo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [contatos, setContatos] = useState<ContatoDraft[]>([{ ...CONTATO_VAZIO }]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelStyle = getEstoqueLabelStyle(t);
  const inputStyle = getEstoqueInputStyle(t);

  function setContato(idx: number, patch: Partial<ContatoDraft>) {
    setContatos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function salvar() {
    const contatosPreenchidos = contatos.filter((c) => c.nome.trim() || c.telefone.trim() || c.email.trim());
    if (!razaoSocial.trim() || !cnpj.trim() || !tipo.trim() || contatosPreenchidos.length === 0) {
      setErr("Preencha os campos obrigatórios (Empresa e ao menos um Contato com nome).");
      return;
    }
    if (contatosPreenchidos.some((c) => !c.nome.trim())) {
      setErr("Todo contato preenchido deve ter Nome do Contato.");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const id = await inserirComHistorico({
        tabela: "tech_ops_estoque_fornecedores",
        payload: {
          razao_social: razaoSocial.trim(),
          cnpj: cnpj.trim(),
          tipo: tipo.trim(),
          observacao: observacao.trim(),
          ativo: true,
        },
        entidadeTipo: "fornecedor",
        autorNome: user?.name ?? "",
      });
      const { error } = await supabase.from("tech_ops_estoque_fornecedor_contatos").insert(
        contatosPreenchidos.map((c) => ({
          fornecedor_id: id,
          nome: c.nome.trim(),
          telefone: c.telefone.trim(),
          email: c.email.trim(),
        })),
      );
      if (error) throw error;
      onCriado();
      onClose();
    } catch (e) {
      console.error("Gestão de Estoque: falha ao registrar fornecedor", e);
      setErr(erroRegistrar("o fornecedor"));
      setSaving(false);
    }
  }

  const tabs: { id: "empresa" | "contato"; label: string; icon: ReactNode }[] = [
    { id: "empresa", label: "Empresa", icon: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "contato", label: "Contato", icon: <UsersRound {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Novo Fornecedor" onClose={onClose} />
      <ErroInlineEstoque>{err}</ErroInlineEstoque>

      <div
        role="tablist"
        aria-label="Cadastro de fornecedor"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-novo-forn-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-novo-forn-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-novo-forn-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel active={aba === "empresa"} id="panel-novo-forn-empresa" labelledBy="tab-novo-forn-empresa">
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="novo-forn-razao" style={labelStyle}>
              Razão Social
              <CampoObrigatorioMark />
            </label>
            <input
              id="novo-forn-razao"
              type="text"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={ESTOQUE_FORM_GRID}>
            <div>
              <label htmlFor="novo-forn-cnpj" style={labelStyle}>
                CNPJ
                <CampoObrigatorioMark />
              </label>
              <input
                id="novo-forn-cnpj"
                type="text"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="novo-forn-tipo" style={labelStyle}>
                Tipo
                <CampoObrigatorioMark />
              </label>
              <input
                id="novo-forn-tipo"
                type="text"
                placeholder="Ex.: Equipamentos de vídeo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label htmlFor="novo-forn-obs" style={labelStyle}>
              Observação
            </label>
            <textarea
              id="novo-forn-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "contato"} id="panel-novo-forn-contato" labelledBy="tab-novo-forn-contato">
        <div style={{ display: "grid", gap: 16 }}>
          {contatos.map((c, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                padding: 14,
                display: "grid",
                gap: 12,
                position: "relative",
              }}
            >
              {contatos.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setContatos((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remover contato"
                  title="Remover contato"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "1px solid rgba(232,64,37,0.35)",
                    borderRadius: 8,
                    color: "#e84025",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              ) : null}
              <div>
                <label htmlFor={`novo-forn-contato-nome-${i}`} style={labelStyle}>
                  Nome do Contato
                  <CampoObrigatorioMark />
                </label>
                <input
                  id={`novo-forn-contato-nome-${i}`}
                  type="text"
                  value={c.nome}
                  onChange={(e) => setContato(i, { nome: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={ESTOQUE_FORM_GRID}>
                <div>
                  <label htmlFor={`novo-forn-contato-tel-${i}`} style={labelStyle}>
                    Telefone
                  </label>
                  <input
                    id={`novo-forn-contato-tel-${i}`}
                    type="tel"
                    value={c.telefone}
                    onChange={(e) => setContato(i, { telefone: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={`novo-forn-contato-email-${i}`} style={labelStyle}>
                    E-mail
                  </label>
                  <input
                    id={`novo-forn-contato-email-${i}`}
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
            onClick={() => setContatos((prev) => [...prev, { ...CONTATO_VAZIO }])}
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
      </ModalTabPanel>

      <BotaoPrimarioModalEstoque onClick={() => void salvar()} loading={saving} loadingLabel="Registrando…">
        Registrar
      </BotaoPrimarioModalEstoque>
    </ModalBase>
  );
}
