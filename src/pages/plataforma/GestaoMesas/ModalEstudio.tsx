import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AlertCircle, Building2, Layers } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { timeDbToInput } from "../../../lib/turnosDealers";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, BRAND_SEMANTIC as BRAND } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";
import { SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import { ctaGradientSalvar, handleGestaoTabsArrowKeyDown } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import {
  ESTUDIO_TIPO_OPTIONS,
  slugifyEstudio,
  type EstudioTipo,
} from "./gestaoEstudiosHelpers";
import { TurnosDealersFields } from "./TurnosDealersFields";
import type { EstudioSpinRow } from "./gestaoMesasUi";

const ERRO_SALVAR_ESTUDIO = "Não foi possível salvar o estúdio. Verifique os dados e tente novamente.";
const ERRO_ESTUDIO_DUPLICADO = "Já existe um estúdio com este identificador interno.";

type ModalEstudioTabId = "dados" | "operacoes";

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "inherit",
  marginBottom: 6,
};

const inputStyle = (t: { cardBorder: string; inputBg: string; text: string; cardBg?: string }, disabled?: boolean) => ({
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${t.cardBorder}`,
  background: disabled ? (t.cardBg ?? t.inputBg) : t.inputBg,
  color: t.text,
  fontFamily: FONT.body,
  fontSize: 13,
});

export function ModalEstudio({
  editando,
  onClose,
  onSalvo,
}: {
  editando: EstudioSpinRow | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const baseId = useId();
  const isEdicao = editando != null;
  const [aba, setAba] = useState<ModalEstudioTabId>("dados");
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [tipo, setTipo] = useState<EstudioTipo>(
    editando?.tipo === "network" ? "network" : "dedicado",
  );
  const [turnoManha, setTurnoManha] = useState(() => timeDbToInput(editando?.turno_manha_inicio));
  const [turnoTarde, setTurnoTarde] = useState(() => timeDbToInput(editando?.turno_tarde_inicio));
  const [turnoNoite, setTurnoNoite] = useState(() => timeDbToInput(editando?.turno_noite_inicio));
  const [operadorasAtivas, setOperadorasAtivas] = useState<{ slug: string; nome: string }[]>([]);
  const [operadorasSel, setOperadorasSel] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (!cancelled) setOperadorasAtivas(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editando) {
      setOperadorasSel([]);
      return;
    }
    const slugs = (editando.estudios_spin_operadoras ?? []).map((j) => j.operadora_slug);
    setOperadorasSel(slugs);
  }, [editando]);

  const toggleOperadora = (slug: string) => {
    setOperadorasSel((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const salvar = async () => {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do estúdio.");
      return;
    }
    if (!tipo) {
      setErro("Selecione o tipo de estúdio.");
      return;
    }
    if (operadorasSel.length === 0) {
      setErro("Selecione ao menos uma operadora.");
      return;
    }

    setSalvando(true);
    try {
      const slugBase = editando?.slug ?? slugifyEstudio(nome);
      const tm = turnoManha.trim();
      const tt = turnoTarde.trim();
      const tn = turnoNoite.trim();
      const payload = {
        slug: slugBase,
        nome: nome.trim(),
        tipo,
        ativo: editando?.ativo ?? true,
        ...(isEdicao
          ? {
              turno_manha_inicio: tm || null,
              turno_tarde_inicio: tt || null,
              turno_noite_inicio: tn || null,
            }
          : {}),
      };

      if (editando) {
        const { error } = await supabase.from("estudios_spin").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estudios_spin").insert(payload);
        if (error) throw error;
      }

      const estudioSlug = editando?.slug ?? slugBase;
      await supabase.from("estudios_spin_operadoras").delete().eq("estudio_slug", estudioSlug);
      const junctionRows = operadorasSel.map((operadora_slug) => ({
        estudio_slug: estudioSlug,
        operadora_slug,
      }));
      const { error: junctionErr } = await supabase.from("estudios_spin_operadoras").insert(junctionRows);
      if (junctionErr) throw junctionErr;

      onSalvo();
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      if (msg.includes("duplicate") || msg.includes("estudios_spin_slug")) {
        setErro(ERRO_ESTUDIO_DUPLICADO);
      } else {
        console.error(e);
        setErro(ERRO_SALVAR_ESTUDIO);
      }
    } finally {
      setSalvando(false);
    }
  };

  const tryClose = () => {
    if (!salvando) onClose();
  };

  const corChip = dashBrand.useBrand ? dashBrand.primary : BRAND.roxoVivo;

  const tabs = useMemo(
    (): { id: ModalEstudioTabId; label: string }[] =>
      isEdicao
        ? [
            { id: "dados", label: "Dados cadastrais" },
            { id: "operacoes", label: "Operações" },
          ]
        : [],
    [isEdicao],
  );

  const tabIds = useMemo(() => tabs.map((x) => x.id), [tabs]);

  const modalTabIcons: Record<ModalEstudioTabId, ReactNode> = {
    dados: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
    operacoes: <Layers {...FILTRO_BAR_TAB_ICON_PROPS} />,
  };

  const dadosCadastrais = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, color: t.textMuted }}>
      <div>
        <label htmlFor={`${baseId}-nome`} style={fieldLabel}>
          Nome do Estúdio
          <CampoObrigatorioMark />
        </label>
        <input
          id={`${baseId}-nome`}
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Sports Club"
          aria-label="Nome do estúdio (obrigatório)"
          autoComplete="off"
          style={inputStyle(t)}
        />
      </div>
      <div>
        <label htmlFor={`${baseId}-tipo`} style={fieldLabel}>
          Tipo de Estúdio
          <CampoObrigatorioMark />
        </label>
        <select
          id={`${baseId}-tipo`}
          aria-label="Tipo de estúdio (obrigatório)"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as EstudioTipo)}
          style={inputStyle(t)}
        >
          {ESTUDIO_TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span style={fieldLabel}>
          Operadoras
          <CampoObrigatorioMark />
        </span>
        <div
          style={{
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            padding: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            maxHeight: 180,
            overflowY: "auto",
            background: t.inputBg,
          }}
          role="group"
          aria-label="Operadoras (multi-seleção)"
        >
          {operadorasAtivas.length === 0 ? (
            <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhuma operadora ativa disponível.
            </span>
          ) : (
            operadorasAtivas.map((op) => {
              const sel = operadorasSel.includes(op.slug);
              return (
                <button
                  key={op.slug}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => toggleOperadora(op.slug)}
                  style={{
                    border: `1px solid ${sel ? corChip : t.cardBorder}`,
                    background: sel ? `color-mix(in srgb, ${corChip} 15%, transparent)` : "transparent",
                    color: sel ? corChip : t.text,
                    borderRadius: 20,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: sel ? 700 : 400,
                  }}
                >
                  {op.nome}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ModalBase maxWidth={isEdicao ? 560 : 520} onClose={tryClose}>
      <ModalHeader title={editando ? "Editar estúdio" : "Novo estúdio"} onClose={tryClose} />
      {isEdicao ? (
        <div role="tablist" aria-label="Seções do cadastro do estúdio" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {tabs.map((x) => (
            <FiltroBarTabButton
              key={x.id}
              id={`tab-est-${x.id}`}
              active={aba === x.id}
              aria-controls={`panel-est-${x.id}`}
              onClick={() => setAba(x.id)}
              onKeyDown={(e) => handleGestaoTabsArrowKeyDown(e, tabIds, x.id, setAba, "tab-est-")}
              icon={modalTabIcons[x.id]}
            >
              {x.label}
            </FiltroBarTabButton>
          ))}
        </div>
      ) : null}
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
      {!isEdicao || aba === "dados" ? (
        <div
          role={isEdicao ? "tabpanel" : undefined}
          id={isEdicao ? "panel-est-dados" : undefined}
          aria-labelledby={isEdicao ? "tab-est-dados" : undefined}
          tabIndex={isEdicao ? 0 : undefined}
        >
          {dadosCadastrais}
        </div>
      ) : null}
      {isEdicao && aba === "operacoes" ? (
        <div role="tabpanel" id="panel-est-operacoes" aria-labelledby="tab-est-operacoes" tabIndex={0}>
          <TurnosDealersFields
            baseId={baseId}
            turnoManha={turnoManha}
            turnoTarde={turnoTarde}
            turnoNoite={turnoNoite}
            onTurnoManha={setTurnoManha}
            onTurnoTarde={setTurnoTarde}
            onTurnoNoite={setTurnoNoite}
          />
          <p style={{ margin: "4px 0 0", fontSize: 12, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.5 }}>
            Horários usados no RH (Calendário e Gestão de Staff) para dealers vinculados às operadoras deste estúdio.
          </p>
        </div>
      ) : null}
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
