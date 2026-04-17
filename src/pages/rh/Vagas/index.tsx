import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Briefcase, Loader2, Plus, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import {
  fmtDataBR,
  labelStatusVaga,
  labelTipoVaga,
  organogramaLabelDeVaga,
  vagaPassaBuscaNomeOuDiretoria,
} from "../../../lib/rhVagasFormat";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo, RhVagasAba } from "../../../types/rhVaga";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { RhVagasFiltroBar } from "../../../components/rh/vagas/RhVagasFiltroBar";

const RH_VAGAS_SELECT = `
  *,
  org_time:rh_org_times (
    id,
    nome,
    gerencia:rh_org_gerencias (
      nome,
      diretoria:rh_org_diretorias ( nome )
    )
  ),
  candidato:rh_funcionarios ( id, nome )
`.trim();

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function fmtRemuneracao(centavos: number): string {
  return fmtBRL(centavos / 100);
}

function textoMultilinha(s: string): string {
  const t = (s ?? "").trim();
  return t.length ? t : "—";
}

type ModalStub = { titulo: string; vagaTitulo?: string } | null;

const STATUS_GESTAO_FILTRO: Array<RhVagaStatus | "todos"> = [
  "todos",
  "aberta",
  "em_andamento",
  "concluida",
  "cancelada",
];

const LABEL_STATUS_FILTRO: Record<RhVagaStatus | "todos", string> = {
  todos: "Todos os status",
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function CampoVaga({ k, v, t }: { k: string; v: string; t: { textMuted: string; text: string } }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
      <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{v}</div>
    </div>
  );
}

