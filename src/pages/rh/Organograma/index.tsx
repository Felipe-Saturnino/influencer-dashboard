import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, CheckCircle2, Loader2, Network, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  coletarIdsTimesDaGerencia,
  coletarIdsTimesEGerenciasDaDiretoria,
  contarGerenciasAtivasFilhasDeDiretoria,
  contarTimesAtivosFilhosDeGerencia,
  contarTimesAtivosSobDiretoria,
  encontrarDiretoriaIdPorCtx,
  montarArvoreOrganograma,
} from "../../../lib/rhOrganogramaTree";
import { uploadDiretorFotoDiretoria } from "../../../lib/rhOrgDiretorFoto";
import type {
  RhOrgDiretoria,
  RhOrgDiretoriaComFilhos,
  RhOrgGerencia,
  RhOrgGerenciaComFilhos,
  RhOrgTime,
} from "../../../types/rhOrganograma";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { OrgAccordion } from "../../../components/rh/organograma/OrgAccordion";
import { OrgBlocoVagasPlaceholder } from "../../../components/rh/organograma/OrgBlocoVagasPlaceholder";
import {
  OrgFiltroBarDiretorias,
  ORG_FILTRO_TODAS_DIRETORIAS,
  type FiltroDiretoriaOrganograma,
} from "../../../components/rh/organograma/OrgFiltroBarDiretorias";
import { OrgTreeVisual, type OrgTreeVisualAcaoCtx } from "../../../components/rh/organograma/OrgTreeVisual";
import { OrgVisualizacaoDiretoriaUnica } from "../../../components/rh/organograma/OrgVisualizacaoDiretoriaUnica";
import {
  proximoCentroCustosDiretoria,
  proximoCentroCustosGerencia,
  proximoCentroCustosTime,
} from "../../../lib/rhOrganogramaCentroCustos";

type ModoPagina = "visual" | "gerenciar";

type ModalOff =
  | null
  | {
      tipo: "diretoria" | "gerencia" | "time";
      row: RhOrgDiretoria | RhOrgGerencia | RhOrgTime;
      titulo: string;
      corpo: string;
    };

type ModalExcluir =
  | null
  | {
      tipo: "diretoria" | "gerencia" | "time";
      row: RhOrgDiretoria | RhOrgGerencia | RhOrgTime;
      titulo: string;
      corpo: string;
    };

const DELETE_CHUNK = 200;

async function deleteIdsInChunks(tabela: "rh_org_times" | "rh_org_gerencias", ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const slice = ids.slice(i, i + DELETE_CHUNK);
    const { error } = await supabase.from(tabela).delete().in("id", slice);
    if (error) return error.message;
  }
  return null;
}

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

