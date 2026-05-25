import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { PageKey } from "../types";
import {
  PAGES_ISENTAS_GATE_REVISAO_CADASTRO,
  buscarFuncionarioRevisaoCadastralPorEmail,
  revisaoCadastralPendenteParaFuncionario,
  usuarioSujeitoGateRevisaoCadastral,
} from "../lib/rhCadastroRevisao";

export function useRevisaoCadastralGate(activePage: string) {
  const { user, permissions, setActivePage } = useApp();
  const [gateLoading, setGateLoading] = useState(true);
  const [gateAtivo, setGateAtivo] = useState(false);

  const recarregar = useCallback(async () => {
    if (!user?.email?.trim()) {
      setGateAtivo(false);
      setGateLoading(false);
      return;
    }
    const permEdit = permissions.rh_dados_cadastro ?? null;
    if (!usuarioSujeitoGateRevisaoCadastral(user.role, permEdit)) {
      setGateAtivo(false);
      setGateLoading(false);
      return;
    }
    setGateLoading(true);
    const row = await buscarFuncionarioRevisaoCadastralPorEmail(user.email);
    setGateAtivo(revisaoCadastralPendenteParaFuncionario(row));
    setGateLoading(false);
  }, [user?.email, user?.role, permissions.rh_dados_cadastro]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, activePage]);

  useEffect(() => {
    const onAtualizado = () => void recarregar();
    window.addEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
    return () => window.removeEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
  }, [recarregar]);

  useEffect(() => {
    if (gateLoading || !gateAtivo) return;
    const page = activePage as PageKey;
    if (PAGES_ISENTAS_GATE_REVISAO_CADASTRO.includes(page)) return;
    setActivePage("rh_dados_cadastro");
  }, [gateLoading, gateAtivo, activePage, setActivePage]);

  const navegarComGate = useCallback(
    (page: string) => {
      if (gateAtivo && !PAGES_ISENTAS_GATE_REVISAO_CADASTRO.includes(page as PageKey)) {
        setActivePage("rh_dados_cadastro");
        return;
      }
      setActivePage(page);
    },
    [gateAtivo, setActivePage],
  );

  return { gateLoading, gateAtivo, recarregarGate: recarregar, navegarComGate };
}
