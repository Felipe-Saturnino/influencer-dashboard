import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { FONT } from "../../../constants/theme";
import { BRAND, PAGES, PRESTADOR_TIPOS, secoesMenuFromPages } from "./constants";
import { Checkbox } from "./Checkbox";
import { GestaoUsuariosLoading, SalvarCtaContent } from "./gestaoUsuariosUi";
import {
  brandTintBg,
  ctaGradientSalvar,
  getEscopoSecaoHeaderStyle,
  MSG_ERRO_CARREGAR_GESTAO,
  MSG_ERRO_SALVAR_GESTAO,
  MSG_ERRO_SALVAR_RECARREGAR,
  sincronizarLinhasTabela,
} from "./gestaoUsuariosHelpers";
import { getDataTableWrapStyle } from "../../../lib/dataTableStyles";

type PrestadorPageRow = { prestador_tipo_slug: string; page_key: string };

export function AbaPrestadores() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [prestadorTipoPages, setPrestadorTipoPages] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroCarregar(null);
    try {
      const rows = await fetchAllPages<PrestadorPageRow>(async (from, to) => {
        const { data, error } = await supabase
          .from("prestador_tipo_pages")
          .select("prestador_tipo_slug, page_key")
          .range(from, to);
        return { data, error };
      });
      const mapa: Record<string, Set<string>> = {};
      PRESTADOR_TIPOS.forEach((pt) => {
        mapa[pt.slug] = new Set();
      });
      rows.forEach((r) => {
        if (!mapa[r.prestador_tipo_slug]) mapa[r.prestador_tipo_slug] = new Set();
        mapa[r.prestador_tipo_slug].add(r.page_key);
      });
      setPrestadorTipoPages(mapa);
    } catch (err) {
      console.error("[GestaoUsuarios] carregar Escopos Prestadores:", err);
      setErroCarregar(MSG_ERRO_CARREGAR_GESTAO);
      setPrestadorTipoPages({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const togglePage = (tipoSlug: string, pageKey: string) => {
    setPrestadorTipoPages((prev) => {
      const next = { ...prev };
      if (!next[tipoSlug]) next[tipoSlug] = new Set();
      const set = new Set(next[tipoSlug]);
      if (set.has(pageKey)) set.delete(pageKey);
      else set.add(pageKey);
      next[tipoSlug] = set;
      return next;
    });
  };

  const isPageChecked = (slug: string, key: string) => prestadorTipoPages[slug]?.has(key) ?? false;

  const salvar = async () => {
    setSalvando(true);
    setSalvoOk(false);
    setErroSalvar(null);

    const slugsTipos = PRESTADOR_TIPOS.map((p) => p.slug);
    const desired: PrestadorPageRow[] = slugsTipos.flatMap((slug) =>
      [...(prestadorTipoPages[slug] ?? [])].map((page_key) => ({
        prestador_tipo_slug: slug,
        page_key,
      })),
    );

    try {
      const existing = await fetchAllPages<PrestadorPageRow>(async (from, to) => {
        const { data, error } = await supabase
          .from("prestador_tipo_pages")
          .select("prestador_tipo_slug, page_key")
          .in("prestador_tipo_slug", slugsTipos)
          .range(from, to);
        return { data, error };
      });

      const result = await sincronizarLinhasTabela({
        table: "prestador_tipo_pages",
        existing,
        desired,
        keyOf: (r) => `${r.prestador_tipo_slug}::${r.page_key}`,
        deleteEq: (r) =>
          supabase
            .from("prestador_tipo_pages")
            .delete()
            .eq("prestador_tipo_slug", r.prestador_tipo_slug)
            .eq("page_key", r.page_key),
      });

      if (result === "insert") {
        setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
        setSalvando(false);
        return;
      }
      if (result === "delete") {
        setErroSalvar(MSG_ERRO_SALVAR_RECARREGAR);
        setSalvando(false);
        return;
      }

      setSalvoOk(true);
      setTimeout(() => setSalvoOk(false), 2500);
    } catch (err) {
      console.error("[GestaoUsuarios] salvar Escopos Prestadores:", err);
      setErroSalvar(MSG_ERRO_SALVAR_GESTAO);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return <GestaoUsuariosLoading />;
  }

  if (erroCarregar) {
    return (
      <div role="alert" style={{ padding: 24, color: "#e84025", fontFamily: FONT.body, textAlign: "center" }}>
        {erroCarregar}
      </div>
    );
  }

  const pagesDaTipo = PAGES;
  const secoes = secoesMenuFromPages(pagesDaTipo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, margin: 0 }}>
        Para cada <strong style={{ color: t.text }}>área de atuação</strong>, marque em que páginas esse perfil pode entrar
        no menu. O resultado efetivo para cada usuário prestador é a{" "}
        <strong style={{ color: t.text }}>interseção</strong> entre estas marcações e a matriz da aba{" "}
        <strong style={{ color: t.text }}>Permissões</strong> (Ver / Criar / Editar / Excluir no perfil Prestadores).
        Quem tem várias áreas recebe a <strong>união</strong> das páginas permitidas por área, sempre cortada pelas
        permissões. <strong style={{ color: t.text }}>Home</strong>, <strong style={{ color: t.text }}>Configurações</strong>,{" "}
        <strong style={{ color: t.text }}>Ajuda</strong> e <strong style={{ color: t.text }}>Versionamento</strong> seguem
        só a aba Permissões. Alterações de menu podem exigir novo login.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {PRESTADOR_TIPOS.map((pt) => (
          <div
            key={pt.slug}
            style={{
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              borderLeft: `4px solid ${BRAND.ciano}`,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: brandTintBg("12", BRAND.ciano),
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize: 14,
                color: t.text,
              }}
            >
              {pt.label}
            </div>

            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <div
                className="operadora-secoes-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${secoes.length}, 1fr)`,
                  minWidth: `max(100%, ${secoes.length * 148}px)`,
                }}
              >
                {(() => {
                  const secoesComPaginas = secoes.filter((s) => pagesDaTipo.some((p) => p.secao === s));
                  return secoes.map((secao) => {
                    const pagesDaSec = pagesDaTipo.filter((p) => p.secao === secao);
                    if (pagesDaSec.length === 0) return null;

                    const isUltima = secao === secoesComPaginas[secoesComPaginas.length - 1];

                    return (
                      <div
                        key={secao}
                        style={{
                          borderRight: !isUltima ? `1px solid ${t.cardBorder}` : undefined,
                        }}
                      >
                        <div
                          style={getEscopoSecaoHeaderStyle(
                            brandTintBg("8", BRAND.ciano),
                            t.cardBorder,
                            t.textMuted,
                          )}
                        >
                          {secao}
                        </div>
                        <div style={{ padding: "8px 14px 6px" }}>
                          {pagesDaSec.map((p, idx) => (
                            <label
                              key={p.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                                fontSize: 13,
                                color: t.text,
                                padding: "7px 4px",
                                borderBottom:
                                  idx < pagesDaSec.length - 1 ? `1px solid ${t.cardBorder}` : "none",
                              }}
                            >
                              <Checkbox
                                checked={isPageChecked(pt.slug, p.key)}
                                onChange={() => togglePage(pt.slug, p.key)}
                                label={`${p.label} — ${pt.label}`}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        {erroSalvar && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(232,64,37,0.12)",
              border: "1px solid rgba(232,64,37,0.35)",
              color: "#e84025",
              fontSize: 13,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} color="#e84025" aria-hidden />
            {erroSalvar}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
          }}
        >
          {salvoOk && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: BRAND.verde,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            >
              <ShieldCheck size={14} /> Páginas salvas com sucesso
            </span>
          )}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            style={{
              background: ctaGradientSalvar(brand, salvando, BRAND.cinza),
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              opacity: salvando ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SalvarCtaContent salvando={salvando} label="Salvar páginas" />
          </button>
        </div>
      </div>
    </div>
  );
}