export default function RhVagasPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_vagas");

  const [vagas, setVagas] = useState<RhVagaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<RhVagasAba>("abertas");
  const [busca, setBusca] = useState("");
  const [filtroStatusGestao, setFiltroStatusGestao] = useState<RhVagaStatus | "todos">("todos");
  const [modalStub, setModalStub] = useState<ModalStub>(null);

  const podeGerenciarAba = perm.canCriarOk;
  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.from("rh_vagas").select(RH_VAGAS_SELECT).order("data_abertura", { ascending: false });
    if (error) {
      setErro(error.message);
      setVagas([]);
    } else {
      setVagas((data ?? []) as unknown as RhVagaRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregar();
  }, [carregar, perm.loading, perm.canView]);

  useEffect(() => {
    if (!podeGerenciarAba && aba === "gerenciamento") setAba("abertas");
  }, [podeGerenciarAba, aba]);

  const vagasAbertas = useMemo(
    () => vagas.filter((v) => v.status === "aberta" && vagaPassaBuscaNomeOuDiretoria(v, busca)),
    [vagas, busca],
  );

  const vagasEmAndamento = useMemo(
    () => vagas.filter((v) => v.status === "em_andamento" && vagaPassaBuscaNomeOuDiretoria(v, busca)),
    [vagas, busca],
  );

  const vagasGestaoLista = useMemo(() => {
    let list = vagas.filter((v) => vagaPassaBuscaNomeOuDiretoria(v, busca));
    if (filtroStatusGestao !== "todos") list = list.filter((v) => v.status === filtroStatusGestao);
    return list;
  }, [vagas, busca, filtroStatusGestao]);

  const abrirModalStub = (titulo: string, vagaTitulo?: string) => {
    setModalStub({ titulo, vagaTitulo });
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const inputBusca = (id: string, ariaLabel: string) => (
    <div style={{ position: "relative", maxWidth: 480, marginBottom: 16 }}>
      <Search
        size={16}
        aria-hidden
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: t.textMuted,
          pointerEvents: "none",
        }}
      />
      <input
        id={id}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome da vaga ou diretoria…"
        autoComplete="off"
        aria-label={ariaLabel}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px 10px 38px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          fontSize: 14,
          fontFamily: FONT.body,
          outline: "none",
        }}
      />
    </div>
  );

  const renderCardBase = (v: RhVagaRow, extras?: ReactNode, opts?: { statusLabel?: string }) => (
    <article
      key={v.id}
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        padding: 18,
        marginBottom: 14,
        boxShadow: cardShadow,
        background: t.cardBg ?? t.inputBg,
      }}
    >
      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
      {opts?.statusLabel != null ? <CampoVaga k="Status" v={opts.statusLabel} t={t} /> : null}
      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
      <CampoVaga k="Remuneração mensal" v={fmtRemuneracao(v.remuneracao_centavos)} t={t} />
      <CampoVaga k="Data de abertura" v={fmtDataBR(v.data_abertura)} t={t} />
      <CampoVaga k="Data fim de inscrições" v={fmtDataBR(v.data_fim_inscricoes)} t={t} />
      <CampoVaga k="Descrição" v={textoMultilinha(v.descricao)} t={t} />
      <CampoVaga k="Responsabilidade" v={textoMultilinha(v.responsabilidades)} t={t} />
      <CampoVaga k="Requisitos" v={textoMultilinha(v.requisitos)} t={t} />
      <CampoVaga k="Escala de trabalho" v={textoMultilinha(v.escala_trabalho)} t={t} />
      {extras}
    </article>
  );

  const btnSec = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        color: t.text,
        fontWeight: 600,
        fontSize: 13,
        fontFamily: FONT.body,
        cursor: "pointer",
        marginRight: 8,
        marginTop: 12,
      }}
    >
      {label}
    </button>
  );

  const btnPrim = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "none",
        background: ctaGradient(brand),
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: FONT.body,
        cursor: "pointer",
        marginRight: 8,
        marginTop: 12,
      }}
    >
      {label}
    </button>
  );

  const tipoInterna = (tipo: RhVagaTipo) => tipo === "interna" || tipo === "mista";
  const tipoExterna = (tipo: RhVagaTipo) => tipo === "externa" || tipo === "mista";

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader icon={<Briefcase size={16} aria-hidden />} title="Vagas" subtitle="Candidaturas e processos seletivos" />

      {erro ? (
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
          }}
        >
          {erro}
        </div>
      ) : null}

      <RhVagasFiltroBar
        aba={aba}
        setAba={setAba}
        mostrarGerenciamento={podeGerenciarAba}
        t={t}
        brand={{ blockBg: brand.blockBg, accent: brand.accent, useBrand: brand.useBrand }}
      />

      <div
        role="tabpanel"
        id={`panel-rh-vagas-${aba}`}
        aria-labelledby={`tab-rh-vagas-${aba}`}
        style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          padding: 20,
          boxShadow: cardShadow,
          minHeight: 200,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : aba === "abertas" ? (
          <>
            <header style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Vagas Abertas</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>Vagas abertas para candidatura.</p>
              <label htmlFor="busca-vagas-abertas" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                Pesquisar por nome da vaga ou diretoria
              </label>
              {inputBusca("busca-vagas-abertas", "Pesquisar vagas abertas por nome ou diretoria")}
            </header>
            {vagasAbertas.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                Nenhuma vaga aberta para exibir.
              </div>
            ) : (
              vagasAbertas.map((v) =>
                renderCardBase(
                  v,
                  <div style={{ marginTop: 4 }}>
                    {tipoInterna(v.tipo_vaga as RhVagaTipo)
                      ? btnPrim("Candidatura", () => abrirModalStub("Candidatura", v.titulo))
                      : null}
                    {tipoExterna(v.tipo_vaga as RhVagaTipo)
                      ? btnSec("Compartilhar", () => abrirModalStub("Compartilhar", v.titulo))
                      : null}
                  </div>,
                ),
              )
            )}
          </>
        ) : aba === "em_andamento" ? (
          <>
            <header style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Vagas em Andamento</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
                Vagas com inscrição encerradas mas que estão em andamento de processo seletivo.
              </p>
              <label htmlFor="busca-vagas-andamento" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                Pesquisar por nome da vaga ou diretoria
              </label>
              {inputBusca("busca-vagas-andamento", "Pesquisar vagas em andamento por nome ou diretoria")}
            </header>
            {vagasEmAndamento.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                Nenhuma vaga em andamento para exibir.
              </div>
            ) : (
              vagasEmAndamento.map((v) => renderCardBase(v))
            )}
          </>
        ) : (
          <>
            <header style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>Gerenciamento de Vagas</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
                Abertura de vagas e acompanhamento das inscrições.
              </p>
              <label htmlFor="busca-vagas-gestao" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                Pesquisar por nome da vaga ou diretoria
              </label>
              {inputBusca("busca-vagas-gestao", "Pesquisar vagas por nome ou diretoria")}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div>
                  <label htmlFor="filtro-status-vaga" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                    Status da vaga
                  </label>
                  <select
                    id="filtro-status-vaga"
                    value={filtroStatusGestao}
                    onChange={(e) => setFiltroStatusGestao(e.target.value as RhVagaStatus | "todos")}
                    aria-label="Filtrar por status da vaga"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      fontSize: 14,
                      fontFamily: FONT.body,
                      minWidth: 200,
                    }}
                  >
                    {STATUS_GESTAO_FILTRO.map((s) => (
                      <option key={s} value={s}>
                        {LABEL_STATUS_FILTRO[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => abrirModalStub("Nova vaga")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    background: ctaGradient(brand),
                  }}
                >
                  <Plus size={16} aria-hidden />
                  Nova vaga
                </button>
              </div>
            </header>
            {vagasGestaoLista.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                Nenhuma vaga para os filtros atuais.
              </div>
            ) : (
              vagasGestaoLista.map((v) => {
                const st = v.status as RhVagaStatus;
                if (st === "concluida") {
                  const nomeCand = v.candidato?.nome?.trim() || "—";
                  return (
                    <article
                      key={v.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${t.cardBorder}`,
                        padding: 18,
                        marginBottom: 14,
                        boxShadow: cardShadow,
                        background: t.cardBg ?? t.inputBg,
                      }}
                    >
                      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
                      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
                      <CampoVaga k="Status" v={labelStatusVaga(st)} t={t} />
                      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
                      <CampoVaga k="Remuneração mensal" v={fmtRemuneracao(v.remuneracao_centavos)} t={t} />
                      <CampoVaga k="Data de abertura" v={fmtDataBR(v.data_abertura)} t={t} />
                      <CampoVaga k="Data fim de inscrições" v={fmtDataBR(v.data_fim_inscricoes)} t={t} />
                      <CampoVaga k="Data de encerramento" v={fmtDataBR(v.data_encerramento)} t={t} />
                      <CampoVaga k="Candidato selecionado" v={nomeCand} t={t} />
                      <div style={{ marginTop: 4 }}>{btnSec("Ver candidaturas", () => abrirModalStub("Ver candidaturas", v.titulo))}</div>
                    </article>
                  );
                }
                if (st === "cancelada") {
                  return (
                    <article
                      key={v.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${t.cardBorder}`,
                        padding: 18,
                        marginBottom: 14,
                        boxShadow: cardShadow,
                        background: t.cardBg ?? t.inputBg,
                      }}
                    >
                      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
                      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
                      <CampoVaga k="Status" v={labelStatusVaga(st)} t={t} />
                      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
                      <CampoVaga k="Remuneração mensal" v={fmtRemuneracao(v.remuneracao_centavos)} t={t} />
                      <CampoVaga k="Data de abertura" v={fmtDataBR(v.data_abertura)} t={t} />
                      <CampoVaga k="Data de encerramento" v={fmtDataBR(v.data_encerramento)} t={t} />
                      <CampoVaga k="Motivo do cancelamento" v={textoMultilinha(v.motivo_cancelamento ?? "")} t={t} />
                      <div style={{ marginTop: 4 }}>
                        {btnSec("Ver candidaturas", () => abrirModalStub("Ver candidaturas", v.titulo))}
                        {btnPrim("Atualizar vaga", () => abrirModalStub("Atualizar vaga", v.titulo))}
                      </div>
                    </article>
                  );
                }
                return renderCardBase(
                  v,
                  <div style={{ marginTop: 4 }}>
                    {btnSec("Ver candidaturas", () => abrirModalStub("Ver candidaturas", v.titulo))}
                    {btnPrim("Atualizar vaga", () => abrirModalStub("Atualizar vaga", v.titulo))}
                  </div>,
                  { statusLabel: labelStatusVaga(st) },
                );
              })
            )}
          </>
        )}
      </div>

      {modalStub ? (
        <ModalBase maxWidth={440} onClose={() => setModalStub(null)}>
          <ModalHeader title={modalStub.titulo} onClose={() => setModalStub(null)} />
          <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.5, fontFamily: FONT.body }}>
            {modalStub.vagaTitulo ? (
              <>
                Vaga: <strong style={{ color: t.text }}>{modalStub.vagaTitulo}</strong>
                <br />
                <br />
              </>
            ) : null}
            Conteúdo do modal será implementado na sequência.
          </p>
          <button
            type="button"
            onClick={() => setModalStub(null)}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </ModalBase>
      ) : null}
    </div>
  );
}
