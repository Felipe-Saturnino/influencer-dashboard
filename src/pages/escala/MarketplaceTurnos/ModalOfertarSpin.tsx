import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { supabase } from "../../../lib/supabase";
import {
  criarOfertaSpinMarketplace,
  mensagemErroOfertaMarketplace,
  timeKeyFromOrgTimeNome,
  type TipoOfertaSpinMarketplace,
} from "../../../lib/escalaMarketplace";

const TIPOS_SPIN: { value: TipoOfertaSpinMarketplace; label: string; ajuda: string }[] = [
  {
    value: "oferta_spin_cobertura",
    label: "Cobertura de turno",
    ajuda: "Prestador de folga assume o turno — aparece em Ofertas de Turno.",
  },
  {
    value: "oferta_spin_liberacao",
    label: "Liberação de vaga",
    ajuda: "Prestador escalado libera o turno — aparece em Ofertas de Folga.",
  },
];

const TURNOS_SPIN = ["Manhã", "Tarde", "Noite"] as const;

type TimeSpinOpcao = {
  id: string;
  label: string;
  grupo: "game_presenter" | "shuffler" | "lideranca";
};

type EstudioOpcao = { slug: string; nome: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCriada: () => void;
};

function resolverGrupoTime(nome: string | null | undefined): TimeSpinOpcao["grupo"] | null {
  const key = timeKeyFromOrgTimeNome(nome);
  if (key === "game_presenter") return "game_presenter";
  if (key === "shuffler") return "shuffler";
  if (key === "shift_leader" || key === "service_manager") return "lideranca";
  return null;
}

function labelGrupoTime(grupo: TimeSpinOpcao["grupo"]): string {
  if (grupo === "game_presenter") return "Game Presenter";
  if (grupo === "shuffler") return "Shuffler";
  return "Liderança";
}

export function ModalOfertarSpin({ open, onClose, onCriada }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const [times, setTimes] = useState<TimeSpinOpcao[]>([]);
  const [estudios, setEstudios] = useState<EstudioOpcao[]>([]);
  const [carregandoCat, setCarregandoCat] = useState(false);

  const [grupoTime, setGrupoTime] = useState<TimeSpinOpcao["grupo"]>("game_presenter");
  const [tipo, setTipo] = useState<TipoOfertaSpinMarketplace>("oferta_spin_cobertura");
  const [diaIso, setDiaIso] = useState("");
  const [turno, setTurno] = useState<string>("Manhã");
  const [estudioSlug, setEstudioSlug] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGrupoTime("game_presenter");
    setTipo("oferta_spin_cobertura");
    setDiaIso("");
    setTurno("Manhã");
    setEstudioSlug("");
    setObservacao("");
    setErro(null);
    setGravando(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCarregandoCat(true);
    void Promise.all([
      supabase.from("rh_org_times").select("id, nome").eq("status", "ativo").order("nome"),
      supabase.from("estudios_spin").select("slug, nome").eq("ativo", true).order("nome"),
    ])
      .then(([timesRes, estRes]) => {
        if (cancelled) return;
        if (timesRes.error) console.error("[ModalOfertarSpin] times", timesRes.error);
        if (estRes.error) console.error("[ModalOfertarSpin] estudios", estRes.error);

        const porGrupo = new Map<TimeSpinOpcao["grupo"], TimeSpinOpcao>();
        for (const row of timesRes.data ?? []) {
          const grupo = resolverGrupoTime(row.nome);
          if (!grupo || !row.id) continue;
          if (grupo === "lideranca" && porGrupo.has("lideranca")) continue;
          if (!porGrupo.has(grupo)) {
            porGrupo.set(grupo, {
              id: row.id,
              label: labelGrupoTime(grupo),
              grupo,
            });
          }
        }
        setTimes([...porGrupo.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")));
        setEstudios(
          (estRes.data ?? [])
            .filter((e) => e.slug && e.nome)
            .map((e) => ({ slug: String(e.slug), nome: String(e.nome) })),
        );
      })
      .finally(() => {
        if (!cancelled) setCarregandoCat(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const orgTimeId = useMemo(
    () => times.find((x) => x.grupo === grupoTime)?.id ?? "",
    [times, grupoTime],
  );

  const minDiaIso = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, []);

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: t.text,
    marginBottom: 6,
    fontFamily: FONT.body,
  };

  async function salvar() {
    setErro(null);
    if (!orgTimeId) {
      setErro("Não encontramos o time selecionado. Atualize a página e tente novamente.");
      return;
    }
    if (!diaIso) {
      setErro("Escolha o dia da oferta.");
      return;
    }
    if (!estudioSlug) {
      setErro("Escolha o estúdio da oferta.");
      return;
    }
    setGravando(true);
    const res = await criarOfertaSpinMarketplace({
      tipo,
      orgTimeId,
      diaIso,
      turnoLabel: turno,
      estudioSlug,
      observacao: observacao.trim() || null,
    });
    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onCriada();
    onClose();
  }

  if (!open) return null;

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Nova Oferta Spin" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {carregandoCat ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
            Carregando…
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Time
                <CampoObrigatorioMark />
              </label>
              <select
                value={grupoTime}
                onChange={(e) => setGrupoTime(e.target.value as TimeSpinOpcao["grupo"])}
                style={inputStyle}
                aria-label="Time da oferta Spin"
                disabled={gravando}
              >
                {(["game_presenter", "shuffler", "lideranca"] as const).map((g) => (
                  <option key={g} value={g} disabled={!times.some((x) => x.grupo === g)}>
                    {labelGrupoTime(g)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Tipo da oferta
                <CampoObrigatorioMark />
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoOfertaSpinMarketplace)}
                style={inputStyle}
                aria-label="Tipo da oferta Spin"
                disabled={gravando}
              >
                {TIPOS_SPIN.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: t.textMuted }}>
                {TIPOS_SPIN.find((x) => x.value === tipo)?.ajuda}
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Dia
                <CampoObrigatorioMark />
              </label>
              <input
                type="date"
                value={diaIso}
                min={minDiaIso}
                onChange={(e) => setDiaIso(e.target.value)}
                style={inputStyle}
                aria-label="Dia da oferta Spin"
                disabled={gravando}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Turno
                <CampoObrigatorioMark />
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                style={inputStyle}
                aria-label="Turno da oferta Spin"
                disabled={gravando}
              >
                {TURNOS_SPIN.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Estúdio
                <CampoObrigatorioMark />
              </label>
              <select
                value={estudioSlug}
                onChange={(e) => setEstudioSlug(e.target.value)}
                style={inputStyle}
                aria-label="Estúdio da oferta Spin"
                disabled={gravando || estudios.length === 0}
              >
                <option value="">Selecione…</option>
                {estudios.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Observação</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                maxLength={500}
                style={{ ...inputStyle, resize: "vertical" }}
                aria-label="Observação da oferta Spin"
                disabled={gravando}
              />
            </div>

            {erro ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}
              >
                {erro}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={gravando || carregandoCat}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: gravando ? "wait" : "pointer",
                  fontFamily: FONT.body,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {gravando ? (
                  <>
                    <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                    Publicando…
                  </>
                ) : (
                  "Publicar oferta"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}
