import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { BRAND, PAGES, PRESTADOR_TIPOS, secoesMenuFromPages } from "./constants";
import { Checkbox } from "./Checkbox";
import { GestaoUsuariosLoading, SalvarCtaContent } from "./gestaoUsuariosUi";
import { brandTintBg, ctaGradientSalvar } from "./gestaoUsuariosHelpers";
import { getDataTableWrapStyle } from "../../../lib/dataTableStyles";

export function AbaPrestadores() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [prestadorTipoPages, setPrestadorTipoPages] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase.from("prestador_tipo_pages").select("prestador_tipo_slug, page_key");
    const mapa: Record<string, Set<string>> = {};
    PRESTADOR_TIPOS.forEach((pt) => {
      mapa[pt.slug] = new Set();
    });
    (rows ?? []).forEach((r: { prestador_tipo_slug: string; page_key: string }) => {
      if (!mapa[r.prestador_tipo_slug]) mapa[r.prestador_tipo_slug] = new Set();
      mapa[r.prestador_tipo_slug].add(r.page_key);
    });
    setPrestadorTipoPages(mapa);
    setLoading(false);
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
    const { error: delErr } = await supabase.from("prestador_tipo_pages").delete().in("prestador_tipo_slug", slugsTipos);
    if (delErr) {
      setSalvando(false);
      setErroSalvar("Erro ao salvar. Tente novamente.");
      return;
    }

    const toInsert = slugsTipos.flatMap((slug) =>
      [...(prestadorTipoPages[slug] ?? [])].map((pageKey) => ({
        prestador_tipo_slug: slug,
        page_key: pageKey,
      })),
    );

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("prestador_tipo_pages").insert(toInsert);
      if (insErr) {
        setSalvando(false);
        setErroSalvar("Erro ao salvar. Recarregue a página para verificar o estado atual.");
        return;
      }
    }

    setSalvando(false);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
  };

  if (loading) {
    return <GestaoUsuariosLoading />;
  }

  const pagesDaTipo = PAGES;
  const secoes = secoesMenuFromPages(pagesDaTipo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, margin: 0 }}>
        Para cada <strong style={{ color: t.text }}>área de atuação</strong>, marque em que páginas esse perfil pode entrar
        no menu. O resultado efetivo para cada utilizador prestador é a{" "}
        <strong style={{ color: t.text }}>interseção</strong> entre estas marcações e a matriz da aba{" "}
        <strong style={{ color: t.text }}>Permissões</strong> (Ver / Criar / Editar / Excluir no perfil Prestadores).
        Quem tem várias áreas recebe a <strong>união</strong> das páginas permitidas por área, sempre cortada pelas
        permissões. <strong style={{ color: t.text }}>Home</strong>, <strong style={{ color: t.text }}>Configurações</strong>{" "}
        e <strong style={{ color: t.text }}>Ajuda</strong> seguem só a aba Permissões. Alterações de menu podem exigir novo
        login.
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
                          style={{
                            padding: "10px 16px",
                            background: brandTintBg("8", BRAND.ciano),
                            borderBottom: `2px solid ${t.cardBorder}`,
                            fontFamily: FONT.body,
                            fontWeight: 700,
                            fontSize: 11,
                            color: t.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                          }}
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
