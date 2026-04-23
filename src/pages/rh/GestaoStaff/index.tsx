import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Users } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { RhFuncionario, RhFuncionarioHistorico } from "../../../types/rhFuncionario";

type StaffTimeRow = { id: string; nome: string; gerencia_id: string; gerencia_nome: string };

type StaffSkillKey = "baccarat" | "blackjack" | "vip" | "roleta" | "futebol_studio";
type StaffSkillStatus = "ativo" | "treinamento" | "inativo";

const STAFF_SKILL_KEYS: { key: StaffSkillKey; label: string }[] = [
  { key: "baccarat", label: "Baccarat" },
  { key: "blackjack", label: "Blackjack" },
  { key: "vip", label: "VIP" },
  { key: "roleta", label: "Roleta" },
  { key: "futebol_studio", label: "Futebol Studio" },
];

const SKILL_STATUS_OPTS: { value: StaffSkillStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "treinamento", label: "Treinamento" },
  { value: "inativo", label: "Inativo" },
];

function labelStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "Ativo";
  if (s === "indisponivel") return "Indisponível";
  return "Encerrado";
}

function fmtDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function normalizarSkills(raw: Record<string, unknown> | null | undefined): Record<StaffSkillKey, StaffSkillStatus> {
  const out: Record<string, StaffSkillStatus> = {};
  for (const { key } of STAFF_SKILL_KEYS) {
    const v = String(raw?.[key] ?? "inativo").toLowerCase();
    out[key] =
      v === "ativo" || v === "treinamento" || v === "inativo" ? (v as StaffSkillStatus) : "inativo";
  }
  return out as Record<StaffSkillKey, StaffSkillStatus>;
}

function skillsParaJson(s: Record<StaffSkillKey, StaffSkillStatus>): Record<string, string> {
  const o: Record<string, string> = {};
  STAFF_SKILL_KEYS.forEach(({ key }) => {
    o[key] = s[key];
  });
  return o;
}

function stringifySkills(s: Record<StaffSkillKey, StaffSkillStatus>): string {
  return JSON.stringify(skillsParaJson(s));
}

/** Títulos no histórico: novos saves já usam nome curto; entradas antigas são normalizadas na leitura. */
function labelCampoHistorico(campo: string): string {
  const c = campo.trim();
  if (c === "Operadora (slug)") return "Operadora";
  if (c === "Skills (JSON)") return "Skills";
  return c;
}

type VerAba = "pessoal" | "funcao" | "skills" | "historico";

function CampoLeitura({ k, v, t }: { k: string; v: string; t: { textMuted: string; text: string } }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
      <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.45 }}>{v || "—"}</div>
    </div>
  );
}

