import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FiltroBarCampoOption } from "../../../components/FiltroBarCampoSelect";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import {
  fmtDataBR,
  labelStatusVaga,
  labelTipoVaga,
  organogramaLabelDeVaga,
  statusVagaEfetivo,
  vagaPassaBuscaNomeOuDiretoria,
} from "../../../lib/rhVagasFormat";
import { RhVagasCandidaturasPainel } from "../../../components/rh/vagas/RhVagasCandidaturasPainel";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo, RhVagasAba } from "../../../types/rhVaga";
import type { RhVagasCandidaturasFiltroTipo } from "../../../types/rhVagaCandidatura";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import {
  VAGA_FILTRO_TODAS_VAGAS_VALUE,
  VAGA_FILTRO_TODOS_STATUS_VALUE,
  VAGA_FILTRO_TODOS_TIPOS_VALUE,
} from "../../../lib/rhVagasFiltroConstants";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { getPageContentBoxShellStyle, getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { RhVagasFiltroBar } from "../../../components/rh/vagas/RhVagasFiltroBar";
import { ModalCandidaturaVaga } from "../../../components/rh/vagas/ModalCandidaturaVaga";
import { ModalNovaVaga } from "../../../components/rh/vagas/ModalNovaVaga";
import { ModalAtualizarVaga } from "../../../components/rh/vagas/ModalAtualizarVaga";
import { buscarVagaIdsComCandidaturaDoLogin } from "../../../lib/rhVagaCandidaturaInscricao";

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
  org_gerencia:rh_org_gerencias (
    id,
    nome,
    diretoria:rh_org_diretorias ( nome )
  ),
  org_diretoria:rh_org_diretorias ( id, nome ),
  candidato:rh_funcionarios ( id, nome )
`.trim();


function textoMultilinha(s: string): string {
  const t = (s ?? "").trim();
  return t.length ? t : "—";
}

type ModalStub = { titulo: string; vagaTitulo?: string } | null;

function CampoVaga({ k, v, t }: { k: string; v: string; t: { textMuted: string; text: string } }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
      <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{v}</div>
    </div>
  );
}

export default function RhVagasPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_vagas");

  const [vagas, setVagas] = useState<RhVagaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<RhVagasAba>("abertas");
  const [busca, setBusca] = useState("");
  const [filtroStatusGestao, setFiltroStatusGestao] = useState<RhVagaStatus | "todos">(VAGA_FILTRO_TODOS_STATUS_VALUE);
  const [filtroTipoCand, setFiltroTipoCand] = useState<RhVagasCandidaturasFiltroTipo>(VAGA_FILTRO_TODOS_TIPOS_VALUE);
  const [filtroStatusCand, setFiltroStatusCand] = useState<RhVagaStatus | "todos">(VAGA_FILTRO_TODOS_STATUS_VALUE);
  const [vagaIdFiltroCand, setVagaIdFiltroCand] = useState<string>(VAGA_FILTRO_TODAS_VAGAS_VALUE);
  const [opcoesVagaCandFiltro, setOpcoesVagaCandFiltro] = useState<FiltroBarCampoOption[]>([]);
  const [modalStub, setModalStub] = useState<ModalStub>(null);
  const [modalNovaVagaAberto, setModalNovaVagaAberto] = useState(false);
  const [vagaAtualizar, setVagaAtualizar] = useState<RhVagaRow | null>(null);
  const [vagaCandidatura, setVagaCandidatura] = useState<RhVagaRow | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [vagaExcluirConfirm, setVagaExcluirConfirm] = useState<RhVagaRow | null>(null);
  const [excluindoVaga, setExcluindoVaga] = useState(false);
  const [vagasInscritasIds, setVagasInscritasIds] = useState<Set<string>>(() => new Set());

  const podeCriarVaga = perm.canCriarOk;
  const mostrarAbaGerenciamento = perm.canCriarOk || perm.canExcluirOk;
  const mostrarAbaCandidaturas = perm.canCriarOk;
  const vagaCardShell = getPageContentBoxShellStyle(brand, t);

  const carregar = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setErro(null);
    await supabase.rpc("rh_vagas_atualizar_status_inscricoes_encerradas");
    const { data, error } = await supabase.from("rh_vagas").select(RH_VAGAS_SELECT).order("data_abertura", { ascending: false });
    if (error) {
      setErro(error.message);
      setVagas([]);
    } else {
      setVagas((data ?? []) as unknown as RhVagaRow[]);
    }
    if (!opts?.silent) setLoading(false);
  }, []);

  const recarregarInscricoes = useCallback(async () => {
    const ids = await buscarVagaIdsComCandidaturaDoLogin(user?.email);
    setVagasInscritasIds(ids);
  }, [user?.email]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregar();
  }, [carregar, perm.loading, perm.canView]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void recarregarInscricoes();
  }, [recarregarInscricoes, perm.loading, perm.canView]);

  useEffect(() => {
    if (!mostrarAbaGerenciamento && aba === "gerenciamento") setAba("abertas");
    if (!mostrarAbaCandidaturas && aba === "candidaturas") setAba("abertas");
  }, [mostrarAbaGerenciamento, mostrarAbaCandidaturas, aba]);

  useEffect(() => {
    if (!sucessoMsg) return;
    const id = window.setTimeout(() => setSucessoMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [sucessoMsg]);

  const vagasAbertas = useMemo(
    () => vagas.filter((v) => statusVagaEfetivo(v) === "aberta" && vagaPassaBuscaNomeOuDiretoria(v, busca)),
    [vagas, busca],
  );

  const vagasEmAndamento = useMemo(
    () => vagas.filter((v) => statusVagaEfetivo(v) === "em_andamento" && vagaPassaBuscaNomeOuDiretoria(v, busca)),
    [vagas, busca],
  );

  const vagasGestaoLista = useMemo(() => {
    let list = vagas.filter((v) => vagaPassaBuscaNomeOuDiretoria(v, busca));
    if (filtroStatusGestao !== "todos") list = list.filter((v) => statusVagaEfetivo(v) === filtroStatusGestao);
    return list;
  }, [vagas, busca, filtroStatusGestao]);

  const abrirModalStub = (titulo: string, vagaTitulo?: string) => {
    setModalStub({ titulo, vagaTitulo });
  };

  const executarExclusaoVaga = async () => {
    if (!vagaExcluirConfirm) return;
    setExcluindoVaga(true);
    setErro(null);
    const id = vagaExcluirConfirm.id;
    try {
      const { error } = await supabase.from("rh_vagas").delete().eq("id", id);
      if (error) throw error;
      if (vagaAtualizar?.id === id) setVagaAtualizar(null);
      setVagaExcluirConfirm(null);
      setSucessoMsg("Vaga excluída.");
      void carregar({ silent: true });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao excluir.";
      setErro(msg);
    } finally {
      setExcluindoVaga(false);
    }
  };

  const handleOpcoesVagaCandChange = useCallback((opcoes: FiltroBarCampoOption[]) => {
    setOpcoesVagaCandFiltro(opcoes);
  }, []);

  const resetVagaIdFiltroCand = useCallback(() => {
    setVagaIdFiltroCand(VAGA_FILTRO_TODAS_VAGAS_VALUE);
  }, []);

  const buscaConfig = useMemo(() => {
    if (aba === "candidaturas") {
      return {
        id: "busca-candidaturas",
        placeholder: PAGE_SEARCH.vagaCandidato,
        ariaLabel: "Pesquisar por nome da vaga, nome do candidato ou e-mail do candidato",
      };
    }
    if (aba === "em_andamento") {
      return {
        id: "busca-vagas-andamento",
        placeholder: PAGE_SEARCH.vaga,
        ariaLabel: "Pesquisar vagas em andamento por nome ou diretoria",
      };
    }
    if (aba === "gerenciamento") {
      return {
        id: "busca-vagas-gestao",
        placeholder: PAGE_SEARCH.vaga,
        ariaLabel: "Pesquisar vagas por nome ou diretoria",
      };
    }
    return {
      id: "busca-vagas-abertas",
      placeholder: PAGE_SEARCH.vaga,
      ariaLabel: "Pesquisar vagas abertas por nome ou diretoria",
    };
  }, [aba]);

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

  const vagaArticleStyle = { ...vagaCardShell, padding: 18, marginBottom: 14 };

  const renderCardBase = (v: RhVagaRow, extras?: ReactNode, opts?: { statusLabel?: string }) => (
    <article
      key={v.id}
      style={vagaArticleStyle}
    >
      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
      <CampoVaga k="Código da vaga" v={v.codigo_vaga?.trim() || "—"} t={t} />
      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
      {opts?.statusLabel != null ? <CampoVaga k="Status" v={opts.statusLabel} t={t} /> : null}
      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
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
        background: getCtaCriarGradient(brand),
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

  const btnInscrito = () => (
    <button
      type="button"
      disabled
      aria-disabled="true"
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        color: t.textMuted,
        fontWeight: 600,
        fontSize: 13,
        fontFamily: FONT.body,
        cursor: "not-allowed",
        marginRight: 8,
        marginTop: 12,
        opacity: 0.92,
      }}
    >
      Inscrito
    </button>
  );

  const btnPerigo = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid rgba(232,64,37,0.45)",
        background: t.inputBg,
        color: "#e84025",
        fontWeight: 600,
        fontSize: 13,
        fontFamily: FONT.body,
        cursor: "pointer",
        marginRight: 8,
        marginTop: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Trash2 size={14} aria-hidden />
      {label}
    </button>
  );

  const tipoInterna = (tipo: RhVagaTipo) => tipo === "interna" || tipo === "mista";
  const tipoExterna = (tipo: RhVagaTipo) => tipo === "externa" || tipo === "mista";

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader icon={<PageMenuIcon pageKey="rh_vagas" />} title={getPageMenuLabel("rh_vagas")} subtitle="Candidaturas e processos seletivos" />

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

      {sucessoMsg ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} color="#22c55e" aria-hidden />
          {sucessoMsg}
        </div>
      ) : null}

      <RhVagasFiltroBar
        aba={aba}
        setAba={setAba}
        mostrarGerenciamento={mostrarAbaGerenciamento}
        mostrarCandidaturas={mostrarAbaCandidaturas}
        t={t}
        busca={busca}
        onBuscaChange={setBusca}
        buscaId={buscaConfig.id}
        buscaPlaceholder={buscaConfig.placeholder}
        buscaAriaLabel={buscaConfig.ariaLabel}
        filtroStatusGestao={filtroStatusGestao}
        onFiltroStatusGestao={setFiltroStatusGestao}
        podeCriarVaga={podeCriarVaga}
        onNovaVaga={() => setModalNovaVagaAberto(true)}
        filtroStatusCandidaturas={filtroStatusCand}
        onFiltroStatusCandidaturas={setFiltroStatusCand}
        filtroTipoCandidaturas={filtroTipoCand}
        onFiltroTipoCandidaturas={setFiltroTipoCand}
        opcoesVagaCandidaturas={opcoesVagaCandFiltro}
        vagaIdFiltroCandidaturas={vagaIdFiltroCand}
        onVagaIdFiltroCandidaturas={setVagaIdFiltroCand}
      />

      <div
        role="tabpanel"
        id={`panel-rh-vagas-${aba}`}
        aria-labelledby={`tab-rh-vagas-${aba}`}
        style={{ ...getPageContentBoxStyle(brand, t), minHeight: 200 }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : aba === "abertas" ? (
          <>
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
                      ? vagasInscritasIds.has(v.id)
                        ? btnInscrito()
                        : btnPrim("Candidatura", () => setVagaCandidatura(v))
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
            {vagasEmAndamento.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                Nenhuma vaga em andamento para exibir.
              </div>
            ) : (
              vagasEmAndamento.map((v) => renderCardBase(v))
            )}
          </>
        ) : aba === "candidaturas" ? (
          <RhVagasCandidaturasPainel
            t={t}
            busca={busca}
            filtroTipo={filtroTipoCand}
            filtroStatusVaga={filtroStatusCand}
            vagaIdFiltro={vagaIdFiltroCand}
            onOpcoesVagaChange={handleOpcoesVagaCandChange}
            onVagaIdFiltroReset={resetVagaIdFiltroCand}
            podeEditarEtapa={perm.canEditarOk}
          />
        ) : (
          <>
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
                      style={vagaArticleStyle}
                    >
                      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
                      <CampoVaga k="Código da vaga" v={v.codigo_vaga?.trim() || "—"} t={t} />
                      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
                      <CampoVaga k="Status" v={labelStatusVaga(st)} t={t} />
                      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
                      <CampoVaga k="Data de abertura" v={fmtDataBR(v.data_abertura)} t={t} />
                      <CampoVaga k="Data fim de inscrições" v={fmtDataBR(v.data_fim_inscricoes)} t={t} />
                      <CampoVaga k="Data de encerramento" v={fmtDataBR(v.data_encerramento)} t={t} />
                      <CampoVaga k="Candidato selecionado" v={nomeCand} t={t} />
                      <div style={{ marginTop: 4 }}>
                        {perm.canExcluirOk ? btnPerigo("Excluir", () => setVagaExcluirConfirm(v)) : null}
                      </div>
                    </article>
                  );
                }
                if (st === "cancelada") {
                  return (
                    <article
                      key={v.id}
                      style={vagaArticleStyle}
                    >
                      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{v.titulo}</h3>
                      <CampoVaga k="Código da vaga" v={v.codigo_vaga?.trim() || "—"} t={t} />
                      <CampoVaga k="Tipo da vaga" v={labelTipoVaga(v.tipo_vaga as RhVagaTipo)} t={t} />
                      <CampoVaga k="Status" v={labelStatusVaga(st)} t={t} />
                      <CampoVaga k="Organograma" v={organogramaLabelDeVaga(v)} t={t} />
                      <CampoVaga k="Data de abertura" v={fmtDataBR(v.data_abertura)} t={t} />
                      <CampoVaga k="Data de encerramento" v={fmtDataBR(v.data_encerramento)} t={t} />
                      <CampoVaga k="Motivo do cancelamento" v={textoMultilinha(v.motivo_cancelamento ?? "")} t={t} />
                      <div style={{ marginTop: 4 }}>
                        {perm.canEditarOk ? btnPrim("Atualizar vaga", () => setVagaAtualizar(v)) : null}
                        {perm.canExcluirOk ? btnPerigo("Excluir", () => setVagaExcluirConfirm(v)) : null}
                      </div>
                    </article>
                  );
                }
                return renderCardBase(
                  v,
                  <div style={{ marginTop: 4 }}>
                    {perm.canEditarOk ? btnPrim("Atualizar vaga", () => setVagaAtualizar(v)) : null}
                    {perm.canExcluirOk ? btnPerigo("Excluir", () => setVagaExcluirConfirm(v)) : null}
                  </div>,
                  { statusLabel: labelStatusVaga(st) },
                );
              })
            )}
          </>
        )}
      </div>

      <ModalNovaVaga
        open={modalNovaVagaAberto}
        onClose={() => setModalNovaVagaAberto(false)}
        onSalvo={() => {
          void carregar({ silent: true });
          setSucessoMsg("Vaga criada com status Aberta.");
        }}
        t={t}
      />

      <ModalAtualizarVaga
        open={vagaAtualizar !== null}
        vaga={vagaAtualizar}
        onClose={() => setVagaAtualizar(null)}
        onSalvo={() => {
          void carregar({ silent: true });
          setSucessoMsg("Vaga atualizada com sucesso.");
        }}
        t={t}
      />

      <ModalCandidaturaVaga
        open={vagaCandidatura !== null}
        vaga={vagaCandidatura}
        onClose={() => setVagaCandidatura(null)}
        onSalvo={() => {
          void recarregarInscricoes();
          setSucessoMsg("Candidatura enviada com sucesso.");
        }}
        t={t}
      />

      {vagaExcluirConfirm ? (
        <ModalBase maxWidth={440} onClose={() => !excluindoVaga && setVagaExcluirConfirm(null)}>
          <ModalHeader
            title="Excluir vaga?"
            onClose={() => {
              if (!excluindoVaga) setVagaExcluirConfirm(null);
            }}
          />
          <div style={{ padding: "0 4px 8px", fontFamily: FONT.body }}>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: t.text, lineHeight: 1.5 }}>
              Esta ação remove permanentemente a vaga <strong>{vagaExcluirConfirm.titulo}</strong>. Não é possível desfazer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={excluindoVaga}
                onClick={() => setVagaExcluirConfirm(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: excluindoVaga ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindoVaga}
                onClick={() => void executarExclusaoVaga()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "#e84025",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: excluindoVaga ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {excluindoVaga ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

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
              background: getCtaCriarGradient(brand),
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
