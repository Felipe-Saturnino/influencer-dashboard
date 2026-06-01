import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { PageKey } from "../types";
import { REVISAO_GATE_BANNER_KEY } from "../lib/appRoutes";
import {
  PAGES_ISENTAS_GATE_REVISAO_CADASTRO,
  buscarFuncionarioRevisaoCadastralPorEmail,
  revisaoCadastralPendenteParaFuncionario,
  usuarioSujeitoGateRevisaoCadastral,
} from "../lib/rhCadastroRevisao";

export function useRevisaoCadastralGate() {
  const { user, permissions, navigateTo, activePage } = useApp();
  const [gateLoading, setGateLoading] = useState(true);
  const [gateAtivo, setGateAtivo] = useState(false);
  const bootDoneRef = useRef(false);

  const recarregar = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.email?.trim()) {
        setGateAtivo(false);
        setGateLoading(false);
        bootDoneRef.current = true;
        return;
      }
      const permEdit = permissions.rh_dados_cadastro ?? null;
      if (!usuarioSujeitoGateRevisaoCadastral(user.role, permEdit)) {
        setGateAtivo(false);
        setGateLoading(false);
        bootDoneRef.current = true;
        return;
      }
      const showBlockingLoader = !opts?.silent && !bootDoneRef.current;
      if (showBlockingLoader) setGateLoading(true);
      const row = await buscarFuncionarioRevisaoCadastralPorEmail(user.email);
      setGateAtivo(revisaoCadastralPendenteParaFuncionario(row));
      setGateLoading(false);
      bootDoneRef.current = true;
    },
    [user?.email, user?.role, permissions.rh_dados_cadastro],
  );

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  useEffect(() => {
    const onAtualizado = () => void recarregar({ silent: true });
    window.addEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
    return () => window.removeEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
  }, [recarregar]);

  useEffect(() => {
    if (gateLoading || !gateAtivo) return;
    const page = activePage as PageKey;
    if (PAGES_ISENTAS_GATE_REVISAO_CADASTRO.includes(page)) return;
    sessionStorage.setItem(REVISAO_GATE_BANNER_KEY, "1");
    navigateTo("rh_dados_cadastro");
  }, [gateLoading, gateAtivo, activePage, navigateTo]);

  const navegarComGate = useCallback(
    (page: string) => {
      if (gateAtivo && !PAGES_ISENTAS_GATE_REVISAO_CADASTRO.includes(page as PageKey)) {
        sessionStorage.setItem(REVISAO_GATE_BANNER_KEY, "1");
        navigateTo("rh_dados_cadastro");
        return;
      }
      navigateTo(page as PageKey);
    },
    [gateAtivo, navigateTo],
  );

  return { gateLoading, gateAtivo, recarregarGate: recarregar, navegarComGate };
}