export default function RhGestaoStaffPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_staff");

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(true);
  const [erroTimes, setErroTimes] = useState<string | null>(null);

  const [operadorasNome, setOperadorasNome] = useState<Record<string, string>>({});
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);

  const [todosTimes, setTodosTimes] = useState(true);
  const [idxTime, setIdxTime] = useState(0);

  const [modalVer, setModalVer] = useState<RhFuncionario | null>(null);
  const [modalEditar, setModalEditar] = useState<RhFuncionario | null>(null);

  const carregarTimes = useCallback(async () => {
    setLoadingTimes(true);
    setErroTimes(null);
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setErroTimes("Não foi possível carregar os times. Aplique a migration e verifique a permissão rh_staff.");
      setTimes([]);
    } else {
      setTimes((data ?? []) as StaffTimeRow[]);
    }
    setLoadingTimes(false);
  }, []);

  const carregarOperadoras = useCallback(async () => {
    const { data } = await supabase.from("operadoras").select("slug, nome").eq("ativo", true);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: { slug: string; nome: string }) => {
      m[r.slug] = r.nome;
    });
    setOperadorasNome(m);
  }, []);

  const carregarPrestadores = useCallback(async (timeIds: string[]) => {
    if (timeIds.length === 0) {
      setPrestadores([]);
      setLoadingPrestadores(false);
      return;
    }
    setLoadingPrestadores(true);
    const { data, error } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .in("org_time_id", timeIds)
      .in("status", ["ativo", "indisponivel"])
      .order("nome", { ascending: true });
    if (error) setPrestadores([]);
    else setPrestadores((data ?? []) as RhFuncionario[]);
    setLoadingPrestadores(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarTimes();
    void carregarOperadoras();
  }, [perm.loading, perm.canView, carregarTimes, carregarOperadoras]);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const timeIdsKey = useMemo(() => [...timeIds].sort().join(","), [timeIds]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (timeIds.length === 0) {
      setPrestadores([]);
      setLoadingPrestadores(false);
      return;
    }
    void carregarPrestadores(timeIds);
  }, [perm.loading, perm.canView, timeIdsKey, carregarPrestadores, timeIds]);

  useEffect(() => {
    if (times.length === 0) return;
    if (idxTime >= times.length) setIdxTime(0);
  }, [times.length, idxTime]);

  const linhasTabela = useMemo(() => {
    if (times.length === 0) return [];
    const permitidos = new Set(timeIds);
    let rows = prestadores.filter((p) => p.org_time_id && permitidos.has(p.org_time_id));
    if (!todosTimes && times[idxTime]) {
      const tid = times[idxTime]!.id;
      rows = rows.filter((p) => p.org_time_id === tid);
    }
    return rows;
  }, [prestadores, times, todosTimes, idxTime, timeIds]);

  const timeLabelCentro = useMemo(() => {
    if (times.length === 0) return "—";
    const row = times[idxTime];
    if (!row) return "—";
    return row.nome;
  }, [times, idxTime]);

  const podeTimeAnterior = !todosTimes && times.length > 0 && idxTime > 0;
  const podeTimeProximo = !todosTimes && times.length > 0 && idxTime < times.length - 1;

  const btnNavStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<Users size={14} aria-hidden />}
        title="Gestão de Staff"
        subtitle="Prestadores dos times de Studio Operations e Customer Service."
      />

      {erroTimes && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroTimes}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIdxTime((i) => Math.max(0, i - 1))}
              disabled={!podeTimeAnterior}
              aria-label="Time anterior"
              style={{
                ...btnNavStyle,
                opacity: podeTimeAnterior ? 1 : 0.35,
                cursor: podeTimeAnterior ? "pointer" : "not-allowed",
              }}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                minWidth: "clamp(140px, 36vw, 260px)",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={!todosTimes && times[idxTime] ? `${times[idxTime]!.gerencia_nome} — ${times[idxTime]!.nome}` : undefined}
            >
              {todosTimes ? "Todos os times" : timeLabelCentro}
            </span>
            <button
              type="button"
              onClick={() => setIdxTime((i) => Math.min(times.length - 1, i + 1))}
              disabled={!podeTimeProximo}
              aria-label="Próximo time"
              style={{
                ...btnNavStyle,
                opacity: podeTimeProximo ? 1 : 0.35,
                cursor: podeTimeProximo ? "pointer" : "not-allowed",
              }}
            >
              <ChevronRight size={14} aria-hidden />
            </button>

            <button
              type="button"
              aria-label={todosTimes ? "Filtrar por um time" : "Ver todos os times"}
              aria-pressed={todosTimes}
              onClick={() => {
                setTodosTimes((v) => !v);
                setIdxTime(0);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                minHeight: 44,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: todosTimes ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: todosTimes
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                    : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                  : "transparent",
                color: todosTimes ? brand.accent : t.textMuted,
                fontWeight: todosTimes ? 700 : 400,
              }}
            >
              Todos os Times
            </button>

            {loadingTimes ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
                <Loader2 size={14} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {loadingPrestadores || loadingTimes ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando prestadores…</span>
        </div>
      ) : times.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum time encontrado para as gerências Studio Operations ou Customer Service. Ajuste os nomes no organograma ou
          contacte o RH.
        </div>
      ) : (
        <div className="app-table-wrap">
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <caption style={{ display: "none" }}>Staff por time</caption>
            <thead>
              <tr>
                <th scope="col" style={getThStyle(t)}>
                  Nome
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Função
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Nickname
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Turno
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Status
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Operadora
                </th>
                <th scope="col" style={getThStyle(t)}>
                  ID operacional
                </th>
                <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {linhasTabela.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...getTdStyle(t), textAlign: "center", padding: "32px 16px", color: t.textMuted }}>
                    Nenhum prestador neste filtro.
                  </td>
                </tr>
              ) : (
                linhasTabela.map((row, i) => {
                  const opSlug = row.staff_operadora_slug?.trim();
                  const opNome = opSlug ? operadorasNome[opSlug] ?? opSlug : "—";
                  return (
                    <tr key={row.id} style={{ background: zebraStripe(i) }}>
                      <td style={getTdStyle(t)} title={row.nome}>
                        {row.nome}
                      </td>
                      <td style={getTdStyle(t)}>{row.cargo?.trim() || "—"}</td>
                      <td style={getTdStyle(t)}>{row.staff_nickname?.trim() || "—"}</td>
                      <td style={getTdStyle(t)}>{row.escala?.trim() || "—"}</td>
                      <td style={getTdStyle(t)}>{labelStatusPrestador(row.status)}</td>
                      <td style={getTdStyle(t)}>{opNome}</td>
                      <td style={getTdStyle(t)} title={row.staff_id_operacional?.trim() || undefined}>
                        {row.staff_id_operacional?.trim() || "—"}
                      </td>
                      <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => setModalVer(row)}
                            aria-label={`Ver ${row.nome}`}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.inputBg ?? "transparent",
                              color: t.text,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: FONT.body,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Eye size={14} aria-hidden />
                            Ver
                          </button>
                          {perm.canEditarOk ? (
                            <button
                              type="button"
                              onClick={() => setModalEditar(row)}
                              aria-label={`Editar ${row.nome}`}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 8,
                                border: `1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)`,
                                background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
                                color: "var(--brand-action, #7c3aed)",
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: FONT.body,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Pencil size={14} aria-hidden />
                              Editar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalVer ? (
        <ModalStaffVer
          row={modalVer}
          operadorasNome={operadorasNome}
          onClose={() => setModalVer(null)}
          t={t}
          brand={brand}
        />
      ) : null}

      {modalEditar ? (
        <ModalStaffEditar
          row={modalEditar}
          operadorasNome={operadorasNome}
          operadoraSlugs={Object.keys(operadorasNome).sort((a, b) =>
            (operadorasNome[a] ?? a).localeCompare(operadorasNome[b] ?? b, "pt-BR"),
          )}
          userEmail={user?.email ?? null}
          onClose={() => setModalEditar(null)}
          onSalvo={(atualizado) => {
            setPrestadores((lista) => lista.map((p) => (p.id === atualizado.id ? atualizado : p)));
            setModalEditar(null);
            setModalVer(null);
          }}
          t={t}
          brand={brand}
        />
      ) : null}
    </div>
  );
}

function ModalStaffVer({
  row,
  operadorasNome,
  onClose,
  t,
  brand,
}: {
  row: RhFuncionario;
  operadorasNome: Record<string, string>;
  onClose: () => void;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const [aba, setAba] = useState<VerAba>("pessoal");
  const [hist, setHist] = useState<RhFuncionarioHistorico[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [nomesAutor, setNomesAutor] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aba !== "historico") return;
    setHistLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("rh_funcionario_historico")
        .select("*")
        .eq("rh_funcionario_id", row.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        setHist([]);
        setHistLoading(false);
        return;
      }
      const items = (data ?? []) as RhFuncionarioHistorico[];
      setHist(items);
      const ids = [...new Set(items.map((h) => h.created_by).filter(Boolean))] as string[];
      if (ids.length === 0) {
        setNomesAutor({});
        setHistLoading(false);
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null }) => {
        m[p.id] = (p.name ?? "").trim() || p.id.slice(0, 8);
      });
      setNomesAutor(m);
      setHistLoading(false);
    })();
  }, [aba, row.id]);

  const skills = useMemo(() => normalizarSkills(row.staff_skills as Record<string, unknown>), [row.staff_skills]);
  const opSlug = row.staff_operadora_slug?.trim();
  const opNome = opSlug ? operadorasNome[opSlug] ?? opSlug : "—";

  const tabBtn = (key: VerAba, label: string) => {
    const ativo = aba === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={ativo}
        onClick={() => setAba(key)}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          fontFamily: FONT.body,
          fontSize: 12,
          cursor: "pointer",
          border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
          background: ativo
            ? brand.useBrand
              ? "color-mix(in srgb, var(--brand-accent) 14%, transparent)"
              : "rgba(124,58,237,0.14)"
            : (t.inputBg ?? "transparent"),
          color: ativo ? brand.accent : t.textMuted,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title={`Prestador — ${row.nome}`} onClose={onClose} />
      <div role="tablist" aria-label="Seções do prestador" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabBtn("pessoal", "Dados pessoais")}
        {tabBtn("funcao", "Dados de função")}
        {tabBtn("skills", "Dados de skills")}
        {tabBtn("historico", "Histórico")}
      </div>

      {aba === "pessoal" && (
        <div role="tabpanel">
          <CampoLeitura k="Nome" v={row.nome} t={t} />
          <CampoLeitura k="Status" v={labelStatusPrestador(row.status)} t={t} />
          <CampoLeitura k="Telefone" v={row.telefone} t={t} />
          <CampoLeitura k="E-mail" v={row.email} t={t} />
          <CampoLeitura k="Contato de emergência — nome" v={row.emerg_nome} t={t} />
          <CampoLeitura k="Contato de emergência — parentesco" v={row.emerg_parentesco} t={t} />
          <CampoLeitura k="Contato de emergência — telefone" v={row.emerg_telefone} t={t} />
        </div>
      )}

      {aba === "funcao" && (
        <div role="tabpanel">
          <CampoLeitura k="Função" v={row.cargo} t={t} />
          <CampoLeitura k="Nickname" v={row.staff_nickname ?? ""} t={t} />
          <CampoLeitura k="Turno" v={row.escala} t={t} />
          <CampoLeitura k="Operadora" v={opNome} t={t} />
          <CampoLeitura k="Barcode" v={row.staff_barcode ?? ""} t={t} />
          <CampoLeitura k="ID operacional" v={row.staff_id_operacional ?? ""} t={t} />
        </div>
      )}

      {aba === "skills" && (
        <div role="tabpanel">
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
            Status de conhecimento por jogo.
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STAFF_SKILL_KEYS.map(({ key, label }) => (
              <li
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: `1px solid ${t.cardBorder}`,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ color: t.textMuted }}>{SKILL_STATUS_OPTS.find((o) => o.value === skills[key])?.label ?? "Inativo"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aba === "historico" && (
        <div role="tabpanel" style={{ minWidth: 0, maxWidth: "100%" }}>
          {histLoading ? (
            <div style={{ color: t.textMuted, fontSize: 13 }}>
              <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ marginRight: 8, verticalAlign: "middle" }} />
              Carregando histórico…
            </div>
          ) : hist.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Nenhum registro no histórico.</div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: "50dvh",
                overflowY: "auto",
                minWidth: 0,
              }}
            >
              {hist.map((h) => {
                const det = h.detalhes ?? {};
                const labelUser = det.usuario_label != null ? String(det.usuario_label).trim() : "";
                const autor =
                  labelUser ||
                  (h.created_by ? nomesAutor[h.created_by] ?? h.created_by.slice(0, 8) : "—");
                const titulo = h.tipo === "staff_gestao_edicao" ? "Alteração (Gestão de Staff)" : h.tipo;
                return (
                  <li
                    key={h.id}
                    style={{
                      marginBottom: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg ?? "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                      minWidth: 0,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: t.text, fontSize: 13, marginBottom: 6 }}>{titulo}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
                      {fmtDataHora(h.created_at)} · {autor}
                    </div>
                    {"alteracoes" in det && Array.isArray(det.alteracoes) ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingInlineStart: 18,
                          color: t.text,
                          fontSize: 13,
                          minWidth: 0,
                          listStylePosition: "outside",
                        }}
                      >
                        {(det.alteracoes as { campo: string; antes: string; depois: string }[]).map((alt, j) => (
                          <li key={j} style={{ marginBottom: 10, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: FONT.body }}>
                              {labelCampoHistorico(alt.campo)}:
                            </div>
                            <div
                              style={{
                                fontFamily: FONT.body,
                                lineHeight: 1.45,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <span style={{ color: t.textMuted }}>{alt.antes}</span>
                              {" → "}
                              <span>{alt.depois}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: 12, color: t.textMuted }}>Sem detalhes estruturados desta entrada.</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </ModalBase>
  );
}

function ModalStaffEditar({
  row,
  operadorasNome,
  operadoraSlugs,
  userEmail,
  onClose,
  onSalvo,
  t,
  brand,
}: {
  row: RhFuncionario;
  operadorasNome: Record<string, string>;
  operadoraSlugs: string[];
  userEmail: string | null;
  onClose: () => void;
  onSalvo: (r: RhFuncionario) => void;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const [aba, setAba] = useState<"funcao" | "skills">("funcao");
  const [nick, setNick] = useState(row.staff_nickname ?? "");
  const [turno, setTurno] = useState(row.escala ?? "");
  const [opSlug, setOpSlug] = useState(row.staff_operadora_slug ?? "");
  const [barcode, setBarcode] = useState(row.staff_barcode ?? "");
  const [idOperacional, setIdOperacional] = useState(row.staff_id_operacional ?? "");
  const [skills, setSkills] = useState<Record<StaffSkillKey, StaffSkillStatus>>(() => normalizarSkills(row.staff_skills as Record<string, unknown>));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const salvar = async () => {
    setErr("");
    setSaving(true);
    const antes = {
      nick: (row.staff_nickname ?? "").trim(),
      turno: (row.escala ?? "").trim(),
      op: (row.staff_operadora_slug ?? "").trim(),
      barcode: (row.staff_barcode ?? "").trim(),
      idOp: (row.staff_id_operacional ?? "").trim(),
      skills: stringifySkills(normalizarSkills(row.staff_skills as Record<string, unknown>)),
    };
    const depois = {
      nick: nick.trim(),
      turno: turno.trim(),
      op: opSlug.trim(),
      barcode: barcode.trim(),
      idOp: idOperacional.trim(),
      skills: stringifySkills(skills),
    };
    const alteracoes: { campo: string; antes: string; depois: string }[] = [];
    if (antes.nick !== depois.nick) alteracoes.push({ campo: "Nickname", antes: antes.nick || "—", depois: depois.nick || "—" });
    if (antes.turno !== depois.turno) alteracoes.push({ campo: "Turno", antes: antes.turno || "—", depois: depois.turno || "—" });
    if (antes.op !== depois.op) alteracoes.push({ campo: "Operadora", antes: antes.op || "—", depois: depois.op || "—" });
    if (antes.barcode !== depois.barcode) alteracoes.push({ campo: "Barcode", antes: antes.barcode || "—", depois: depois.barcode || "—" });
    if (antes.idOp !== depois.idOp) alteracoes.push({ campo: "ID operacional", antes: antes.idOp || "—", depois: depois.idOp || "—" });
    if (antes.skills !== depois.skills) alteracoes.push({ campo: "Skills", antes: antes.skills, depois: depois.skills });

    const patch = {
      staff_nickname: depois.nick || null,
      escala: depois.turno,
      staff_operadora_slug: depois.op || null,
      staff_barcode: depois.barcode || null,
      staff_id_operacional: depois.idOp || null,
      staff_skills: skillsParaJson(skills),
    };

    const { data: updated, error } = await supabase.from("rh_funcionarios").update(patch).eq("id", row.id).select("*").single();
    if (error) {
      setErr("Não foi possível salvar. Tente novamente.");
      setSaving(false);
      return;
    }
    if (alteracoes.length > 0) {
      await supabase.from("rh_funcionario_historico").insert({
        rh_funcionario_id: row.id,
        tipo: "staff_gestao_edicao",
        detalhes: {
          alteracoes,
          usuario_label: userEmail ?? "—",
        },
        anexos: [],
      });
    }
    onSalvo(updated as RhFuncionario);
    setSaving(false);
  };

  const tabBtn = (key: "funcao" | "skills", label: string) => {
    const ativo = aba === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={ativo}
        onClick={() => setAba(key)}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          fontFamily: FONT.body,
          fontSize: 12,
          cursor: "pointer",
          border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
          background: ativo
            ? brand.useBrand
              ? "color-mix(in srgb, var(--brand-accent) 14%, transparent)"
              : "rgba(124,58,237,0.14)"
            : (t.inputBg ?? "transparent"),
          color: ativo ? brand.accent : t.textMuted,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title={`Editar — ${row.nome}`} onClose={onClose} />
      <div role="tablist" aria-label="Seções editáveis" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabBtn("funcao", "Dados de função")}
        {tabBtn("skills", "Dados de skills")}
      </div>

      {aba === "funcao" && (
        <div role="tabpanel">
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Função (somente leitura)</span>
            <input type="text" readOnly value={row.cargo} style={{ ...inputStyle, opacity: 0.85 }} aria-readonly />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-nick">
              Nickname
            </label>
            <input id="staff-nick" type="text" value={nick} onChange={(e) => setNick(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-turno">
              Turno
            </label>
            <input id="staff-turno" type="text" value={turno} onChange={(e) => setTurno(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-op">
              Operadora
            </label>
            <select id="staff-op" value={opSlug} onChange={(e) => setOpSlug(e.target.value)} style={inputStyle} aria-label="Operadora">
              <option value="">—</option>
              {operadoraSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {operadorasNome[slug] ?? slug}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-barcode">
              Barcode
            </label>
            <input id="staff-barcode" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-id-op">
              ID operacional
            </label>
            <input
              id="staff-id-op"
              type="text"
              value={idOperacional}
              onChange={(e) => setIdOperacional(e.target.value)}
              style={inputStyle}
              aria-describedby="staff-id-op-hint"
            />
            <div id="staff-id-op-hint" style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
              Código ou número usado na operação
            </div>
          </div>
        </div>
      )}

      {aba === "skills" && (
        <div role="tabpanel">
          {STAFF_SKILL_KEYS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor={`skill-${key}`}>
                {label}
              </label>
              <select
                id={`skill-${key}`}
                value={skills[key]}
                onChange={(e) => setSkills((s) => ({ ...s, [key]: e.target.value as StaffSkillStatus }))}
                style={inputStyle}
                aria-label={`Status ${label}`}
              >
                {SKILL_STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, marginBottom: 12, fontFamily: FONT.body }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.75 : 1,
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))",
          }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </ModalBase>
  );
}
