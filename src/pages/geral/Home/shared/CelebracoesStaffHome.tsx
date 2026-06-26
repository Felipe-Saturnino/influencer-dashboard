import { Cake, Heart, PartyPopper, Sparkles } from "lucide-react";
import { useHomePrestadorCelebracoes } from "../hooks/useHomePrestadorCelebracoes";
import { HomeStaffCelebracaoCard } from "./HomeStaffCelebracaoCard";

const TEXTO_ANIVERSARIO_PESSOAL =
  "Hoje celebramos você! Obrigado por fazer parte da equipe que faz a Spin Gaming acontecer todos os dias. Desejamos um novo ciclo repleto de saúde, sucesso, conquistas e muitos motivos para comemorar. Aproveite o seu dia — ele é todo seu!";

const TEXTO_ANIVERSARIO_EMPRESA =
  "Hoje comemoramos mais um ano da sua jornada na Spin Gaming. Sua dedicação, profissionalismo e compromisso fazem parte da história que estamos construindo juntos. Obrigado por contribuir diariamente para a excelência da nossa operação. Que esta parceria continue rendendo muitas conquistas e momentos especiais. Feliz aniversário de Spin!";

export function CelebracoesStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { loading, primeiroNome, aniversarioPessoal, aniversarioEmpresa } = useHomePrestadorCelebracoes();

  if (loading || (!aniversarioPessoal && !aniversarioEmpresa)) return null;

  return (
    <>
      {aniversarioPessoal ? (
        <HomeStaffCelebracaoCard
          sectionId={`${sectionIdPrefix}-aniversario-title`}
          titleIcon={PartyPopper}
          title={`Parabéns, ${primeiroNome}!`}
          body={TEXTO_ANIVERSARIO_PESSOAL}
          endIcon={Cake}
        />
      ) : null}
      {aniversarioEmpresa ? (
        <HomeStaffCelebracaoCard
          sectionId={`${sectionIdPrefix}-aniversario-empresa-title`}
          titleIcon={Sparkles}
          title={`${primeiroNome}, hoje comemoramos a sua história com a Spin!`}
          body={TEXTO_ANIVERSARIO_EMPRESA}
          endIcon={Heart}
          topBarGradient="linear-gradient(90deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))"
        />
      ) : null}
    </>
  );
}
