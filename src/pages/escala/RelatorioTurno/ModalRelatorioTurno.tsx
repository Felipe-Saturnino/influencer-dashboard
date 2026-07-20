import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  dataPadraoRelatorioTurno,
  fetchEstudiosAtivosRelatorio,
  HINT_DATA_TURNO,
  opcoesDataTurnoRelatorio,
  publicarRelatorioTurno,
  TURNO_TURNO_OPCOES,
  type EstudioAtivoOpt,
  type TurnoRelatorioTurno,
} from "../../../lib/escalaRelatorioTurno";

const ERRO_PUBLICAR =
  "Não foi possível publicar o relatório. Se o problema persistir, entre em contato com o suporte.";

type BlocoEstudioForm = {
  slug: string;
  nome: string;
  gp: string;
  abs: string;
  resumo: string;
};

export function ModalRelatorioTurno({
  onClose,
  onPublicado,
}: {
  onClose: () => void;
  onPublicado: () => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const opcoesData = useMemo(() => opcoesDataTurnoRelatorio(), []);
  const [dataTurno, setDataTurno] = useState(dataPadraoRelatorioTurno);
  const [estudios, setEstudios] = useState<EstudioAtivoOpt[]>([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [turno, setTurno] = useState<TurnoRelatorioTurno | "">("");
  const [blocos, setBlocos] = useState<BlocoEstudioForm[]>([]);
  const [shufEsc, setShufEsc] = useState("");
  const [shufAbs, setShufAbs] = useState("");
  const [shufResumo, setShufResumo] = useState("");
  const [geral, setGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingEst(true);
    void fetchEstudiosAtivosRelatorio().then((list) => {
      if (cancelled) return;
      setEstudios(list);
      setBlocos(
        list.map((e) => ({
          slug: e.slug,
          nome: e.nome,
          gp: "",
          abs: "",
          resumo: "",
        })),
      );
      setLoadingEst(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fieldStyle = useMemo(
    () =>
      ({
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        color: t.text,
        fontSize: 13,
        fontFamily: FONT.body,
        boxSizing: "border-box" as const,
      }) as const,
    [t],
  );

  const updateBloco = (slug: string, patch: Partial<BlocoEstudioForm>) => {
    setBlocos((prev) => prev.map((b) => (b.slug === slug ? { ...b, ...patch } : b)));
  };

  const publicar = async () => {
    setErro(null);
    if (!dataTurno) {
      setErro("Selecione a data do turno.");
      return;
    }
    if (!turno) {
      setErro("Selecione o turno.");
      return;
    }
    if (estudios.length === 0) {
      setErro("Não há estúdios ativos para montar o relatório.");
      return;
    }
    for (const b of blocos) {
      if (b.gp.trim() === "" || b.abs.trim() === "" || !b.resumo.trim()) {
        setErro(`Preencha todos os campos obrigatórios do estúdio ${b.nome}.`);
        return;
      }
      if (Number(b.gp) < 0 || Number(b.abs) < 0 || Number.isNaN(Number(b.gp)) || Number.isNaN(Number(b.abs))) {
        setErro(`Valores numéricos inválidos no estúdio ${b.nome}.`);
        return;
      }
    }
    if (shufEsc.trim() === "" || shufAbs.trim() === "" || !shufResumo.trim()) {
      setErro("Preencha todos os campos do bloco Shufflers.");
      return;
    }
    if (!geral.trim()) {
      setErro("Preencha o campo Geral.");
      return;
    }

    setSalvando(true);
    const res = await publicarRelatorioTurno({
      data: dataTurno,
      turno,
      relatorNome: user?.name?.trim() || user?.email || "Usuário",
      geral,
      estudios: blocos.map((b) => ({
        estudio_slug: b.slug,
        estudio_nome: b.nome,
        gp_escalados: Number(b.gp),
        absenteismo: Number(b.abs),
        resumo: b.resumo,
      })),
      shuffler: {
        shuffler_escalados: Number(shufEsc),
        absenteismo: Number(shufAbs),
        resumo: shufResumo,
      },
    });
    setSalvando(false);
    if (!res.ok) {
      setErro(ERRO_PUBLICAR);
      return;
    }
    onPublicado();
    onClose();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={720}>
      <ModalHeader title="Novo Relatório do Turno" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", maxHeight: "70dvh", overflowY: "auto" }}>
        {erro ? (
          <div
            role="alert"
            aria-live="polite"
            style={{
              color: "#e84025",
              fontSize: 12,
              fontFamily: FONT.body,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} aria-hidden />
            {erro}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT.body }}>
              Data do turno <CampoObrigatorioMark />
            </label>
            <select
              style={fieldStyle}
              value={dataTurno}
              onChange={(e) => setDataTurno(e.target.value)}
              aria-label="Data do turno"
            >
              {opcoesData.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT.body }}>
              Responsável <CampoObrigatorioMark />
            </label>
            <input
              style={fieldStyle}
              value={user?.name?.trim() || user?.email || "—"}
              disabled
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT.body }}>
              Turno <CampoObrigatorioMark />
            </label>
            <select
              style={fieldStyle}
              value={turno}
              onChange={(e) => setTurno(e.target.value as TurnoRelatorioTurno | "")}
              aria-label="Turno"
            >
              <option value="">Selecione…</option>
              {TURNO_TURNO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
          {HINT_DATA_TURNO}
        </p>

        {loadingEst ? (
          <div style={{ textAlign: "center", color: t.textMuted, padding: 24 }}>
            <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <div style={{ marginTop: 8 }}>Carregando…</div>
          </div>
        ) : (
          <>
            {blocos.map((b) => (
              <div
                key={b.slug}
                style={{
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  background: t.isDark ? t.cardBg : "#faf8ff",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: brand.primary,
                    marginBottom: 12,
                    fontFamily: FONT.body,
                  }}
                >
                  {b.nome}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Game Presenter Escalados <CampoObrigatorioMark />
                    </label>
                    <input
                      style={fieldStyle}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={b.gp}
                      onChange={(e) => updateBloco(b.slug, { gp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Atrasos / Faltas / Atestados <CampoObrigatorioMark />
                    </label>
                    <input
                      style={fieldStyle}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={b.abs}
                      onChange={(e) => updateBloco(b.slug, { abs: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Resumo <CampoObrigatorioMark />
                  </label>
                  <textarea
                    style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }}
                    value={b.resumo}
                    onChange={(e) => updateBloco(b.slug, { resumo: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <div
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                background: t.isDark ? t.cardBg : "#f5f7ff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: brand.primary,
                  marginBottom: 12,
                }}
              >
                Shufflers
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Shuffler Escalados <CampoObrigatorioMark />
                  </label>
                  <input
                    style={fieldStyle}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={shufEsc}
                    onChange={(e) => setShufEsc(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Atrasos / Faltas / Atestados <CampoObrigatorioMark />
                  </label>
                  <input
                    style={fieldStyle}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={shufAbs}
                    onChange={(e) => setShufAbs(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Resumo <CampoObrigatorioMark />
                </label>
                <textarea
                  style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }}
                  value={shufResumo}
                  onChange={(e) => setShufResumo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Geral <CampoObrigatorioMark />
              </label>
              <textarea
                style={{ ...fieldStyle, minHeight: 88, resize: "vertical" }}
                value={geral}
                onChange={(e) => setGeral(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          padding: "12px 20px 20px",
          borderTop: `1px solid ${t.cardBorder}`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT.body,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando || loadingEst}
          onClick={() => void publicar()}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            cursor: salvando ? "wait" : "pointer",
            fontFamily: FONT.body,
            opacity: salvando || loadingEst ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {salvando ? <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden /> : null}
          {salvando ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </ModalBase>
  );
}
