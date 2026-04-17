import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, CheckCircle2, LayoutList, Loader2, Network, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  contarGerenciasAtivasFilhasDeDiretoria,
  contarTimesAtivosFilhosDeGerencia,
  contarTimesAtivosSobDiretoria,
  montarArvoreOrganograma,
} from "../../../lib/rhOrganogramaTree";
import type { RhOrgDiretoria, RhOrgDiretoriaComFilhos, RhOrgGerencia, RhOrgGerenciaComFilhos, RhOrgTime } from "../../../types/rhOrganograma";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { OrgAccordion } from "../../../components/rh/organograma/OrgAccordion";
import { OrgTreeVisual } from "../../../components/rh/organograma/OrgTreeVisual";

type ModoPagina = "visual" | "gerenciar";

type ModalOff =
  | null
  | {
      tipo: "diretoria" | "gerencia" | "time";
      row: RhOrgDiretoria | RhOrgGerencia | RhOrgTime;
      titulo: string;
      corpo: string;
    };

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

export default function RhOrganogramaPage() {
  const { theme: t } = useApp();
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

  /** Diretoria: null | new | edit row */
  const [mdDir, setMdDir] = useState<null | "new" | RhOrgDiretoria>(null);
  const [nomeDir, setNomeDir] = useState("");
  const [fidDir, setFidDir] = useState("");
  const [livreDir, setLivreDir] = useState("");
  const [salvandoDir, setSalvandoDir] = useState(false);

  const [mdGer, setMdGer] = useState<null | { mode: "new"; diretoriaId: string } | { mode: "edit"; row: RhOrgGerencia }>(null);
  const [nomeGer, setNomeGer] = useState("");
  const [fidGer, setFidGer] = useState("");
  const [livreGer, setLivreGer] = useState("");
  const [salvandoGer, setSalvandoGer] = useState(false);

  const [mdTime, setMdTime] = useState<null | { mode: "new"; gerenciaId: string } | { mode: "edit"; row: RhOrgTime }>(null);
  const [nomeTime, setNomeTime] = useState("");
  const [fidTime, setFidTime] = useState("");
  const [livreTime, setLivreTime] = useState("");
  const [salvandoTime, setSalvandoTime] = useState(false);

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

  const nomePorFuncId = useMemo(() => {
    const m = new Map<string, string>();
    funcionarios.forEach((f) => m.set(f.id, f.nome));
    return m;
  }, [funcionarios]);

  const arvore = useMemo(
    () => montarArvoreOrganograma(diretorias, gerencias, times),
    [diretorias, gerencias, times],
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

  const abrirNovaDiretoria = () => {
    setNomeDir("");
    setFidDir("");
    setLivreDir("");
    setMdDir("new");
  };

  const abrirEditDiretoria = (row: RhOrgDiretoria) => {
    setNomeDir(row.nome);
    setFidDir(row.diretor_funcionario_id ?? "");
    setLivreDir(row.diretor_nome_livre ?? "");
    setMdDir(row);
  };

  const salvarDiretoria = async () => {
    if (!nomeDir.trim()) {
      setErroGlobal("Informe o nome da diretoria.");
      return;
    }
    setSalvandoDir(true);
    setErroGlobal(null);
    const payload = {
      nome: nomeDir.trim(),
      diretor_funcionario_id: fidDir || null,
      diretor_nome_livre: livreDir.trim() || null,
    };
    if (mdDir === "new") {
      const { error } = await supabase.from("rh_org_diretorias").insert({ ...payload, status: "ativo" });
      setSalvandoDir(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é diretor(a) de outra diretoria ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Diretoria criada.");
    } else if (mdDir !== null && typeof mdDir === "object") {
      const row = mdDir;
      const { error } = await supabase.from("rh_org_diretorias").update(payload).eq("id", row.id);
      setSalvandoDir(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é diretor(a) de outra diretoria ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Diretoria atualizada.");
    }
    setMdDir(null);
    await carregar();
  };

  const abrirNovaGerencia = (diretoriaId: string) => {
    setNomeGer("");
    setFidGer("");
    setLivreGer("");
    setMdGer({ mode: "new", diretoriaId });
  };

  const abrirEditGerencia = (row: RhOrgGerencia) => {
    setNomeGer(row.nome);
    setFidGer(row.gerente_funcionario_id ?? "");
    setLivreGer(row.gerente_nome_livre ?? "");
    setMdGer({ mode: "edit", row });
  };

  const salvarGerencia = async () => {
    if (!nomeGer.trim()) {
      setErroGlobal("Informe o nome da gerência.");
      return;
    }
    setSalvandoGer(true);
    setErroGlobal(null);
    const payload = {
      nome: nomeGer.trim(),
      gerente_funcionario_id: fidGer || null,
      gerente_nome_livre: livreGer.trim() || null,
    };
    if (mdGer?.mode === "new") {
      const { error } = await supabase
        .from("rh_org_gerencias")
        .insert({ ...payload, diretoria_id: mdGer.diretoriaId, status: "ativo" });
      setSalvandoGer(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é gerente de outra gerência ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Gerência criada.");
    } else if (mdGer?.mode === "edit") {
      const { error } = await supabase.from("rh_org_gerencias").update(payload).eq("id", mdGer.row.id);
      setSalvandoGer(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é gerente de outra gerência ativa.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Gerência atualizada.");
    }
    setMdGer(null);
    await carregar();
  };

  const abrirNovoTime = (gerenciaId: string) => {
    setNomeTime("");
    setFidTime("");
    setLivreTime("");
    setMdTime({ mode: "new", gerenciaId });
  };

  const abrirEditTime = (row: RhOrgTime) => {
    setNomeTime(row.nome);
    setFidTime(row.lider_funcionario_id ?? "");
    setLivreTime(row.lider_nome_livre ?? "");
    setMdTime({ mode: "edit", row });
  };

  const salvarTime = async () => {
    if (!nomeTime.trim()) {
      setErroGlobal("Informe o nome do time.");
      return;
    }
    setSalvandoTime(true);
    setErroGlobal(null);
    const payload = {
      nome: nomeTime.trim(),
      lider_funcionario_id: fidTime || null,
      lider_nome_livre: livreTime.trim() || null,
    };
    if (mdTime?.mode === "new") {
      const { error } = await supabase.from("rh_org_times").insert({ ...payload, gerencia_id: mdTime.gerenciaId, status: "ativo" });
      setSalvandoTime(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder de outro time ativo.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Time criado.");
    } else if (mdTime?.mode === "edit") {
      const { error } = await supabase.from("rh_org_times").update(payload).eq("id", mdTime.row.id);
      setSalvandoTime(false);
      if (error) {
        if (error.code === "23505") setErroGlobal("Este funcionário já é líder de outro time ativo.");
        else setErroGlobal(error.message);
        return;
      }
      setSucessoMsg("Time atualizado.");
    }
    setMdTime(null);
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

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<Network size={16} aria-hidden />}
        title="Organograma"
        subtitle="Diretorias, gerências e times — base para vínculo no cadastro de funcionários."
        actions={
          podeEditar ? (
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

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-pressed={modo === "visual"}
          onClick={() => setModo("visual")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${modo === "visual" ? "var(--brand-action, #7c3aed)" : t.cardBorder}`,
            background: modo === "visual" ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)" : t.inputBg,
            color: t.text,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: modo === "visual" ? 700 : 500,
          }}
        >
          <Network size={16} aria-hidden />
          Visualização
        </button>
        <button
          type="button"
          aria-pressed={modo === "gerenciar"}
          onClick={() => setModo("gerenciar")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${modo === "gerenciar" ? "var(--brand-action, #7c3aed)" : t.cardBorder}`,
            background: modo === "gerenciar" ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)" : t.inputBg,
            color: t.text,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: modo === "gerenciar" ? 700 : 500,
          }}
        >
          <LayoutList size={16} aria-hidden />
          Gerenciamento
        </button>
      </div>

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

      <div
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
          <OrgTreeVisual
            arvore={arvore}
            t={t}
            nomeResponsavel={nomeResponsavel}
            countsPorTimeId={countsMap}
            podeEditar={podeEditar}
            onEditDiretoria={abrirEditDiretoria}
            onEditGerencia={(g, _d) => abrirEditGerencia(g)}
            onEditTime={(ti) => abrirEditTime(ti)}
          />
        ) : (
          <OrgAccordion
            arvore={arvore}
            t={t}
            expanded={expanded}
            toggle={toggle}
            nomeResponsavel={nomeResponsavel}
            countsPorTimeId={countsMap}
            podeEditar={podeEditar}
            onEditDiretoria={abrirEditDiretoria}
            onEditGerencia={abrirEditGerencia}
            onEditTime={abrirEditTime}
            onAddGerencia={abrirNovaGerencia}
            onAddTime={abrirNovoTime}
            onDeactivateDiretoria={prepararDesativarDiretoria}
            onDeactivateGerencia={prepararDesativarGerencia}
            onDeactivateTime={prepararDesativarTime}
          />
        )}
      </div>

      {mdDir !== null ? (
        <ModalBase maxWidth={480} onClose={() => !salvandoDir && setMdDir(null)}>
          <ModalHeader title={mdDir === "new" ? "Nova diretoria" : "Editar diretoria"} onClose={() => !salvandoDir && setMdDir(null)} />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome da diretoria
            </label>
            <input id="org-nome-dir" value={nomeDir} onChange={(e) => setNomeDir(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-fid-dir" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Diretor(a) — funcionário cadastrado
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" disabled={salvandoDir} onClick={() => setMdDir(null)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
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
        <ModalBase maxWidth={480} onClose={() => !salvandoGer && setMdGer(null)}>
          <ModalHeader title={mdGer.mode === "new" ? "Nova gerência" : "Editar gerência"} onClose={() => !salvandoGer && setMdGer(null)} />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome da gerência
            </label>
            <input id="org-nome-ger" value={nomeGer} onChange={(e) => setNomeGer(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-fid-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Gerente — funcionário
            </label>
            <select id="org-fid-ger" value={fidGer} onChange={(e) => setFidGer(e.target.value)} style={inputStyle} aria-label="Gerente funcionário">
              <option value="">— Nenhum —</option>
              {optsFunc}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-livre-ger" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome livre
            </label>
            <input id="org-livre-ger" value={livreGer} onChange={(e) => setLivreGer(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" disabled={salvandoGer} onClick={() => setMdGer(null)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
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
        <ModalBase maxWidth={480} onClose={() => !salvandoTime && setMdTime(null)}>
          <ModalHeader title={mdTime.mode === "new" ? "Novo time" : "Editar time"} onClose={() => !salvandoTime && setMdTime(null)} />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-nome-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome do time
            </label>
            <input id="org-nome-time" value={nomeTime} onChange={(e) => setNomeTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="org-fid-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Líder — funcionário
            </label>
            <select id="org-fid-time" value={fidTime} onChange={(e) => setFidTime(e.target.value)} style={inputStyle} aria-label="Líder funcionário">
              <option value="">— Nenhum —</option>
              {optsFunc}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="org-livre-time" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
              Nome livre
            </label>
            <input id="org-livre-time" value={livreTime} onChange={(e) => setLivreTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" disabled={salvandoTime} onClick={() => setMdTime(null)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
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
    </div>
  );
}
