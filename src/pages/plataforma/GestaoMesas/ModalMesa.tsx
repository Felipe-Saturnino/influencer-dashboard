import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, BRAND_SEMANTIC as BRAND } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import { ctaGradientSalvar } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import type { Role } from "../../../types";
import { ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import {
  TIPOS_JOGO,
  tipoJogoInitial,
  nomesOperadorasEstudio,
  type EstudioSpinRow,
  type MesaSpinCadastroRow,
} from "./gestaoMesasUi";

const ERRO_SALVAR_MESA = "Não foi possível salvar a mesa. Verifique os dados e tente novamente.";
const ERRO_MESA_DUPLICADA =
  "Já existe uma mesa com este ID Spin ou ID da operadora para esta operadora.";

function operadorasDoEstudio(estudio: EstudioSpinRow | undefined) {
  if (!estudio) return [];
  return (estudio.estudios_spin_operadoras ?? []).map((j) => {
    const o = j.operadoras;
    const nome = o == null ? j.operadora_slug : Array.isArray(o) ? (o[0]?.nome ?? j.operadora_slug) : o.nome;
    return { slug: j.operadora_slug, nome };
  });
}

export function ModalMesa({
  editando,
  estudios,
  onClose,
  onSalvo,
}: {
  editando: MesaSpinCadastroRow | null;
  estudios: EstudioSpinRow[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const dashBrand = useDashboardBrand();
  const userRole = user?.role ?? null;
  const baseId = useId();
  const ini = tipoJogoInitial(editando);
  const [estudioSlug, setEstudioSlug] = useState(editando?.estudio_slug ?? "");
  const [nomeMesa, setNomeMesa] = useState(editando?.nome_mesa ?? "");
  const [tipoJogo, setTipoJogo] = useState(ini.preset);
  const [tipoJogoOutro, setTipoJogoOutro] = useState(ini.outro);
  const [numeroMesa, setNumeroMesa] = useState(editando?.numero_mesa ?? "");
  const [mesaIdentificacao, setMesaIdentificacao] = useState(editando?.mesa_identificacao ?? "");
  const [idsPorOperadora, setIdsPorOperadora] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const estudioSelecionado = useMemo(
    () => estudios.find((e) => e.slug === estudioSlug),
    [estudios, estudioSlug],
  );

  const operadorasEstudio = useMemo(() => operadorasDoEstudio(estudioSelecionado), [estudioSelecionado]);

  useEffect(() => {
    if (!editando?.id) return;
    let cancelled = false;
    void supabase
      .from("mesas_spin_operadora_identificacao")
      .select("operadora_slug, mesa_identificacao_operadora")
      .eq("mesa_id", editando.id)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          if (row.mesa_identificacao_operadora?.trim()) {
            map[row.operadora_slug] = row.mesa_identificacao_operadora.trim();
          }
        }
        if (Object.keys(map).length === 0 && editando.mesa_identificacao_operadora?.trim()) {
          map[editando.operadora_slug] = editando.mesa_identificacao_operadora.trim();
        }
        setIdsPorOperadora(map);
      });
    return () => {
      cancelled = true;
    };
  }, [editando]);

  useEffect(() => {
    if (!estudioSlug || editando) return;
    setIdsPorOperadora({});
  }, [estudioSlug, editando]);

  const tipoJogoEfetivo = tipoJogo === "Outro" ? tipoJogoOutro.trim() : tipoJogo;

  const salvar = async () => {
    setErro(null);
    if (!estudioSlug.trim()) {
      setErro("Selecione o estúdio.");
      return;
    }
    if (!nomeMesa.trim()) {
      setErro("Informe o nome da mesa.");
      return;
    }
    if (!tipoJogoEfetivo) {
      setErro("Informe o tipo de jogo.");
      return;
    }
    if (!numeroMesa.trim()) {
      setErro("Informe o número da mesa.");
      return;
    }
    if (!mesaIdentificacao.trim()) {
      setErro("Informe o ID interno Spin da mesa.");
      return;
    }
    const primeiraOperadora = operadorasEstudio[0]?.slug ?? editando?.operadora_slug;
    if (!primeiraOperadora) {
      setErro("O estúdio selecionado não possui operadoras vinculadas.");
      return;
    }

    const legacyIdOp =
      Object.values(idsPorOperadora).find((v) => v.trim())?.trim() ??
      editando?.mesa_identificacao_operadora?.trim() ??
      null;

    setSalvando(true);
    try {
      const payload = {
        estudio_slug: estudioSlug.trim(),
        operadora_slug: primeiraOperadora,
        nome_mesa: nomeMesa.trim(),
        tipo_jogo: tipoJogoEfetivo,
        numero_mesa: numeroMesa.trim(),
        mesa_identificacao: mesaIdentificacao.trim(),
        mesa_identificacao_operadora: legacyIdOp,
      };

      let mesaId = editando?.id;
      if (editando) {
        const { error } = await supabase.from("mesas_spin_cadastro").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("mesas_spin_cadastro").insert(payload).select("id").single();
        if (error) throw error;
        mesaId = data?.id;
      }

      if (mesaId) {
        await supabase.from("mesas_spin_operadora_identificacao").delete().eq("mesa_id", mesaId);
        const idRows = operadorasEstudio
          .map((op) => ({
            mesa_id: mesaId!,
            operadora_slug: op.slug,
            mesa_identificacao_operadora: idsPorOperadora[op.slug]?.trim() || null,
          }))
          .filter((r) => r.mesa_identificacao_operadora);
        if (idRows.length > 0) {
          const { error: idErr } = await supabase.from("mesas_spin_operadora_identificacao").insert(idRows);
          if (idErr) throw idErr;
        }
      }

      onSalvo();
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      if (msg.includes("duplicate") || msg.includes("ux_mesas")) {
        setErro(ERRO_MESA_DUPLICADA);
      } else {
        console.error(e);
        setErro(ERRO_SALVAR_MESA);
      }
    } finally {
      setSalvando(false);
    }
  };

  const tryClose = () => {
    if (!salvando) onClose();
  };

  const desabilitaEstudio =
    Boolean(editando) && (!userRole || !ROLES_STAFF_OPERACOES_LIVES.includes(userRole as Role));

  const fieldLabel = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 6,
  };

  const inputStyle = (disabled?: boolean) => ({
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: disabled ? t.cardBg : t.inputBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
  });

  return (
    <ModalBase maxWidth={480} onClose={tryClose}>
      <ModalHeader title={editando ? "Editar mesa" : "Nova mesa"} onClose={tryClose} />
      {erro && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor={`${baseId}-estudio`} style={fieldLabel}>
            Nome do Estúdio
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-estudio`}
            aria-label="Estúdio (obrigatório)"
            value={estudioSlug}
            disabled={desabilitaEstudio}
            onChange={(e) => setEstudioSlug(e.target.value)}
            style={inputStyle(desabilitaEstudio)}
          >
            <option value="">Selecione…</option>
            {estudios.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.nome}
                {e.tipo ? ` (${e.tipo === "network" ? "Network" : "Dedicado"})` : ""}
              </option>
            ))}
          </select>
          {estudioSelecionado && operadorasEstudio.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4 }}>
              Operadoras: {nomesOperadorasEstudio(estudioSelecionado).join(", ")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-nome`} style={fieldLabel}>
            Nome da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-nome`}
            type="text"
            value={nomeMesa}
            onChange={(e) => setNomeMesa(e.target.value)}
            placeholder="Ex.: Blackjack VIP"
            aria-label="Nome da mesa (obrigatório)"
            autoComplete="off"
            style={inputStyle()}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-tipo`} style={fieldLabel}>
            Tipo de jogo
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-tipo`}
            aria-label="Tipo de jogo (obrigatório)"
            value={(TIPOS_JOGO as readonly string[]).includes(tipoJogo) ? tipoJogo : "Outro"}
            onChange={(e) => setTipoJogo(e.target.value)}
            style={inputStyle()}
          >
            {TIPOS_JOGO.map((tj) => (
              <option key={tj} value={tj}>
                {tj}
              </option>
            ))}
          </select>
          {tipoJogo === "Outro" && (
            <>
              <label htmlFor={`${baseId}-tipo-outro`} style={{ ...fieldLabel, marginTop: 10 }}>
                Especificar tipo
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${baseId}-tipo-outro`}
                type="text"
                value={tipoJogoOutro}
                onChange={(e) => setTipoJogoOutro(e.target.value)}
                placeholder="Descreva o tipo de jogo"
                aria-label="Especificar tipo de jogo (obrigatório)"
                style={inputStyle()}
              />
            </>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-num`} style={fieldLabel}>
            Número da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-num`}
            type="text"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
            placeholder="Ex.: 01"
            aria-label="Número da mesa (obrigatório)"
            autoComplete="off"
            style={inputStyle()}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-id`} style={fieldLabel}>
            ID interno Spin
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id`}
            type="text"
            value={mesaIdentificacao}
            onChange={(e) => setMesaIdentificacao(e.target.value)}
            disabled={Boolean(editando)}
            placeholder="Identificador Spin (estúdio)"
            aria-label="ID interno Spin (obrigatório)"
            autoComplete="off"
            style={inputStyle(Boolean(editando))}
          />
          {editando && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4 }}>
              O ID Spin não pode ser alterado. Exclua e crie novamente se estiver incorreto.
            </p>
          )}
        </div>
        {operadorasEstudio.length > 0 &&
          operadorasEstudio.map((op) => (
            <div key={op.slug}>
              <label htmlFor={`${baseId}-id-op-${op.slug}`} style={fieldLabel}>
                ID na {op.nome}
              </label>
              <input
                id={`${baseId}-id-op-${op.slug}`}
                type="text"
                value={idsPorOperadora[op.slug] ?? ""}
                onChange={(e) =>
                  setIdsPorOperadora((prev) => ({
                    ...prev,
                    [op.slug]: e.target.value,
                  }))
                }
                placeholder={`Ex.: game id na ${op.nome}`}
                aria-label={`ID da mesa no catálogo da operadora ${op.nome} (opcional)`}
                autoComplete="off"
                style={inputStyle()}
              />
            </div>
          ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={tryClose}
          disabled={salvando}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientSalvar(dashBrand, salvando, BRAND.cinza),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          <SalvarCtaContent salvando={salvando} label={editando ? "Salvar" : "Cadastrar"} labelSalvando="Salvando…" />
        </button>
      </div>
    </ModalBase>
  );
}
