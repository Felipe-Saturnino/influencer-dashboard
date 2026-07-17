import { useEffect, useState, type ReactNode } from "react";
import { FileText, MessageSquareText, History, Paperclip } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import {
  fetchEstoqueAnotacoes,
  fetchEstoqueHistorico,
  formatDataHoraEstoque,
  type EstoqueAnotacaoRow,
  type EstoqueEntidadeTipo,
  type EstoqueHistoricoRow,
} from "../../../lib/techOpsEstoque";

type AbaVer = "dados" | "anotacoes" | "historico";

const ERRO_CARREGAR =
  "Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.";

/**
 * Modal «Ver» genérico das entidades de estoque — 1ª aba com conteúdo da
 * entidade (injetado) + abas Anotações e Histórico carregadas do Supabase.
 */
export function ModalVerEstoque({
  titulo,
  subtitulo,
  primeiraAbaLabel,
  primeiraAbaConteudo,
  entidadeTipo,
  entidadeId,
  onClose,
}: {
  titulo: string;
  subtitulo: string;
  primeiraAbaLabel: string;
  primeiraAbaConteudo: ReactNode;
  entidadeTipo: EstoqueEntidadeTipo;
  entidadeId: string;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaVer>("dados");
  const [anotacoes, setAnotacoes] = useState<EstoqueAnotacaoRow[]>([]);
  const [historico, setHistorico] = useState<EstoqueHistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [an, hi] = await Promise.all([
          fetchEstoqueAnotacoes(entidadeTipo, entidadeId),
          fetchEstoqueHistorico(entidadeTipo, entidadeId),
        ]);
        if (cancel) return;
        setAnotacoes(an);
        setHistorico(hi);
      } catch (e) {
        console.error("Gestão de Estoque: falha ao carregar anotações/histórico", e);
        if (!cancel) setErro(ERRO_CARREGAR);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [entidadeTipo, entidadeId]);

  const tabs: { id: AbaVer; label: string; icon: ReactNode }[] = [
    { id: "dados", label: primeiraAbaLabel, icon: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "anotacoes", label: "Anotações", icon: <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "historico", label: "Histórico", icon: <History {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  const cardItemStyle = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    fontFamily: FONT.body,
  } as const;

  const metaStyle = {
    fontSize: 11,
    color: t.textMuted,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap" as const,
  };

  return (
    <ModalBase onClose={onClose} maxWidth={620}>
      <ModalHeader title={titulo} onClose={onClose} />
      <p
        style={{
          margin: "-12px 0 16px",
          fontSize: 12,
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        {subtitulo}
      </p>

      <div
        role="tablist"
        aria-label={`Detalhes — ${titulo}`}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-ver-estoque-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-ver-estoque-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-ver-estoque-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel
        active={aba === "dados"}
        id="panel-ver-estoque-dados"
        labelledBy="tab-ver-estoque-dados"
      >
        {primeiraAbaConteudo}
      </ModalTabPanel>

      <ModalTabPanel
        active={aba === "anotacoes"}
        id="panel-ver-estoque-anotacoes"
        labelledBy="tab-ver-estoque-anotacoes"
      >
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
        ) : anotacoes.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Nenhuma anotação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {anotacoes.map((a) => (
              <div key={a.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap", marginBottom: 8 }}>{a.texto}</div>
                {a.anexo_url ? (
                  <a
                    href={a.anexo_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: "var(--brand-primary, #7c3aed)",
                      marginBottom: 8,
                      fontFamily: FONT.body,
                    }}
                  >
                    <Paperclip size={12} aria-hidden />
                    Abrir anexo em nova aba
                  </a>
                ) : null}
                <div style={metaStyle}>
                  <span>{a.autor_nome || "—"}</span>
                  <span>{formatDataHoraEstoque(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>

      <ModalTabPanel
        active={aba === "historico"}
        id="panel-ver-estoque-historico"
        labelledBy="tab-ver-estoque-historico"
      >
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
        ) : historico.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Nenhuma ação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {historico.map((h) => (
              <div key={h.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>{h.acao}</div>
                {h.detalhe ? (
                  <div style={{ fontSize: 12, color: t.textMuted, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {h.detalhe}
                  </div>
                ) : null}
                <div style={metaStyle}>
                  <span>{h.autor_nome || "—"}</span>
                  <span>{formatDataHoraEstoque(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>
    </ModalBase>
  );
}
