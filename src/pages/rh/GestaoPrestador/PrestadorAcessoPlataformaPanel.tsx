import { Clock, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import {
  fmtDataHoraAcessoPlataforma,
  labelUsuarioQueForneceuAcesso,
  type RhPrestadorAcessoPlataforma,
} from "../../../lib/rhPrestadorAcessoPlataforma";

function CampoLeituraAcesso({ label, value }: { label: string; value: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 4,
          fontFamily: FONT.body,
          fontWeight: 600,
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
          opacity: 0.92,
        }}
        aria-readonly="true"
      >
        {value}
      </div>
    </div>
  );
}

export function PrestadorAcessoPlataformaPanel({
  loading,
  erro,
  dados,
}: {
  loading: boolean;
  erro: string | null;
  dados: RhPrestadorAcessoPlataforma | null;
}) {
  const { theme: t } = useApp();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 160,
          color: t.textMuted,
          fontFamily: FONT.body,
          fontSize: 13,
        }}
      >
        <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }

  if (erro) {
    return (
      <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
        {erro}
      </div>
    );
  }

  if (!dados) {
    return (
      <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Sem dados de acesso para exibir.
      </div>
    );
  }

  const qtdAcessos =
    dados.tem_acesso && dados.sign_in_count != null && dados.sign_in_count >= 0
      ? String(dados.sign_in_count)
      : "—";

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          fontSize: 12,
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        <Clock size={14} aria-hidden />
        Informações somente leitura — vínculo pelo e-mail pessoal ou E-mail Spin do cadastro.
      </div>
      <div className="app-grid-2-tight">
        <CampoLeituraAcesso label="Tem acesso à Plataforma?" value={dados.tem_acesso ? "Sim" : "Não"} />
        <CampoLeituraAcesso
          label="Data da liberação do acesso"
          value={fmtDataHoraAcessoPlataforma(dados.access_granted_at)}
        />
        <CampoLeituraAcesso
          label="Usuário que forneceu acesso"
          value={labelUsuarioQueForneceuAcesso(dados)}
        />
        <CampoLeituraAcesso
          label="Data do primeiro acesso"
          value={fmtDataHoraAcessoPlataforma(dados.first_sign_in_at)}
        />
        <CampoLeituraAcesso
          label="Data do último acesso"
          value={fmtDataHoraAcessoPlataforma(dados.last_sign_in_at)}
        />
        <CampoLeituraAcesso label="Quantidade de acessos" value={qtdAcessos} />
      </div>
    </div>
  );
}