export default function RhOrganogramaPage() {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_organograma");

  const [modo, setModo] = useState<ModoPagina>("gerenciar");
  const [loading, setLoading] = useState(true);
  const [diretorias, setDiretorias] = useState<RhOrgDiretoria[]>([]);
  const [gerencias, setGerencias] = useState<RhOrgGerencia[]>([]);
  const [times, setTimes] = useState<RhOrgTime[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [modalOff, setModalOff] = useState<ModalOff>(null);
  const [desativando, setDesativando] = useState(false);
  const [modalExcluir, setModalExcluir] = useState<ModalExcluir>(null);
  const [excluindo, setExcluindo] = useState(false);

  /** Diretoria: null | new | edit row */
  const [mdDir, setMdDir] = useState<null | "new" | RhOrgDiretoria>(null);
  const [nomeDir, setNomeDir] = useState("");
  const [fidDir, setFidDir] = useState("");
  const [livreDir, setLivreDir] = useState("");
  const [salvandoDir, setSalvandoDir] = useState(false);

  const [mdGer, setMdGer] = useState<null | { mode: "new"; diretoriaId: string } | { mode: "edit"; row: RhOrgGerencia }>(null);
  const [nomeGer, setNomeGer] = useState("");
  const [fidGer, setFidGer] = useState("");
  const [salvandoGer, setSalvandoGer] = useState(false);

  const [mdTime, setMdTime] = useState<null | { mode: "new"; gerenciaId: string } | { mode: "edit"; row: RhOrgTime }>(null);
  const [nomeTime, setNomeTime] = useState("");
  const [fidTime, setFidTime] = useState("");
  const [salvandoTime, setSalvandoTime] = useState(false);

  const [draftDirId, setDraftDirId] = useState<string | null>(null);
  const [draftGerId, setDraftGerId] = useState<string | null>(null);
  const [draftTimeId, setDraftTimeId] = useState<string | null>(null);

  const [modalAcaoVisual, setModalAcaoVisual] = useState<null | { tipo: "vagas" | "estrutura"; ctx: OrgTreeVisualAcaoCtx }>(null);
  const [modalVagasTodas, setModalVagasTodas] = useState(false);
  const [filtroDiretoriaId, setFiltroDiretoriaId] = useState<FiltroDiretoriaOrganograma>(ORG_FILTRO_TODAS_DIRETORIAS);

  const [diretorSobre, setDiretorSobre] = useState("");
  const [fotoDiretorFile, setFotoDiretorFile] = useState<File | null>(null);
  const [fotoDiretorPreviewUrl, setFotoDiretorPreviewUrl] = useState<string | null>(null);

  const [sobreGerencia, setSobreGerencia] = useState("");

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    const [dr, gr, tr, fr] = await Promise.all([
      supabase.from("rh_org_diretorias").select("*").order("nome"),
      supabase.from("rh_org_gerencias").select("*").order("nome"),
      supabase.from("rh_org_times").select("*").order("nome"),
      supabase.from("rh_funcionarios").select("id, nome").in("status", ["ativo", "indisponivel"]).order("nome"),
    ]);
    if (dr.error) setErroGlobal(dr.error.message);
    else if (gr.error) setErroGlobal(gr.error.message);
    else if (tr.error) setErroGlobal(tr.error.message);
    else if (fr.error) setErroGlobal(fr.error.message);
    setDiretorias((dr.data ?? []) as RhOrgDiretoria[]);
    setGerencias((gr.data ?? []) as RhOrgGerencia[]);
    setTimes((tr.data ?? []) as RhOrgTime[]);
    setFuncionarios((fr.data ?? []) as { id: string; nome: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!sucessoMsg) return;
    const id = window.setTimeout(() => setSucessoMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [sucessoMsg]);

  useEffect(() => {
    if (perm.loading) return;
    if (!perm.canEditarOk) setModo("visual");
  }, [perm.loading, perm.canEditarOk]);

  useEffect(() => {
    if (!fotoDiretorFile) {
      setFotoDiretorPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(fotoDiretorFile);
    setFotoDiretorPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [fotoDiretorFile]);

  const nomePorFuncId = useMemo(() => {
    const m = new Map<string, string>();
    funcionarios.forEach((f) => m.set(f.id, f.nome));
    return m;
  }, [funcionarios]);

  const arvore = useMemo(
    () => montarArvoreOrganograma(diretorias, gerencias, times),
    [diretorias, gerencias, times],
  );

  const dirSelecionada = useMemo(() => {
    if (filtroDiretoriaId === ORG_FILTRO_TODAS_DIRETORIAS) return null;
    return arvore.find((d) => d.id === filtroDiretoriaId) ?? null;
  }, [arvore, filtroDiretoriaId]);

  const abrirVagasVisual = useCallback(
    (_ctx: OrgTreeVisualAcaoCtx) => {
      if (filtroDiretoriaId === ORG_FILTRO_TODAS_DIRETORIAS && modo === "visual") {
        setModalVagasTodas(true);
        return;
      }
      setModalAcaoVisual({ tipo: "vagas", ctx: _ctx });
    },
    [filtroDiretoriaId, modo],
  );

  const abrirEstruturaVisual = useCallback(
    (ctx: OrgTreeVisualAcaoCtx) => {
      if (filtroDiretoriaId === ORG_FILTRO_TODAS_DIRETORIAS && modo === "visual") {
        const id = encontrarDiretoriaIdPorCtx(arvore, ctx);
        if (id) setFiltroDiretoriaId(id);
        return;
      }
      setModalAcaoVisual({ tipo: "estrutura", ctx });
    },
    [filtroDiretoriaId, modo, arvore],
  );

  const [countsMap, setCountsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("rh_funcionarios").select("org_time_id").in("status", ["ativo", "indisponivel"]);
      if (error) return;
      const acc: Record<string, number> = {};
      (data ?? []).forEach((r: { org_time_id: string | null }) => {
        const k = r.org_time_id;
        if (k) acc[k] = (acc[k] ?? 0) + 1;
      });
      setCountsMap(acc);
    })();
  }, [funcionarios, times]);

  const nomeResponsavel = useCallback(
    (fid: string | null | undefined, livre: string | null | undefined) => {
      if (fid && nomePorFuncId.has(fid)) return nomePorFuncId.get(fid)!;
      return (livre ?? "").trim();
    },
    [nomePorFuncId],
  );

  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const optsFunc = useMemo(
    () =>
      funcionarios.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nome}
        </option>
      )),
    [funcionarios],
  );

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box",
  };

  const inputReadonlyStyle: CSSProperties = {
    ...inputStyle,
    opacity: 0.92,
    cursor: "default",
    color: t.textMuted,
  };

  const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 120,
    resize: "vertical",
  };

  /** Asterisco vermelho para campos obrigatórios (sem texto “obrigatório/opcional” no rótulo). */
  const req = (
    <span style={{ color: "#e84025", fontWeight: 700, marginLeft: 3 }} aria-hidden="true">
      *
    </span>
  );

  const centroPreviewNovaDiretoria = useMemo(
    () => (mdDir === "new" ? proximoCentroCustosDiretoria(diretorias) : ""),
    [mdDir, diretorias],
  );

  const centroPreviewNovaGerencia = useMemo(() => {
    if (mdGer?.mode !== "new") return "";
    const dir = diretorias.find((x) => x.id === mdGer.diretoriaId);
    if (!dir?.centro_custos) return "";
    const gers = gerencias.filter((x) => x.diretoria_id === mdGer.diretoriaId);
    return proximoCentroCustosGerencia(dir.centro_custos, gers);
  }, [mdGer, diretorias, gerencias]);

  const centroPreviewNovoTime = useMemo(() => {
    if (mdTime?.mode !== "new") return "";
    const ger = gerencias.find((x) => x.id === mdTime.gerenciaId);
    if (!ger?.centro_custos) return "";
    const tis = times.filter((x) => x.gerencia_id === mdTime.gerenciaId);
    return proximoCentroCustosTime(ger.centro_custos, tis);
  }, [mdTime, gerencias, times]);

  const abrirNovaDiretoria = () => {
    setNomeDir("");
    setFidDir("");
    setLivreDir("");
    setDiretorSobre("");
    setFotoDiretorFile(null);
    setDraftDirId(crypto.randomUUID());
    setMdDir("new");
  };

  const abrirEditDiretoria = (row: RhOrgDiretoria) => {
    setDraftDirId(null);
    setNomeDir(row.nome);
    setFidDir(row.diretor_funcionario_id ?? "");
    setLivreDir(row.diretor_nome_livre ?? "");
    setDiretorSobre(row.diretor_sobre ?? "");
    setFotoDiretorFile(null);
    setMdDir(row);
  };

  const salvarDiretoria = async () => {
    if (!nomeDir.trim()) {
      setErroGlobal("Informe o nome da diretoria.");
      return;
    }
    if (!diretorSobre.trim()) {
      setErroGlobal("Preencha o texto Sobre o Diretor(a).");
      return;
    }
    setSalvandoDir(true);
    setErroGlobal(null);
    const payloadBase = {
      nome: nomeDir.trim(),
      diretor_funcionario_id: fidDir || null,
      diretor_nome_livre: livreDir.trim() || null,
      diretor_sobre: diretorSobre.trim(),
    };
    if (mdDir === "new") {
      const newId = draftDirId ?? crypto.randomUUID();
      let diretor_foto_url: string | null = null;
      if (fotoDiretorFile) {
        const up = await uploadDiretorFotoDiretoria(newId, fotoDiretorFile);
        if (!up.ok) {
          setSalvandoDir(false);
          setErroGlobal(up.message);
          return;
        }
        diretor_foto_url = up.publicUrl;
      }
      if (!diretor_foto_url?.trim()) {
        setSalvandoDir(false);
        setErroGlobal("Envie a foto do Diretor(a).");
        return;
      }
      const centro_custos = proximoCentroCustosDiretoria(diretorias);
      const { error } = await supabase
        .from("rh_org_diretorias")
        .insert({ id: newId, ...payloadBase, diretor_foto_url, status: "ativo", centro_custos });
      setSalvandoDir(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é diretor(a) de outra diretoria ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Diretoria criada.");
    } else if (mdDir !== null && typeof mdDir === "object") {
      const row = mdDir;
      let diretor_foto_url: string | null = row.diretor_foto_url;
      if (fotoDiretorFile) {
        const up = await uploadDiretorFotoDiretoria(row.id, fotoDiretorFile);
        if (!up.ok) {
          setSalvandoDir(false);
          setErroGlobal(up.message);
          return;
        }
        diretor_foto_url = up.publicUrl;
      }
      if (!diretor_foto_url?.trim()) {
        setSalvandoDir(false);
        setErroGlobal("Envie a foto do Diretor(a).");
        return;
      }
      const { error } = await supabase
        .from("rh_org_diretorias")
        .update({ ...payloadBase, diretor_foto_url })
        .eq("id", row.id);
      setSalvandoDir(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é diretor(a) de outra diretoria ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Diretoria atualizada.");
    }
    setMdDir(null);
    setDraftDirId(null);
    setFotoDiretorFile(null);
    setDiretorSobre("");
    await carregar();
  };

  const abrirNovaGerencia = (diretoriaId: string) => {
    setNomeGer("");
    setFidGer("");
    setSobreGerencia("");
    setDraftGerId(crypto.randomUUID());
    setMdGer({ mode: "new", diretoriaId });
  };

  const abrirEditGerencia = (row: RhOrgGerencia) => {
    setDraftGerId(null);
    setNomeGer(row.nome);
    setFidGer(row.gerente_funcionario_id ?? "");
    setSobreGerencia(row.sobre_gerencia ?? "");
    setMdGer({ mode: "edit", row });
  };

  const salvarGerencia = async () => {
    if (!nomeGer.trim()) {
      setErroGlobal("Informe o nome da gerência.");
      return;
    }
    if (!sobreGerencia.trim()) {
      setErroGlobal("Preencha o texto Sobre a Gerência.");
      return;
    }
    if (!fidGer.trim()) {
      setErroGlobal("Selecione o líder imediato cadastrado na Gestão de Prestadores.");
      return;
    }
    setSalvandoGer(true);
    setErroGlobal(null);
    const payload = {
      nome: nomeGer.trim(),
      gerente_funcionario_id: fidGer,
      gerente_nome_livre: null,
      sobre_gerencia: sobreGerencia.trim(),
    };
    if (mdGer?.mode === "new") {
      const dir = diretorias.find((x) => x.id === mdGer.diretoriaId);
      if (!dir?.centro_custos) {
        setSalvandoGer(false);
        setErroGlobal("Diretoria sem centro de custos. Recarregue a página ou aplique a migração do banco.");
        return;
      }
      const newId = draftGerId ?? crypto.randomUUID();
      const gersDaDir = gerencias.filter((x) => x.diretoria_id === mdGer.diretoriaId);
      const centro_custos = proximoCentroCustosGerencia(dir.centro_custos, gersDaDir);
      const { error } = await supabase
        .from("rh_org_gerencias")
        .insert({ id: newId, ...payload, diretoria_id: mdGer.diretoriaId, status: "ativo", centro_custos });
      setSalvandoGer(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder imediato de outra gerência ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Gerência criada.");
    } else if (mdGer?.mode === "edit") {
      const { error } = await supabase.from("rh_org_gerencias").update(payload).eq("id", mdGer.row.id);
      setSalvandoGer(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder imediato de outra gerência ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Gerência atualizada.");
    }
    setMdGer(null);
    setDraftGerId(null);
    setSobreGerencia("");
    await carregar();
  };

  const abrirNovoTime = (gerenciaId: string) => {
    setNomeTime("");
    setFidTime("");
    setDraftTimeId(crypto.randomUUID());
    setMdTime({ mode: "new", gerenciaId });
  };

  const abrirEditTime = (row: RhOrgTime) => {
    setDraftTimeId(null);
    setNomeTime(row.nome);
    setFidTime(row.lider_funcionario_id ?? "");
    setMdTime({ mode: "edit", row });
  };

  const salvarTime = async () => {
    if (!nomeTime.trim()) {
      setErroGlobal("Informe o nome do time.");
      return;
    }
    if (!fidTime.trim()) {
      setErroGlobal("Selecione o líder imediato cadastrado na Gestão de Prestadores.");
      return;
    }
    setSalvandoTime(true);
    setErroGlobal(null);
    const payload = {
      nome: nomeTime.trim(),
      lider_funcionario_id: fidTime,
      lider_nome_livre: null,
    };
    if (mdTime?.mode === "new") {
      const ger = gerencias.find((x) => x.id === mdTime.gerenciaId);
      if (!ger?.centro_custos) {
        setSalvandoTime(false);
        setErroGlobal("Gerência sem centro de custos. Recarregue a página ou aplique a migração do banco.");
        return;
      }
      const newId = draftTimeId ?? crypto.randomUUID();
      const timesDaGer = times.filter((x) => x.gerencia_id === mdTime.gerenciaId);
      const centro_custos = proximoCentroCustosTime(ger.centro_custos, timesDaGer);
      const { error } = await supabase
        .from("rh_org_times")
        .insert({ id: newId, ...payload, gerencia_id: mdTime.gerenciaId, status: "ativo", centro_custos });
      setSalvandoTime(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder imediato de outro time ativo.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Time criado.");
    } else if (mdTime?.mode === "edit") {
      const { error } = await supabase.from("rh_org_times").update(payload).eq("id", mdTime.row.id);
      setSalvandoTime(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder imediato de outro time ativo.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Time atualizado.");
    }
    setMdTime(null);
    setDraftTimeId(null);
    await carregar();
  };

  const prepararDesativarDiretoria = (d: RhOrgDiretoriaComFilhos) => {
    const ng = contarGerenciasAtivasFilhasDeDiretoria(arvore, d.id);
    const nt = contarTimesAtivosSobDiretoria(arvore, d.id);
    setModalOff({
      tipo: "diretoria",
      row: d,
      titulo: "Desativar diretoria",
      corpo: `A diretoria "${d.nome}" será marcada como inativa. As gerências e times abaixo dela permanecem como estão (${ng} gerência(s) ativa(s), ${nt} time(s) ativo(s)) — ajuste-os depois se necessário.`,
    });
  };

  const prepararDesativarGerencia = (g: RhOrgGerenciaComFilhos) => {
    const nt = contarTimesAtivosFilhosDeGerencia(arvore, g.id);
    setModalOff({
      tipo: "gerencia",
      row: g,
      titulo: "Desativar gerência",
      corpo: `A gerência "${g.nome}" será marcada como inativa. Os times filhos não são desativados automaticamente (${nt} time(s) ativo(s) vinculado(s)).`,
    });
  };

  const prepararDesativarTime = (ti: RhOrgTime) => {
    const q = countsMap[ti.id] ?? 0;
    setModalOff({
      tipo: "time",
      row: ti,
      titulo: "Desativar time",
      corpo: `O time "${ti.nome}" ficará inativo. ${q} funcionário(s) ativo(s) ainda podem estar vinculados a este time no cadastro — revise o cadastro de funcionários.`,
    });
  };

  const executarDesativar = async () => {
    if (!modalOff) return;
    setDesativando(true);
    setErroGlobal(null);
    const tabela =
      modalOff.tipo === "diretoria" ? "rh_org_diretorias" : modalOff.tipo === "gerencia" ? "rh_org_gerencias" : "rh_org_times";
    const { error } = await supabase.from(tabela).update({ status: "inativo" }).eq("id", modalOff.row.id);
    setDesativando(false);
    if (error) {
      setErroGlobal(error.message);
      return;
    }
    setSucessoMsg("Registro desativado.");
    setModalOff(null);
    await carregar();
  };

  const prepararExcluirTime = (ti: RhOrgTime) => {
    const q = countsMap[ti.id] ?? 0;
    setModalExcluir({
      tipo: "time",
      row: ti,
      titulo: "Excluir time",
      corpo: `O time "${ti.nome}" será removido definitivamente do organograma.${
        q > 0
          ? ` ${q} funcionário(s) ativo(s) com vínculo a este time ficarão sem time (campo esvaziado automaticamente).`
          : ""
      } Esta ação não pode ser desfeita.`,
    });
  };

  const prepararExcluirGerencia = (g: RhOrgGerenciaComFilhos) => {
    const nTimes = g.times.length;
    let nFunc = 0;
    g.times.forEach((ti) => {
      nFunc += countsMap[ti.id] ?? 0;
    });
    setModalExcluir({
      tipo: "gerencia",
      row: g,
      titulo: "Excluir gerência",
      corpo: `A gerência "${g.nome}" e ${nTimes} time(s) abaixo dela serão removidos definitivamente.${
        nFunc > 0 ? ` ${nFunc} funcionário(s) ativo(s) perderão o vínculo de time.` : ""
      } Esta ação não pode ser desfeita.`,
    });
  };

  const prepararExcluirDiretoria = (d: RhOrgDiretoriaComFilhos) => {
    const { timeIds, gerenciaIds } = coletarIdsTimesEGerenciasDaDiretoria(arvore, d.id);
    let nFunc = 0;
    d.gerencias.forEach((g) => {
      g.times.forEach((ti) => {
        nFunc += countsMap[ti.id] ?? 0;
      });
    });
    setModalExcluir({
      tipo: "diretoria",
      row: d,
      titulo: "Excluir diretoria",
      corpo: `A diretoria "${d.nome}", ${gerenciaIds.length} gerência(s) e ${timeIds.length} time(s) serão removidos definitivamente.${
        nFunc > 0 ? ` ${nFunc} funcionário(s) ativo(s) perderão o vínculo de time.` : ""
      } Esta ação não pode ser desfeita.`,
    });
  };

  const executarExcluir = async () => {
    if (!modalExcluir) return;
    setExcluindo(true);
    setErroGlobal(null);
    const { tipo, row } = modalExcluir;
    try {
      if (tipo === "time") {
        const { error } = await supabase.from("rh_org_times").delete().eq("id", row.id);
        if (error) {
          setErroGlobal(error.message);
          return;
        }
        setSucessoMsg("Time excluído.");
        setModalExcluir(null);
        await carregar();
        return;
      }
      if (tipo === "gerencia") {
        const timeIds = coletarIdsTimesDaGerencia(arvore, row.id);
        const errT = await deleteIdsInChunks("rh_org_times", timeIds);
        if (errT) {
          setErroGlobal(errT);
          return;
        }
        const { error } = await supabase.from("rh_org_gerencias").delete().eq("id", row.id);
        if (error) {
          setErroGlobal(error.message);
          return;
        }
        setSucessoMsg("Gerência excluída.");
        setModalExcluir(null);
        await carregar();
        return;
      }
      const { timeIds, gerenciaIds } = coletarIdsTimesEGerenciasDaDiretoria(arvore, row.id);
      const errT = await deleteIdsInChunks("rh_org_times", timeIds);
      if (errT) {
        setErroGlobal(errT);
        return;
      }
      const errG = await deleteIdsInChunks("rh_org_gerencias", gerenciaIds);
      if (errG) {
        setErroGlobal(errG);
        return;
      }
      const { error } = await supabase.from("rh_org_diretorias").delete().eq("id", row.id);
      if (error) {
        setErroGlobal(error.message);
        return;
      }
      if (filtroDiretoriaId === row.id) setFiltroDiretoriaId(ORG_FILTRO_TODAS_DIRETORIAS);
      setSucessoMsg("Diretoria excluída.");
      setModalExcluir(null);
      await carregar();
    } finally {
      setExcluindo(false);
    }
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const podeEditar = perm.canEditarOk;
  const podeExcluir = perm.canExcluirOk;

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<Network size={16} aria-hidden />}
        title="Organograma"
        subtitle="Diretorias, gerências e times"
        actions={
          podeEditar && modo === "gerenciar" ? (
            <button
              type="button"
              onClick={abrirNovaDiretoria}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                background: ctaGradient(brand),
              }}
            >
              <Plus size={16} aria-hidden />
              Nova diretoria
            </button>
          ) : null
        }
      />

      {erroGlobal ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erroGlobal}
        </div>
      ) : null}

      {sucessoMsg ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} color="#22c55e" aria-hidden />
          {sucessoMsg}
        </div>
      ) : null}

      <OrgFiltroBarDiretorias
        diretorias={diretorias}
        filtroDiretoriaId={filtroDiretoriaId}
        onFiltroChange={setFiltroDiretoriaId}
        t={t}
        brand={{ blockBg: brand.blockBg, accent: brand.accent, useBrand: brand.useBrand }}
        loading={loading}
        podeEditar={podeEditar}
        modo={modo}
        setModo={setModo}
      />

      <div
        role={podeEditar ? "tabpanel" : undefined}
        id={podeEditar ? `panel-org-${modo}` : undefined}
        aria-labelledby={podeEditar ? `tab-org-${modo}` : undefined}
        style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          padding: 20,
          boxShadow: cardShadow,
          minHeight: 200,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : modo === "visual" ? (
          filtroDiretoriaId === ORG_FILTRO_TODAS_DIRETORIAS ? (
            <OrgTreeVisual
              arvore={arvore}
              t={t}
              nomeResponsavel={nomeResponsavel}
              onAbrirVagas={abrirVagasVisual}
              onAbrirEstrutura={abrirEstruturaVisual}
            />
          ) : dirSelecionada ? (
            <OrgVisualizacaoDiretoriaUnica
              d={dirSelecionada}
              t={{ ...t, isDark }}
              nomeResponsavel={nomeResponsavel}
              countsPorTimeId={countsMap}
              onAbrirVagas={abrirVagasVisual}
              onAbrirEstrutura={abrirEstruturaVisual}
            />
          ) : (
            <div style={{ padding: "32px 12px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
              <p style={{ margin: "0 0 12px" }}>Diretoria não encontrada ou removida.</p>
              <button
                type="button"
                onClick={() => setFiltroDiretoriaId(ORG_FILTRO_TODAS_DIRETORIAS)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Voltar para todas as diretorias
              </button>
            </div>
          )
        ) : (
          <OrgAccordion
            arvore={arvore}
            t={t}
            expanded={expanded}
            toggle={toggle}
            nomeResponsavel={nomeResponsavel}
            countsPorTimeId={countsMap}
            podeEditar={podeEditar}
            podeExcluir={podeExcluir}
            onEditDiretoria={abrirEditDiretoria}
            onEditGerencia={abrirEditGerencia}
            onEditTime={abrirEditTime}
            onAddGerencia={abrirNovaGerencia}
            onAddTime={abrirNovoTime}
            onDeactivateDiretoria={prepararDesativarDiretoria}
            onDeactivateGerencia={prepararDesativarGerencia}
            onDeactivateTime={prepararDesativarTime}
            onExcluirDiretoria={prepararExcluirDiretoria}
            onExcluirGerencia={prepararExcluirGerencia}
            onExcluirTime={prepararExcluirTime}
          />
        )}
      </div>

      {mdDir !== null ? (
        <ModalBase
          maxWidth={480}
          onClose={() => {
            if (!salvandoDir) {
              setMdDir(null);
              setDraftDirId(null);
              setFotoDiretorFile(null);
              setDiretorSobre("");
            }
          }}
        >
          <ModalHeader
            title={mdDir === "new" ? "Nova diretoria" : "Editar diretoria"}
            onClose={() => {
              if (!salvandoDir) {
                setMdDir(null);
                setDraftDirId(null);
                setFotoDiretorFile(null);
                setDiretorSobre("");
              }
            }}
          />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome da diretoria
              {req}
            </label>
            <input id="org-nome-dir" value={nomeDir} onChange={(e) => setNomeDir(e.target.value)} style={inputStyle} aria-required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-cc-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Centro de custos (automático)
            </label>
            <input
              id="org-cc-dir"
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              value={
                mdDir === "new"
                  ? centroPreviewNovaDiretoria || "—"
                  : typeof mdDir === "object"
                    ? mdDir.centro_custos
                    : ""
              }
              style={inputReadonlyStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-fid-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Diretor(a) (prestador cadastrado)
            </label>
            <select id="org-fid-dir" value={fidDir} onChange={(e) => setFidDir(e.target.value)} style={inputStyle} aria-label="Diretor funcionário">
              <option value="">— Nenhum —</option>
              {optsFunc}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-livre-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome livre (se ainda não houver cadastro)
            </label>
            <input id="org-livre-dir" value={livreDir} onChange={(e) => setLivreDir(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-foto-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Foto do Diretor(a)
              {req}
            </label>
            <input
              id="org-foto-dir"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFotoDiretorFile(e.target.files?.[0] ?? null)}
              style={{ ...inputStyle, padding: 8 }}
            />
            {fotoDiretorPreviewUrl || (typeof mdDir === "object" && mdDir.diretor_foto_url) ? (
              <div style={{ marginTop: 10 }}>
                <img
                  src={fotoDiretorPreviewUrl ?? (typeof mdDir === "object" ? mdDir.diretor_foto_url! : "")}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 10, border: `1px solid ${t.cardBorder}` }}
                />
              </div>
            ) : null}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-sobre-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Sobre o Diretor(a)
              {req}
            </label>
            <textarea
              id="org-sobre-dir"
              value={diretorSobre}
              onChange={(e) => setDiretorSobre(e.target.value)}
              style={textareaStyle}
              rows={5}
              aria-required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              disabled={salvandoDir}
              onClick={() => {
                setMdDir(null);
                setDraftDirId(null);
                setFotoDiretorFile(null);
                setDiretorSobre("");
              }}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvandoDir}
              onClick={() => void salvarDiretoria()}
              style={{
                ...inputStyle,
                width: "auto",
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                cursor: salvandoDir ? "wait" : "pointer",
              }}
            >
              {salvandoDir ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Salvar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {mdGer !== null ? (
        <ModalBase
          maxWidth={480}
          onClose={() => {
            if (!salvandoGer) {
              setMdGer(null);
              setDraftGerId(null);
              setSobreGerencia("");
            }
          }}
        >
          <ModalHeader
            title={mdGer.mode === "new" ? "Nova gerência" : "Editar gerência"}
            onClose={() => {
              if (!salvandoGer) {
                setMdGer(null);
                setDraftGerId(null);
                setSobreGerencia("");
              }
            }}
          />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome da gerência
              {req}
            </label>
            <input id="org-nome-ger" value={nomeGer} onChange={(e) => setNomeGer(e.target.value)} style={inputStyle} aria-required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-cc-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Centro de custos (automático)
            </label>
            <input
              id="org-cc-ger"
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              value={
                mdGer.mode === "new"
                  ? centroPreviewNovaGerencia || "—"
                  : mdGer.row.centro_custos
              }
              style={inputReadonlyStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-sobre-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Sobre a Gerência
              {req}
            </label>
            <textarea
              id="org-sobre-ger"
              value={sobreGerencia}
              onChange={(e) => setSobreGerencia(e.target.value)}
              style={textareaStyle}
              rows={4}
              aria-required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-fid-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Líder imediato (Gestão de Prestadores)
              {req}
            </label>
            <select
              id="org-fid-ger"
              value={fidGer}
              onChange={(e) => setFidGer(e.target.value)}
              style={inputStyle}
              aria-label="Líder imediato prestador"
              aria-required
            >
              <option value="">Selecione o prestador</option>
              {optsFunc}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              disabled={salvandoGer}
              onClick={() => {
                setMdGer(null);
                setDraftGerId(null);
                setSobreGerencia("");
              }}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvandoGer}
              onClick={() => void salvarGerencia()}
              style={{
                ...inputStyle,
                width: "auto",
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                cursor: salvandoGer ? "wait" : "pointer",
              }}
            >
              {salvandoGer ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Salvar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {mdTime !== null ? (
        <ModalBase
          maxWidth={480}
          onClose={() => {
            if (!salvandoTime) {
              setMdTime(null);
              setDraftTimeId(null);
            }
          }}
        >
          <ModalHeader
            title={mdTime.mode === "new" ? "Novo time" : "Editar time"}
            onClose={() => {
              if (!salvandoTime) {
                setMdTime(null);
                setDraftTimeId(null);
              }
            }}
          />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome do time
              {req}
            </label>
            <input id="org-nome-time" value={nomeTime} onChange={(e) => setNomeTime(e.target.value)} style={inputStyle} aria-required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-cc-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Centro de custos (automático)
            </label>
            <input
              id="org-cc-time"
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              value={
                mdTime.mode === "new"
                  ? centroPreviewNovoTime || "—"
                  : mdTime.row.centro_custos
              }
              style={inputReadonlyStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-fid-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Líder imediato (Gestão de Prestadores)
              {req}
            </label>
            <select
              id="org-fid-time"
              value={fidTime}
              onChange={(e) => setFidTime(e.target.value)}
              style={inputStyle}
              aria-label="Líder imediato prestador"
              aria-required
            >
              <option value="">Selecione o prestador</option>
              {optsFunc}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              disabled={salvandoTime}
              onClick={() => {
                setMdTime(null);
                setDraftTimeId(null);
              }}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvandoTime}
              onClick={() => void salvarTime()}
              style={{
                ...inputStyle,
                width: "auto",
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                cursor: salvandoTime ? "wait" : "pointer",
              }}
            >
              {salvandoTime ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Salvar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {modalVagasTodas ? (
        <ModalBase maxWidth={560} onClose={() => setModalVagasTodas(false)}>
          <ModalHeader title="Vagas" onClose={() => setModalVagasTodas(false)} />
          <div style={{ maxHeight: "min(70vh, 520px)", overflowY: "auto", paddingRight: 4 }}>
            {arvore.map((d) => (
              <OrgBlocoVagasPlaceholder key={d.id} t={t} titulo="" subtitulo={`Diretoria: ${d.nome}`} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" onClick={() => setModalVagasTodas(false)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {modalOff ? (
        <ModalBase maxWidth={460} onClose={() => !desativando && setModalOff(null)}>
          <ModalHeader title={modalOff.titulo} onClose={() => !desativando && setModalOff(null)} />
          <p style={{ color: t.text, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.5 }}>{modalOff.corpo}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button
              type="button"
              disabled={desativando}
              onClick={() => setModalOff(null)}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={desativando}
              onClick={() => void executarDesativar()}
              style={{
                ...inputStyle,
                width: "auto",
                border: "none",
                background: "#e84025",
                color: "#fff",
                fontWeight: 700,
                cursor: desativando ? "wait" : "pointer",
              }}
            >
              {desativando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Desativar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {modalExcluir ? (
        <ModalBase maxWidth={480} onClose={() => !excluindo && setModalExcluir(null)}>
          <ModalHeader title={modalExcluir.titulo} onClose={() => !excluindo && setModalExcluir(null)} />
          <p style={{ color: t.text, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.5 }}>{modalExcluir.corpo}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button
              type="button"
              disabled={excluindo}
              onClick={() => setModalExcluir(null)}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={excluindo}
              onClick={() => void executarExcluir()}
              style={{
                ...inputStyle,
                width: "auto",
                border: "none",
                background: "#e84025",
                color: "#fff",
                fontWeight: 700,
                cursor: excluindo ? "wait" : "pointer",
              }}
            >
              {excluindo ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Excluir definitivamente
            </button>
          </div>
        </ModalBase>
      ) : null}

      {modalAcaoVisual ? (
        <ModalBase maxWidth={420} onClose={() => setModalAcaoVisual(null)}>
          <ModalHeader
            title={
              modalAcaoVisual.tipo === "vagas"
                ? "Vagas"
                : "Estrutura"
            }
            onClose={() => setModalAcaoVisual(null)}
          />
          <p style={{ color: t.textMuted, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.55 }}>
            Conteúdo em desenvolvimento. Você abriu{" "}
            <strong style={{ color: t.text }}>{modalAcaoVisual.tipo === "vagas" ? "Vagas" : "Estrutura"}</strong> para{" "}
            <strong style={{ color: t.text }}>
              {modalAcaoVisual.ctx.nivel === "diretoria"
                ? "Diretoria"
                : modalAcaoVisual.ctx.nivel === "gerencia"
                  ? "Gerência"
                  : "Time"}{" "}
              {modalAcaoVisual.ctx.nome}
            </strong>
            .
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button type="button" onClick={() => setModalAcaoVisual(null)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}
