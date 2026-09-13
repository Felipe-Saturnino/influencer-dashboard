import { useCallback, useEffect, useMemo, useState } from "react";
import { History, KeyRound, Loader2, Shield, UserCog } from "lucide-react";
import { ModalBase, ModalHeader, MODAL_SCROLL_FOCUS_SAFE_PAD } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../lib/supabase";
import {
  fmtDataHoraHistoricoUsuario,
  labelRealizadoPorAtivacao,
  labelRealizadoPorDesativacao,
  labelRealizadoPorResetSenha,
  textoCardAlteracao,
  tituloAlteracaoHistorico,
  type ProfilesHistoricoOrigem,
  type ProfilesHistoricoRow,
  type ProfilesHistoricoTipo,
} from "../../../lib/profilesHistoricoUsuario";
import type { UsuarioCompleto } from "../../../types";

type AbaHist = "acesso" | "alteracoes";

type ProfileAcessoSnap = {
  access_granted_at: string | null;
  access_granted_by: string | null;
  access_granted_origem: string | null;
  first_sign_in_at: string | null;
  created_at: string | null;
  ativo: boolean | null;
  desativado_em: string | null;
  desativado_por: string | null;
  desativado_origem: string | null;
  ultimo_reset_senha_em: string | null;
  ultimo_reset_senha_por: string | null;
  ultimo_reset_senha_origem: string | null;
};

const ERRO_HIST =
  "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";

