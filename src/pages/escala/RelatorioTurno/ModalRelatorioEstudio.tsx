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
  fetchOpcoesManutencao,
  HINT_DATA_TURNO,
  opcoesDataTurnoRelatorio,
  publicarRelatorioEstudio,
  TURNO_ESTUDIO_OPCOES,
  type EstudioAtivoOpt,
  type ManutencaoPayload,
  type RoletaOpt,
  type TurnoRelatorioEstudio,
} from "../../../lib/escalaRelatorioTurno";

const ERRO_PUBLICAR =
  "Não foi possível publicar o relatório. Se o problema persistir, entre em contato com o suporte.";

function parseInteiroNaoNegativo(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

export function ModalRelatorioEstudio({
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
  const [loading, setLoading] = useState(true);
  const [estudios, setEstudios] = useState<EstudioAtivoOpt[]>([]);
  const [roletas, setRoletas] = useState<RoletaOpt[]>([]);
  const [turno, setTurno] = useState<TurnoRelatorioEstudio | "">("");
  const [sos, setSos] = useState("");
  const [sinais, setSinais] = useState("");
  const [payout, setPayout] = useState("");
  const [resumo, setResumo] = useState("");
  const [roletaFeito, setRoletaFeito] = useState<Record<string, boolean>>({});
  const [mesaFeito, setMesaFeito] = useState<Record<string, boolean>>({});
  const [ccMachine, setCcMachine] = useState(false);
  const [cartas, setCartas] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchOpcoesManutencao().then(({ estudios: est, roletas: rol }) => {
      if (cancelled) return;
      setEstudios(est);
      setRoletas(rol);
      setLoading(false);
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
    const sosN = parseInteiroNaoNegativo(sos);
    const sinaisN = parseInteiroNaoNegativo(sinais);
    const payoutN = parseInteiroNaoNegativo(payout);
    if (sosN == null || sinaisN == null || payoutN == null) {
      setErro("SOSs, Sinais e Payout devem ser números inteiros (0 ou maior).");
      return;
    }
    if (!resumo.trim()) {
      setErro("Preencha o Resumo.");
      return;
    }

    const manutencao: ManutencaoPayload = {
      roletas: roletas.map((r) => ({
        key: r.key,
        label: r.label,
        feito: Boolean(roletaFeito[r.key]),
      })),
      mesas: estudios.map((e) => ({
        slug: e.slug,
        nome: e.nome,
        feito: Boolean(mesaFeito[e.slug]),
      })),
      cc_machine: ccMachine,
      cartas_contadas: cartas,
    };

    setSalvando(true);
    const res = await publicarRelatorioEstudio({
      data: dataTurno,
      turno,
      relatorNome: user?.name?.trim() || user?.email || "Usuário",
      sos: sosN,
      sinais: sinaisN,
      payout: payoutN,
      resumo,
      manutencao,
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
      <ModalHeader title="Novo Relatório de Estúdio" onClose={onClose} />
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Responsável <CampoObrigatorioMark />
            </label>
            <input style={fieldStyle} value={user?.name?.trim() || user?.email || "—"} disabled />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Turno <CampoObrigatorioMark />
            </label>
            <select
              style={fieldStyle}
              value={turno}
              onChange={(e) => setTurno(e.target.value as TurnoRelatorioEstudio | "")}
              aria-label="Turno"
            >
              <option value="">Selecione…</option>
              {TURNO_ESTUDIO_OPCOES.map((o) => (
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              SOSs <CampoObrigatorioMark />
            </label>
            <input
              style={fieldStyle}
              type="number"
              min={0}
              inputMode="numeric"
              value={sos}
              onChange={(e) => setSos(e.target.value)}
              aria-label="SOSs"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Sinais <CampoObrigatorioMark />
            </label>
            <input
              style={fieldStyle}
              type="number"
              min={0}
              inputMode="numeric"
              value={sinais}
              onChange={(e) => setSinais(e.target.value)}
              aria-label="Sinais"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Payout <CampoObrigatorioMark />
            </label>
            <input
              style={fieldStyle}
              type="number"
              min={0}
              inputMode="numeric"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              aria-label="Payout"
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            Resumo <CampoObrigatorioMark />
          </label>
          <textarea
            style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }}
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
        </div>

        <div
          style={{
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 14,
            background: t.isDark ? t.cardBg : "#f9fafb",
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
            Manutenção
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: t.textMuted, padding: 16 }}>
              <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
              <div style={{ marginTop: 8 }}>Carregando…</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Roletas</div>
                {roletas.length === 0 ? (
                  <div style={{ fontSize: 12, color: t.textMuted }}>Nenhuma roleta cadastrada.</div>
                ) : (
                  roletas.map((r) => (
                    <label
                      key={r.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 0",
                        fontSize: 13,
                        fontFamily: FONT.body,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(roletaFeito[r.key])}
                        onChange={(e) =>
                          setRoletaFeito((prev) => ({ ...prev, [r.key]: e.target.checked }))
                        }
                      />
                      {r.label}
                    </label>
                  ))
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Mesas</div>
                {estudios.map((e) => (
                  <label
                    key={e.slug}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 0",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(mesaFeito[e.slug])}
                      onChange={(ev) =>
                        setMesaFeito((prev) => ({ ...prev, [e.slug]: ev.target.checked }))
                      }
                    />
                    {e.nome}
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CC Machine</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={ccMachine} onChange={(e) => setCcMachine(e.target.checked)} />
                  Concluído
                </label>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Cartas Contadas</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={cartas} onChange={(e) => setCartas(e.target.checked)} />
                  Concluído
                </label>
              </div>
            </>
          )}
        </div>
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
          disabled={salvando || loading}
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
            opacity: salvando || loading ? 0.7 : 1,
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
