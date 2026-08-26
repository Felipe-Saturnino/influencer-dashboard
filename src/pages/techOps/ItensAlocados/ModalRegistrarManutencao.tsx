import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CampoUploadArquivos, type CampoUploadArquivoItem } from "../../../components/CampoUploadArquivos";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  fetchEquipamentosManutencaoNoLocal,
  fetchMesasManutencaoNoLocal,
  labelMesaFiltro,
  manutencaoTipoExigeEvidenciaNivelamento,
  modoManutencaoPorLocal,
  registrarManutencaoItensAlocados,
  tiposManutencaoPorMesa,
  MANUTENCAO_TIPOS_MAQUINA_CARTAS,
  type EquipamentoLimpezaOption,
  type MesaItensAlocadosOption,
} from "../../../lib/techOpsItensAlocados";
import { ESTOQUE_EQUIP_CATEGORIA_LABEL } from "../../../lib/techOpsEstoque";

export function ModalRegistrarManutencao({
  localLabel,
  localChave,
  autorNome,
  autorUserId,
  onClose,
  onSalvo,
}: {
  localLabel: string;
  localChave: string;
  autorNome: string;
  autorUserId: string | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const modo = modoManutencaoPorLocal(localChave);

  const [mesas, setMesas] = useState<MesaItensAlocadosOption[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoLimpezaOption[]>([]);
  const [mesaId, setMesaId] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [tipo, setTipo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mesaSelecionada = mesas.find((m) => m.id === mesaId) ?? null;
  const equipamentoSelecionado = equipamentos.find((e) => e.id === equipamentoId) ?? null;

  const tiposOpcoes = useMemo(() => {
    if (modo === "equipamento") return [...MANUTENCAO_TIPOS_MAQUINA_CARTAS];
    if (modo === "mesa" && mesaSelecionada) return [...tiposManutencaoPorMesa(mesaSelecionada.tipo_jogo)];
    return [];
  }, [modo, mesaSelecionada]);

  const exigeEvidencia = manutencaoTipoExigeEvidenciaNivelamento(tipo);
  const alvoSelecionado = modo === "mesa" ? !!mesaId : !!equipamentoId;
  const formularioVisivel = alvoSelecionado && !carregando;

  const evidenciaItems: CampoUploadArquivoItem[] = evidenciaFile
    ? [{ key: "evidencia", label: evidenciaFile.name, pendente: true, file: evidenciaFile }]
    : [];

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    setErro(null);
    setMesaId("");
    setEquipamentoId("");
    setTipo("");
    setObservacao("");
    setEvidenciaFile(null);

    void (async () => {
      try {
        if (modo === "mesa") {
          const lista = await fetchMesasManutencaoNoLocal(localChave);
          if (cancel) return;
          setMesas(lista);
          setEquipamentos([]);
          setMesaId(lista.length === 1 ? lista[0].id : "");
        } else if (modo === "equipamento") {
          const lista = await fetchEquipamentosManutencaoNoLocal(localChave);
          if (cancel) return;
          setEquipamentos(lista);
          setMesas([]);
          setEquipamentoId(lista.length === 1 ? lista[0].id : "");
        } else {
          setMesas([]);
          setEquipamentos([]);
        }
      } catch (e) {
        console.error("Itens Alocados: falha ao carregar dados para manutenção", e);
        if (!cancel) {
          setErro("Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.");
        }
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [localChave, modo]);

  useEffect(() => {
    setTipo("");
    setObservacao("");
    setEvidenciaFile(null);
  }, [mesaId, equipamentoId]);

  useEffect(() => {
    if (!manutencaoTipoExigeEvidenciaNivelamento(tipo)) {
      setEvidenciaFile(null);
    }
  }, [tipo]);

  const inputStyle = {
    width: "100%" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  const labelAlvo =
    modo === "mesa" ? "Mesa" : ESTOQUE_EQUIP_CATEGORIA_LABEL.maquina_cartas;

  const mensagemVazio =
    modo === "mesa"
      ? "Nenhuma mesa cadastrada neste local."
      : "Nenhuma máquina de cartas alocada neste local.";

  async function registrar() {
    if (!alvoSelecionado) {
      setErro(`Selecione ${labelAlvo.toLowerCase()}.`);
      return;
    }
    if (!tipo) {
      setErro("Selecione o tipo de manutenção.");
      return;
    }
    if (!observacao.trim()) {
      setErro("Preencha a observação.");
      return;
    }
    if (exigeEvidencia && !evidenciaFile) {
      setErro("Envie a foto de evidência do nivelamento.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await registrarManutencaoItensAlocados({
        localChave,
        mesaId: modo === "mesa" ? mesaId : null,
        equipamentoId: modo === "equipamento" ? equipamentoId : null,
        tipo,
        observacao,
        evidenciaFile: exigeEvidencia ? evidenciaFile : null,
        responsavelNome: autorNome,
        responsavelUserId: autorUserId,
      });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Itens Alocados: falha ao registrar manutenção", e);
      if (e instanceof Error && e.message === "evidencia_grande") {
        setErro("A foto de evidência excede o tamanho máximo de 15 MB.");
      } else {
        setErro("Não foi possível registrar a manutenção. Se o problema persistir, entre em contato com o suporte.");
      }
    } finally {
      setSalvando(false);
    }
  }

  function renderAlvo() {
    if (modo === "mesa") {
      if (mesas.length === 1 && mesaSelecionada) {
        return (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Mesa</label>
            <div style={{ ...inputStyle, background: t.cardBg }}>{labelMesaFiltro(mesaSelecionada.nome_mesa, mesaSelecionada.numero_mesa)}</div>
          </div>
        );
      }
      return (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="reg-manut-mesa" style={labelStyle}>
            Mesa
          </label>
          <select
            id="reg-manut-mesa"
            aria-label="Mesa"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>
                {labelMesaFiltro(m.nome_mesa, m.numero_mesa)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (equipamentos.length === 1 && equipamentoSelecionado) {
      return (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{labelAlvo}</label>
          <div style={{ ...inputStyle, background: t.cardBg }}>{equipamentoSelecionado.label}</div>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="reg-manut-equipamento" style={labelStyle}>
          {labelAlvo}
        </label>
        <select
          id="reg-manut-equipamento"
          aria-label={labelAlvo}
          value={equipamentoId}
          onChange={(e) => setEquipamentoId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Selecione…</option>
          {equipamentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };

  const listaVazia = modo === "mesa" ? mesas.length === 0 : equipamentos.length === 0;

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Registrar Manutenção" onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{localLabel}</p>

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {!modo ? (
        <p style={{ margin: 0, padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Local não suportado para registro de manutenção.
        </p>
      ) : carregando ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "32px 0",
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : listaVazia ? (
        <p style={{ margin: 0, padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {mensagemVazio}
        </p>
      ) : (
        <>
          {renderAlvo()}

          {formularioVisivel ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="reg-manut-tipo" style={labelStyle}>
                  Tipo de Manutenção
                  <CampoObrigatorioMark />
                </label>
                <select
                  id="reg-manut-tipo"
                  aria-label="Tipo de Manutenção"
                  aria-required
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione…</option>
                  {tiposOpcoes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {exigeEvidencia ? (
                <CampoUploadArquivos
                  id="reg-manut-evidencia"
                  label="Evidência do nivelamento"
                  buttonLabel="Enviar foto do nivelamento"
                  icon={Camera}
                  accept="image/png,image/jpeg,image/webp"
                  multiple={false}
                  obrigatorio
                  hint="PNG, JPEG ou WebP — máx. 15 MB."
                  items={evidenciaItems}
                  onAdd={(files) => setEvidenciaFile(files[0] ?? null)}
                  onRemove={() => setEvidenciaFile(null)}
                  t={t}
                />
              ) : null}

              <div>
                <label htmlFor="reg-manut-obs" style={labelStyle}>
                  Observação
                  <CampoObrigatorioMark />
                </label>
                <textarea
                  id="reg-manut-obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={4}
                  placeholder="Descreva a manutenção realizada…"
                  style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                  aria-required
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {!carregando && modo && !listaVazia ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => void registrar()}
            disabled={salvando || !formularioVisivel || !tipo || !observacao.trim() || (exigeEvidencia && !evidenciaFile)}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor:
                salvando || !formularioVisivel || !tipo || !observacao.trim() || (exigeEvidencia && !evidenciaFile)
                  ? "not-allowed"
                  : "pointer",
              opacity:
                salvando || !formularioVisivel || !tipo || !observacao.trim() || (exigeEvidencia && !evidenciaFile)
                  ? 0.7
                  : 1,
              background: getCtaCriarGradient(brand),
            }}
          >
            {salvando ? "Registrando…" : "Registrar"}
          </button>
        </div>
      ) : null}
    </ModalBase>
  );
}
