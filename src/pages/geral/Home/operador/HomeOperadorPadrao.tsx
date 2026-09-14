import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../../lib/pageContentBoxStyles";
import type { HomeOperadorTemplateProps } from "../../../../lib/homeOperadoraTemplate";
import { supabase } from "../../../../lib/supabase";
import { BoasVindasPerfilHome } from "../shared/BoasVindasPerfilHome";
import { KpisMesasOperador } from "./KpisMesasOperador";
import { SpinNaRedeHome } from "../shared/SpinNaRedeHome";
import { InformativosHome } from "../shared/InformativosHome";
import { AtalhosOperador } from "./AtalhosOperador";

/** Subtítulo canónico — Home Operador Padrão (fallback quando a operadora não tem template dedicado). */
export const HOME_OPERADOR_PADRAO_SUBTITULO =
  "Sua operação, seus dados.\nA inteligência que a Spin construiu para a sua necessidade. Tudo que você precisa para ver, decidir e transformar gestão em resultado.";

function OperadoraChip({ nome }: { nome: string }) {
  const brand = useDashboardBrand();
  const color = brand.useBrand ? "var(--brand-primary)" : "var(--brand-primary, #7c3aed)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        fontFamily: FONT.body,
      }}
    >
      {nome}
    </span>
  );
}

export default function HomeOperadorPadrao({
  sectionIdPrefix = "home-operador-padrao",
}: HomeOperadorTemplateProps) {
  const { theme: t, user, operadoraBrand, escoposVisiveis, simulacaoLogin, simulacaoSomenteLeitura } =
    useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const [operadoraNomeFetch, setOperadoraNomeFetch] = useState<string | null>(null);

  const slug = escoposVisiveis.operadorasVisiveis[0] ?? null;

  useEffect(() => {
    if (operadoraBrand?.nome?.trim()) {
      setOperadoraNomeFetch(null);
      return;
    }
    if (!slug) {
      setOperadoraNomeFetch(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("operadoras").select("nome").eq("slug", slug).maybeSingle();
      if (!cancelled) setOperadoraNomeFetch((data?.nome as string | null)?.trim() || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [operadoraBrand?.nome, slug]);

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Operador";
  const operadoraNome = operadoraBrand?.nome?.trim() || operadoraNomeFetch;
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (user.name || user.email || "?");
  const simulacaoNota = simulacaoLogin
    ? `Sua conta não muda — você continua como ${user.name}. Visualização: ${simulacaoLogin.labelExibicao}.`
    : null;

  return (
    <div
      className="app-page-shell"
      style={{
        background: t.bg,
        minHeight: "100vh",
        fontFamily: FONT.body,
        display: "flex",
        flexDirection: "column",
        gap: PAGE_CONTENT_BOX_GAP,
      }}
    >
      <BoasVindasPerfilHome
        nome={nome}
        roleLabel="Operador"
        subtitulo={HOME_OPERADOR_PADRAO_SUBTITULO}
        avatarLabel={welcomeAvatarLabel}
        simulacaoNota={simulacaoNota}
        chip={operadoraNome ? <OperadoraChip nome={operadoraNome} /> : null}
      />
      <KpisMesasOperador />
      <SpinNaRedeHome sectionIdPrefix={sectionIdPrefix} />
      <InformativosHome perfil="operador" sectionIdPrefix={sectionIdPrefix} />
      <AtalhosOperador />
    </div>
  );
}
