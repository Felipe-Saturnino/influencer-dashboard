import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../../lib/rhFuncionarioLoginMatch";
import {
  extrairPrimeiroNome,
  isAniversarioEmpresaHoje,
  isAniversarioHoje,
} from "../../../../lib/aniversarioHoje";

export function useHomePrestadorCelebracoes() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [aniversarioPessoal, setAniversarioPessoal] = useState(false);
  const [aniversarioEmpresa, setAniversarioEmpresa] = useState(false);

  useEffect(() => {
    const email = user?.email?.trim();
    if (!email) {
      setLoading(false);
      setAniversarioPessoal(false);
      setAniversarioEmpresa(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const row = await buscarRhFuncionarioAtivoPorEmailLogin(email);
        if (cancelled) return;

        const nomeCadastro = row?.nome?.trim() || user?.name?.trim() || "Prestador";
        const primeiro = extrairPrimeiroNome(nomeCadastro) || "Prestador";
        setPrimeiroNome(primeiro);
        setAniversarioPessoal(isAniversarioHoje(row?.data_nascimento));
        setAniversarioEmpresa(isAniversarioEmpresaHoje(row?.data_inicio));
      } catch (e) {
        console.error("[HomePrestador] celebrações:", e);
        if (!cancelled) {
          setPrimeiroNome("");
          setAniversarioPessoal(false);
          setAniversarioEmpresa(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.name]);

  return { loading, primeiroNome, aniversarioPessoal, aniversarioEmpresa };
}
