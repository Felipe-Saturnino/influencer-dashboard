import type { ReactNode, CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { FONT } from "../../../../constants/theme";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import {
  AFILIADO_HOME_CADASTRO_INCOMPLETO_CTA,
  AFILIADO_HOME_CADASTRO_INCOMPLETO_MENSAGEM,
} from "../../../../lib/homeAfiliadoCopy";
import { INFLUENCER_HOME_PLAYBOOK_CTA } from "../../../../lib/homeInfluencerCopy";

const VERMELHO = "#e84025";

function AlertBox({ children }: { children: ReactNode }) {
  const { isDark } = useApp();
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 14,
        background: isDark ? "rgba(232,64,37,0.08)" : "rgba(232,64,37,0.05)",
        border: "1px solid rgba(232,64,37,0.28)",
        borderLeft: `4px solid ${VERMELHO}`,
      }}
    >
      <AlertTriangle size={20} color={VERMELHO} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: isDark ? "#ff9980" : "#b02a14",
            letterSpacing: "0.06em",
            marginBottom: 8,
            fontFamily: FONT_TITLE,
          }}
        >
          AÇÃO NECESSÁRIA
        </div>
        {children}
      </div>
    </div>
  );
}

const ctaStyle: CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: 10,
  border: `1px solid ${VERMELHO}`,
  background: `${VERMELHO}18`,
  color: VERMELHO,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT.body,
  textDecoration: "none",
};

export function AlertasAfiliadoHome({
  showCadastroIncompleto,
  showPlaybook,
  simulacaoLogin,
}: {
  showCadastroIncompleto: boolean;
  showPlaybook: boolean;
  simulacaoLogin: { userName?: string | null } | null;
}) {
  const { theme: t } = useApp();
  const { propsFor } = useAppPageNav();

  if (!showCadastroIncompleto && !showPlaybook) return null;

  return (
    <>
      {showCadastroIncompleto ? (
        <AlertBox>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.65, fontFamily: FONT.body }}>
            {simulacaoLogin
              ? `Cadastro incompleto no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. Na visualização, o menu segue esse perfil (somente leitura).`
              : AFILIADO_HOME_CADASTRO_INCOMPLETO_MENSAGEM}
          </p>
          <a {...propsFor("afiliados")} style={ctaStyle}>
            {AFILIADO_HOME_CADASTRO_INCOMPLETO_CTA}
          </a>
        </AlertBox>
      ) : null}

      {showPlaybook ? (
        <AlertBox>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.65, fontFamily: FONT.body }}>
            {simulacaoLogin ? (
              `Playbook pendente no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. A visualização é somente leitura.`
            ) : (
              <>
                Você ainda não confirmou todos os itens obrigatórios do Playbook. Acesse as abas{" "}
                <strong>Dealers</strong>, <strong>Agendamento</strong> e <strong>Jogos</strong> na página Playbook para
                dar sua ciência.
              </>
            )}
          </p>
          <a {...propsFor("playbook_influencers")} style={ctaStyle}>
            {INFLUENCER_HOME_PLAYBOOK_CTA}
          </a>
        </AlertBox>
      ) : null}
    </>
  );
}
