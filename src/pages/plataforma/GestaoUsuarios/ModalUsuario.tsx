import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { callSupabaseEdgeFunction, isAbortError } from "../../../lib/supabaseEdgeFetch";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import type { Role, UsuarioCompleto, Operadora } from "../../../types";
import { BRAND, ROLES, roleBadgeColor, GESTOR_TIPOS, PRESTADOR_TIPOS } from "./constants";
import { ROLES_STAFF_APENAS_PERMISSOES, roleParidadeInfluencer } from "../../../lib/staffRoles";
import { ParesAgenciaUI } from "./ParesAgenciaUI";
import { MultiSelect, SingleSelectOperadora } from "./ModalUsuarioScopeSelects";
import { SalvarCtaContent } from "./gestaoUsuariosUi";
import { ctaGradientSalvar, onInputBlurBrand, onInputFocusBrand } from "./gestaoUsuariosHelpers";

interface ModalUsuarioProps {
  editando: UsuarioCompleto | null;
  operadoras: Operadora[];
  onClose: () => void;
  onSalvo: () => void;
}

export function ModalUsuario({ editando, operadoras, onClose, onSalvo }: ModalUsuarioProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [nome, setNome] = useState(editando?.name ?? "");
  const [email, setEmail] = useState(editando?.email ?? "");
  const [role, setRole] = useState<Role>(editando?.role ?? "gestor");
  const [scopeInfluencers, setScopeInfluencers] = useState<string[]>([]);
  const [scopeOperadoras, setScopeOperadoras] = useState<string[]>([]);
  const [scopePares, setScopePares] = useState<string[]>([]);
  const [scopeGestorTipos, setScopeGestorTipos] = useState<string[]>([]);
  const [scopePrestadorTipos, setScopePrestadorTipos] = useState<string[]>([]);
  const [paresAgencia, setParesAgencia] = useState<Array<{ influencerId: string; operadoraSlug: string }>>([]);
  const [influencers, setInfluencers] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("role", ["influencer", "afiliado"])
        .order("name");
      if (!profiles?.length) {
        setInfluencers([]);
        return;
      }
      const ids = profiles.map((p: { id: string }) => p.id);
      const { data: perfis } = await supabase.from("influencer_perfil").select("id, nome_artistico").in("id", ids);
      const perfisMap = new Map((perfis ?? []).map((p: { id: string; nome_artistico: string }) => [p.id, p.nome_artistico]));
      setInfluencers(
        profiles.map((p: { id: string; name?: string; email?: string }) => ({
          id: p.id,
          nome: perfisMap.get(p.id) ?? p.name ?? p.email ?? p.id,
        }))
      );
    })();
  }, []);

  /** Sincroniza cabeçalho do formulário quando abre outro usuário (evita estado velho se o modal reutilizar instância). */
  useEffect(() => {
    setNome(editando?.name ?? "");
    setEmail(editando?.email ?? "");
    setRole((editando?.role ?? "gestor") as Role);
    setErro("");
  }, [editando?.id, editando?.name, editando?.email, editando?.role]);

  useEffect(() => {
    const scopes = editando?.scopes ?? [];
    const r = editando?.role ?? role;
    setScopeInfluencers(
      r === "gestor" || r === "executivo" || r === "investidor"
        ? []
        : scopes.filter((s) => s.scope_type === "influencer").map((s) => s.scope_ref)
    );
    setScopeOperadoras(
      r === "gestor" || r === "executivo" || r === "investidor" || ROLES_STAFF_APENAS_PERMISSOES.includes(r as Role)
        ? []
        : scopes.filter((s) => s.scope_type === "operadora").map((s) => s.scope_ref)
    );
    setScopePares(scopes.filter((s) => s.scope_type === "agencia_par").map((s) => s.scope_ref));
    setScopeGestorTipos(scopes.filter((s) => s.scope_type === "gestor_tipo").map((s) => s.scope_ref));
    setScopePrestadorTipos(scopes.filter((s) => s.scope_type === "prestador_tipo").map((s) => s.scope_ref));
  }, [editando, role]);

  /** Troca explícita no select: limpa escopos incompatíveis (evita useEffect em [role] que conflita com sync de `editando`). */
  const handleRoleChange = (next: Role) => {
    if (next === role) return;
    setRole(next);
    setScopeInfluencers([]);
    setScopeOperadoras([]);
    setScopePares([]);
    setScopeGestorTipos([]);
    setScopePrestadorTipos([]);
  };

  /** Novo usuário influencer: pré-preenche operadora a partir do Scout (parceria), alinhado ao criar-usuario na Edge. */
  useEffect(() => {
    if (editando?.id) return;
    if (!roleParidadeInfluencer(role)) return;
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const { data: row } = await supabase
          .from("scout_influencer")
          .select("operadora_slug")
          .ilike("email", em)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const slug = String(row?.operadora_slug ?? "").trim();
        if (!slug) return;
        const { data: op } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (!op?.slug) return;
        setScopeOperadoras((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
      })();
    }, 450);

    return () => clearTimeout(timer);
  }, [email, role, editando?.id]);

  useEffect(() => {
    if (role !== "agencia") return;
    const scopes = editando?.scopes ?? [];
    const agenciaPars = scopes.filter((s: { scope_type: string }) => s.scope_type === "agencia_par");
    if (agenciaPars.length > 0) {
      setParesAgencia(
        agenciaPars.map((s: { scope_ref: string }) => {
          const [inf, op] = (s.scope_ref || "").split(":");
          return { influencerId: inf ?? "", operadoraSlug: op ?? "" };
        })
      );
    } else {
      setParesAgencia([{ influencerId: "", operadoraSlug: "" }]);
    }
  }, [role, editando?.id, editando?.scopes]);

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) =>
    setList((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));

  const selectOperadoraUnica = (slug: string) =>
    setScopeOperadoras((prev) => (prev.includes(slug) ? prev : [slug]));

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!editando && !email.trim()) {
      setErro("E-mail é obrigatório.");
      return;
    }
    if (roleParidadeInfluencer(role) && scopeOperadoras.length === 0) {
      setErro("Selecione pelo menos uma operadora para o perfil.");
      return;
    }
    if (role === "operador" && scopeOperadoras.length === 0) {
      setErro("Selecione uma operadora para o operador.");
      return;
    }
    if (role === "operador" && scopeOperadoras.length > 1) {
      setErro("O perfil Operador permite apenas uma operadora.");
      return;
    }
    if (role === "gestor" && scopeGestorTipos.length === 0) {
      setErro("Selecione pelo menos um tipo de gestor.");
      return;
    }
    if (role === "prestador" && scopePrestadorTipos.length === 0) {
      setErro("Selecione pelo menos uma área de atuação.");
      return;
    }
    const paresValidos = role === "agencia" ? paresAgencia.filter((p) => p.influencerId && p.operadoraSlug) : [];
    if (role === "agencia" && paresValidos.length === 0) {
      setErro("Adicione pelo menos um par influencer + operadora.");
      return;
    }
    setSalvando(true);
    try {
      let uid = editando?.id ?? "";
      const scopeParesParaApi =
        role === "agencia"
          ? paresAgencia.filter((p) => p.influencerId && p.operadoraSlug).map((p) => `${p.influencerId}:${p.operadoraSlug}`)
          : scopePares;
      const scopeInfluencersArrRaw = Array.isArray(scopeInfluencers) ? scopeInfluencers : [];
      const scopeInfluencersArr =
        role === "gestor" || role === "executivo" || role === "investidor" ? [] : scopeInfluencersArrRaw;
      const scopeOperadorasArr =
        role === "operador"
          ? (Array.isArray(scopeOperadoras) ? scopeOperadoras : []).slice(0, 1)
          : role === "gestor" || role === "executivo" || role === "investidor"
            ? []
            : ROLES_STAFF_APENAS_PERMISSOES.includes(role)
              ? []
              : Array.isArray(scopeOperadoras)
                ? scopeOperadoras
                : [];
      const scopeGestorTiposArr = role === "gestor" ? (Array.isArray(scopeGestorTipos) ? scopeGestorTipos : []) : [];
      const scopePrestadorTiposArr =
        role === "prestador" ? (Array.isArray(scopePrestadorTipos) ? scopePrestadorTipos : []) : [];

      if (editando) {
        await callSupabaseEdgeFunction("atualizar-perfil", {
          userId: uid,
          name: nome.trim(),
          role,
          emprestadoPara: null,
          scopeInfluencers: scopeInfluencersArr,
          scopeOperadoras: scopeOperadorasArr,
          scopePares: scopeParesParaApi,
          scopeGestorTipos: scopeGestorTiposArr,
          scopePrestadorTipos: scopePrestadorTiposArr,
        });
      } else {
        const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
        const fnData = await callSupabaseEdgeFunction<{ userId?: string }>("criar-usuario", {
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          role,
          emprestadoPara: null,
          scopeInfluencers: scopeInfluencersArr,
          scopeOperadoras: scopeOperadorasArr,
          scopePares: scopeParesParaApi,
          scopeGestorTipos: role === "gestor" ? scopeGestorTiposArr : [],
          scopePrestadorTipos: role === "prestador" ? scopePrestadorTiposArr : [],
          loginUrl,
        });
        uid = fnData.userId ?? "";
        if (!uid) throw new Error("Usuário criado mas ID não retornado");
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      console.error("[GestaoUsuarios] salvar usuário:", e);
      if (isAbortError(e)) {
        setErro(
          "Tempo esgotado ou rede indisponível. Confira se as funções criar-usuario e atualizar-perfil estão deployadas no Supabase (CLI: supabase functions deploy)."
        );
      } else {
        setErro("Não foi possível salvar o usuário. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.18s",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const field: React.CSSProperties = { marginBottom: 18 };

  const addParAgencia = () => setParesAgencia((prev) => [...prev, { influencerId: "", operadoraSlug: "" }]);
  const removeParAgencia = (idx: number) =>
    setParesAgencia((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ influencerId: "", operadoraSlug: "" }]));
  const updateParAgencia = (idx: number, f: "influencerId" | "operadoraSlug", val: string) =>
    setParesAgencia((prev) => prev.map((p, i) => (i === idx ? { ...p, [f]: val } : p)));

  const tituloModal = editando ? "Editar Usuário" : "Novo Usuário";
  const salvarBg = ctaGradientSalvar(brand, salvando, BRAND.cinza);

  return (
    <ModalBase onClose={onClose} maxWidth={560} zIndex={999}>
      <ModalHeader title={tituloModal} onClose={onClose} />
        <div style={field}>
          <label style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input
            style={inputStyle}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            onFocus={onInputFocusBrand}
            onBlur={(e) => onInputBlurBrand(e, t.cardBorder)}
          />
        </div>
        {!editando && (
          <div style={field}>
            <label style={labelStyle}>
              E-mail
              <CampoObrigatorioMark />
            </label>
            <input
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              onFocus={onInputFocusBrand}
              onBlur={(e) => onInputBlurBrand(e, t.cardBorder)}
            />
          </div>
        )}
        <div style={field}>
          <label style={labelStyle}>Perfil</label>
          <select style={selectStyle} value={role} onChange={(e) => handleRoleChange(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {role === "admin" || ROLES_STAFF_APENAS_PERMISSOES.includes(role) ? (
          <div style={field}>
            <label style={labelStyle}>Escopo de acesso</label>
            <div
              style={{
                background: t.inputBg ?? t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: FONT.body,
                fontSize: 14,
                color: t.textMuted,
                fontStyle: "italic",
              }}
            >
              {role === "admin"
                ? "Todos os influencers e operadoras"
                : "Todos os influencers e todas as operadoras — permissões apenas pela aba Permissões (sem escopo por operadora)."}
            </div>
          </div>
        ) : role === "executivo" || role === "investidor" ? null : role === "gestor" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MultiSelect
              t={t}
              field={field}
              labelStyle={labelStyle}
              label="Tipos de gestor"
              obrigatorio
              cor={roleBadgeColor("gestor")}
              items={GESTOR_TIPOS.map((g) => ({ value: g.slug, label: g.label }))}
              selected={scopeGestorTipos}
              onToggle={(v) => toggleItem(scopeGestorTipos, setScopeGestorTipos, v)}
            />
          </div>
        ) : role === "prestador" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MultiSelect
              t={t}
              field={field}
              labelStyle={labelStyle}
              label="Áreas de atuação"
              obrigatorio
              cor={roleBadgeColor("prestador")}
              items={PRESTADOR_TIPOS.map((g) => ({ value: g.slug, label: g.label }))}
              selected={scopePrestadorTipos}
              onToggle={(v) => toggleItem(scopePrestadorTipos, setScopePrestadorTipos, v)}
            />
            <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              O acesso efetivo combina a aba <strong style={{ color: t.text }}>Permissões</strong> (perfil Prestadores) com
              a aba <strong style={{ color: t.text }}>Prestadores</strong>: só entram no menu as páginas permitidas para
              as áreas selecionadas e que também estejam autorizadas nas permissões. Utilizadores com várias áreas veem a
              união das páginas das respectivas colunas na aba Prestadores.
            </p>
          </div>
        ) : role === "agencia" ? (
          <ParesAgenciaUI
            pares={paresAgencia}
            onAdd={addParAgencia}
            onRemove={removeParAgencia}
            onUpdate={updateParAgencia}
            influencers={influencers}
            operadoras={operadoras}
            labelStyle={labelStyle}
            selectStyle={selectStyle}
            field={field}
          />
        ) : roleParidadeInfluencer(role) ? (
          <MultiSelect
            t={t}
            field={field}
            labelStyle={labelStyle}
            label="Operadoras atribuídas"
            obrigatorio
            cor={roleBadgeColor(role)}
            items={operadoras.map((o) => ({ value: o.slug, label: o.nome }))}
            selected={scopeOperadoras}
            onToggle={(v) => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
          />
        ) : (
          <>
            {role !== "operador" && !ROLES_STAFF_APENAS_PERMISSOES.includes(role) && (
              <MultiSelect
                t={t}
                field={field}
                labelStyle={labelStyle}
                label="Influencers (opcional)"
                cor={roleBadgeColor("operador")}
                items={influencers.map((i) => ({ value: i.id, label: i.nome }))}
                selected={scopeInfluencers}
                onToggle={(v) => toggleItem(scopeInfluencers, setScopeInfluencers, v)}
              />
            )}
            {role === "operador" ? (
              <SingleSelectOperadora
                t={t}
                field={field}
                labelStyle={labelStyle}
                label="Operadora atribuída"
                obrigatorio
                cor={roleBadgeColor("operador")}
                items={operadoras.map((o) => ({ value: o.slug, label: o.nome }))}
                selected={scopeOperadoras}
                onSelect={selectOperadoraUnica}
              />
            ) : (
              <MultiSelect
                t={t}
                field={field}
                labelStyle={labelStyle}
                label="Operadoras (opcional)"
                cor={roleBadgeColor("executivo")}
                items={operadoras.map((o) => ({ value: o.slug, label: o.nome }))}
                selected={scopeOperadoras}
                onToggle={(v) => toggleItem(scopeOperadoras, setScopeOperadoras, v)}
              />
            )}
          </>
        )}
        {erro && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              background: `${BRAND.vermelho}18`,
              border: `1px solid ${BRAND.vermelho}44`,
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={14} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <span
              style={{
                color: BRAND.vermelho,
                fontFamily: FONT.body,
                fontSize: 13,
                lineHeight: 1.45,
                whiteSpace: "pre-line",
                wordBreak: "break-word",
              }}
            >
              {erro}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding: "9px 18px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              color: t.text,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            style={{
              background: salvarBg,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              opacity: salvando ? 0.7 : 1,
              transition: "opacity 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SalvarCtaContent
              salvando={salvando}
              label={editando ? "Salvar alterações" : "Criar usuário"}
            />
          </button>
        </div>
    </ModalBase>
  );
}
