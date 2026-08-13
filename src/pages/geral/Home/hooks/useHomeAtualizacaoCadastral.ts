import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { extrairPrimeiroNome } from "../../../../lib/aniversarioHoje";
import {
  buscarFuncionarioRevisaoCadastralPorEmail,
  revisaoCadastralPendenteParaFuncionario,
  usuarioSujeitoGateRevisaoCadastral,
} from "../../../../lib/rhCadastroRevisao";

export function useHomeAtualizacaoCadastral() {
  const { user, permissionsAcoes, simulacaoSomenteLeitura } = useApp();
  const [loading, setLoading] = useState(true);
  const [pendente, setPendente] = useState(false);
  const [primeiroNome, setPrimeiroNome] = useState("");

  useEffect(() => {
    const email = user?.email?.trim();
    if (!email || simulacaoSomenteLeitura) {
      setLoading(false);
      setPendente(false);
      return;
    }

    const permEditar = permissionsAcoes.rh_dados_cadastro?.editar ?? null;
    if (!user || !usuarioSujeitoGateRevisaoCadastral(user.role, permEditar)) {
      setLoading(false);
      setPendente(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const row = await buscarFuncionarioRevisaoCadastralPorEmail(email);
        if (cancelled) return;
        const nomeCadastro = row?.nome?.trim() || user?.name?.trim() || "Colaborador";
        setPrimeiroNome(extrairPrimeiroNome(nomeCadastro) || "Colaborador");
        setPendente(revisaoCadastralPendenteParaFuncionario(row));
      } catch (e) {
        console.error("[Home] atualização cadastral:", e);
        if (!cancelled) {
          setPendente(false);
          setPrimeiroNome("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onAtualizado = () => {
      void (async () => {
        const row = await buscarFuncionarioRevisaoCadastralPorEmail(email);
        if (cancelled) return;
        setPendente(revisaoCadastralPendenteParaFuncionario(row));
      })();
    };
    window.addEventListener("rh-cadastro-revisao-atualizada", onAtualizado);

    return () => {
      cancelled = true;
      window.removeEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
    };
  }, [user, permissionsAcoes.rh_dados_cadastro?.editar, simulacaoSomenteLeitura]);

  return { loading, pendente, primeiroNome };
}
