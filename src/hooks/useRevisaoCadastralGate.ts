import { useCallback, useEffect, useRef, useState } from "react";
import { registerRevisaoNavGate, useApp } from "../context/AppContext";
import type { PageKey } from "../types";
import { REVISAO_GATE_BANNER_KEY } from "../lib/appRoutes";
import {
  buscarFuncionarioRevisaoCadastralPorEmail,
  destinoBloqueadoPorGateRevisaoCadastral,
  revisaoCadastralPendenteParaFuncionario,
  usuarioSujeitoGateRevisaoCadastral,
} from "../lib/rhCadastroRevisao";

export function useRevisaoCadastralGate() {
  const { user, permissionsAcoes, navigateTo } = useApp();
  const [gateLoading, setGateLoading] = useState(true);
  const [gateAtivo, setGateAtivo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const bootDoneRef = useRef(false);
  const gateAtivoRef = useRef(gateAtivo);
  gateAtivoRef.current = gateAtivo;

  const recarregar = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.email?.trim()) {
        setGateAtivo(false);
        setGateLoading(false);
        bootDoneRef.current = true;
        return;
      }
      const permEditar = permissionsAcoes.rh_dados_cadastro?.editar ?? null;
      if (!usuarioSujeitoGateRevisaoCadastral(user.role, permEditar)) {
        setGateAtivo(false);
        setModalAberto(false);
        setGateLoading(false);
        bootDoneRef.current = true;
        return;
      }
      const showBlockingLoader = !opts?.silent && !bootDoneRef.current;
      if (showBlockingLoader) setGateLoading(true);
      const row = await buscarFuncionarioRevisaoCadastralPorEmail(user.email);
      const ativo = revisaoCadastralPendenteParaFuncionario(row);
      setGateAtivo(ativo);
      if (!ativo) setModalAberto(false);
      setGateLoading(false);
      bootDoneRef.current = true;
    },
    [user?.email, user?.role, permissionsAcoes.rh_dados_cadastro?.editar],
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
    registerRevisaoNavGate({
      shouldBlock: (pageKey: PageKey) => destinoBloqueadoPorGateRevisaoCadastral(gateAtivoRef.current, pageKey),
      onBlocked: () => setModalAberto(true),
    });
    return () => registerRevisaoNavGate(null);
  }, []);

  const fecharModalRevisao = useCallback(() => {
    setModalAberto(false);
  }, []);

  const irParaAtualizacaoCadastral = useCallback(() => {
    setModalAberto(false);
    sessionStorage.setItem(REVISAO_GATE_BANNER_KEY, "1");
    navigateTo("rh_dados_cadastro");
  }, [navigateTo]);

  return {
    gateLoading,
    gateAtivo,
    modalRevisaoAberto: modalAberto,
    fecharModalRevisao,
    irParaAtualizacaoCadastral,
    recarregarGate: recarregar,
  };
}