function CampoLeitura({ label, value }: { label: string; value: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          marginBottom: 4,
          fontFamily: FONT.body,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          fontSize: 13,
          color: t.text,
          fontFamily: FONT.body,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BlocoTitulo({ children }: { children: string }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: t.text,
        fontFamily: FONT.body,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function parseHistoricoRow(raw: Record<string, unknown>): ProfilesHistoricoRow | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const profile_id = typeof raw.profile_id === "string" ? raw.profile_id : null;
  const tipo = raw.tipo as ProfilesHistoricoTipo;
  const origem = raw.origem as ProfilesHistoricoOrigem;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  if (!id || !profile_id || !tipo || !origem || !created_at) return null;
  return {
    id,
    profile_id,
    tipo,
    origem,
    realizado_por: typeof raw.realizado_por === "string" ? raw.realizado_por : null,
    resumo: typeof raw.resumo === "string" ? raw.resumo : null,
    valor_anterior: typeof raw.valor_anterior === "string" ? raw.valor_anterior : null,
    valor_novo: typeof raw.valor_novo === "string" ? raw.valor_novo : null,
    created_at,
  };
}

export function ModalHistoricoUsuario({
  usuario,
  onClose,
}: {
  usuario: UsuarioCompleto;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaHist>("acesso");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [snap, setSnap] = useState<ProfileAcessoSnap | null>(null);
  const [eventos, setEventos] = useState<ProfilesHistoricoRow[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const [{ data: perfil, error: errPerfil }, { data: hist, error: errHist }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "access_granted_at, access_granted_by, access_granted_origem, first_sign_in_at, created_at, ativo, desativado_em, desativado_por, desativado_origem, ultimo_reset_senha_em, ultimo_reset_senha_por, ultimo_reset_senha_origem",
        )
        .eq("id", usuario.id)
        .maybeSingle(),
      supabase
        .from("profiles_historico")
        .select("id, profile_id, tipo, origem, realizado_por, resumo, valor_anterior, valor_novo, created_at")
        .eq("profile_id", usuario.id)
        .order("created_at", { ascending: false }),
    ]);

    if (errPerfil || errHist) {
      console.error("[ModalHistoricoUsuario]", errPerfil ?? errHist);
      setErro(ERRO_HIST);
      setSnap(null);
      setEventos([]);
      setLoading(false);
      return;
    }

    const p = (perfil ?? {}) as Record<string, unknown>;
    setSnap({
      access_granted_at: typeof p.access_granted_at === "string" ? p.access_granted_at : null,
      access_granted_by: typeof p.access_granted_by === "string" ? p.access_granted_by : null,
      access_granted_origem: typeof p.access_granted_origem === "string" ? p.access_granted_origem : null,
      first_sign_in_at: typeof p.first_sign_in_at === "string" ? p.first_sign_in_at : null,
      created_at: typeof p.created_at === "string" ? p.created_at : null,
      ativo: typeof p.ativo === "boolean" ? p.ativo : null,
      desativado_em: typeof p.desativado_em === "string" ? p.desativado_em : null,
      desativado_por: typeof p.desativado_por === "string" ? p.desativado_por : null,
      desativado_origem: typeof p.desativado_origem === "string" ? p.desativado_origem : null,
      ultimo_reset_senha_em: typeof p.ultimo_reset_senha_em === "string" ? p.ultimo_reset_senha_em : null,
      ultimo_reset_senha_por: typeof p.ultimo_reset_senha_por === "string" ? p.ultimo_reset_senha_por : null,
      ultimo_reset_senha_origem:
        typeof p.ultimo_reset_senha_origem === "string" ? p.ultimo_reset_senha_origem : null,
    });

    const rows = ((hist ?? []) as Record<string, unknown>[])
      .map(parseHistoricoRow)
      .filter((r): r is ProfilesHistoricoRow => r != null);

    const ids = [
      ...new Set(
        [
          ...rows.map((r) => r.realizado_por),
          typeof p.access_granted_by === "string" ? p.access_granted_by : null,
          typeof p.desativado_por === "string" ? p.desativado_por : null,
          typeof p.ultimo_reset_senha_por === "string" ? p.ultimo_reset_senha_por : null,
        ].filter((x): x is string => Boolean(x)),
      ),
    ];

    const map: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      for (const pr of profs ?? []) {
        const row = pr as { id: string; name: string | null };
        map[row.id] = row.name?.trim() || "";
      }
    }

    setNomes(map);
    setEventos(
      rows.map((r) => ({
        ...r,
        autor_nome: r.realizado_por ? map[r.realizado_por] ?? null : null,
      })),
    );
    setLoading(false);
  }, [usuario.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ativacaoEvento = useMemo(
    () => eventos.find((e) => e.tipo === "ativacao") ?? null,
    [eventos],
  );
  const alteracoes = useMemo(
    () =>
      eventos.filter(
        (e) => e.tipo === "alteracao_nome" || e.tipo === "alteracao_perfil" || e.tipo === "alteracao_escopo",
      ),
    [eventos],
  );

  const inativo = snap?.ativo === false || usuario.ativo === false;
  const temReset =
    Boolean(snap?.ultimo_reset_senha_em) || eventos.some((e) => e.tipo === "reset_senha");

  const origemAtivacao =
    ativacaoEvento?.origem ?? snap?.access_granted_origem ?? null;
  const autorAtivacaoId = ativacaoEvento?.realizado_por ?? snap?.access_granted_by ?? null;
  const dataLiberacao = snap?.access_granted_at ?? snap?.created_at ?? null;

  const tabs: AbaHist[] = ["acesso", "alteracoes"];

  return (
    <ModalBase maxWidth={640} onClose={onClose}>
      <ModalHeader title={`Histórico — ${usuario.name?.trim() || usuario.email}`} onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        <div
          role="tablist"
          aria-label="Abas do histórico do usuário"
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, tabs, setAba, (k) => `tab-hist-usuario-${k}`)
          }
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <FiltroBarTabButton
            id="tab-hist-usuario-acesso"
            active={aba === "acesso"}
            aria-controls="panel-hist-usuario-acesso"
            onClick={() => setAba("acesso")}
            icon={<Shield {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Gestão de Acesso
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-hist-usuario-alteracoes"
            active={aba === "alteracoes"}
            aria-controls="panel-hist-usuario-alteracoes"
            onClick={() => setAba("alteracoes")}
            icon={<UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Alterações
          </FiltroBarTabButton>
        </div>

        {erro ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: t.textMuted }}>
            <Loader2
              className="app-lucide-spin"
              size={22}
              color="var(--brand-primary, #7c3aed)"
              aria-hidden
            />
            <div style={{ fontSize: 13, marginTop: 10 }}>Carregando…</div>
          </div>
        ) : (
          <>
            <ModalTabPanel
              active={aba === "acesso"}
              id="panel-hist-usuario-acesso"
              labelledBy="tab-hist-usuario-acesso"
            >
              <div
                style={{
                  ...MODAL_SCROLL_FOCUS_SAFE_PAD,
                  maxHeight: "min(60dvh, 520px)",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.cardBg,
                    marginBottom: 12,
                  }}
                >
                  <BlocoTitulo>Ativação</BlocoTitulo>
                  <CampoLeitura
                    label="Realizado por"
                    value={labelRealizadoPorAtivacao(
                      origemAtivacao,
                      autorAtivacaoId ? nomes[autorAtivacaoId] : null,
                    )}
                  />
                  <CampoLeitura
                    label="Data da Liberação"
                    value={fmtDataHoraHistoricoUsuario(dataLiberacao)}
                  />
                  <CampoLeitura
                    label="Primeiro Login"
                    value={fmtDataHoraHistoricoUsuario(snap?.first_sign_in_at)}
                  />
                </div>

                {inativo ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.cardBg,
                      marginBottom: 12,
                    }}
                  >
                    <BlocoTitulo>Desativação</BlocoTitulo>
                    <CampoLeitura
                      label="Realizado por"
                      value={labelRealizadoPorDesativacao(
                        snap?.desativado_origem,
                        snap?.desativado_por ? nomes[snap.desativado_por] : null,
                      )}
                    />
                    <CampoLeitura
                      label="Data da Desativação"
                      value={fmtDataHoraHistoricoUsuario(snap?.desativado_em)}
                    />
                  </div>
                ) : null}

                {temReset ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.cardBg,
                    }}
                  >
                    <BlocoTitulo>Reset de Senha</BlocoTitulo>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                        color: t.textMuted,
                        fontSize: 12,
                      }}
                    >
                      <KeyRound size={13} aria-hidden />
                      Último reset registrado
                    </div>
                    <CampoLeitura
                      label="Realizado por"
                      value={labelRealizadoPorResetSenha(
                        snap?.ultimo_reset_senha_origem,
                        snap?.ultimo_reset_senha_por ? nomes[snap.ultimo_reset_senha_por] : null,
                      )}
                    />
                    <CampoLeitura
                      label="Data do Reset"
                      value={fmtDataHoraHistoricoUsuario(snap?.ultimo_reset_senha_em)}
                    />
                  </div>
                ) : null}
              </div>
            </ModalTabPanel>

            <ModalTabPanel
              active={aba === "alteracoes"}
              id="panel-hist-usuario-alteracoes"
              labelledBy="tab-hist-usuario-alteracoes"
            >
              <div
                style={{
                  ...MODAL_SCROLL_FOCUS_SAFE_PAD,
                  maxHeight: "min(60dvh, 520px)",
                  overflowY: "auto",
                }}
              >
                {alteracoes.length === 0 ? (
                  <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>
                    Nenhuma alteração de Nome, Perfil ou Escopo registrada.
                  </p>
                ) : (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {alteracoes.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg ?? t.cardBg,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: t.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: 4,
                          }}
                        >
                          {tituloAlteracaoHistorico(item.tipo)}
                        </div>
                        <div style={{ fontSize: 13, color: t.text }}>{textoCardAlteracao(item)}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
                          {item.autor_nome?.trim() || "—"} · {fmtDataHoraHistoricoUsuario(item.created_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ModalTabPanel>
          </>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            fontSize: 11,
            color: t.textMuted,
          }}
        >
          <History size={12} aria-hidden />
          Eventos passam a ser registrados a partir desta versão da plataforma.
        </div>
      </div>
    </ModalBase>
  );
}
