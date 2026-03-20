import { useState, useEffect, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import type { Operadora } from "../../../types";
import type { Theme } from "../../../constants/theme";
import { BRAND, PAGES } from "./constants";
import { Checkbox } from "./Checkbox";

interface AbaOperadoraProps {
  t: Theme;
}

export function AbaOperadora({ t }: AbaOperadoraProps) {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [operadoraPages, setOperadoraPages] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoOk, setSalvoOk] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: ops }, { data: opPages }] = await Promise.all([
      supabase.from("operadoras").select("*").order("nome"),
      supabase.from("operadora_pages").select("operadora_slug, page_key"),
    ]);
    setOperadoras(ops ?? []);
    const mapa: Record<string, Set<string>> = {};
    (opPages ?? []).forEach((r) => {
      if (!mapa[r.operadora_slug]) mapa[r.operadora_slug] = new Set();
      mapa[r.operadora_slug].add(r.page_key);
    });
    setOperadoraPages(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const togglePage = (operadoraSlug: string, pageKey: string) => {
    setOperadoraPages((prev) => {
      const next = { ...prev };
      if (!next[operadoraSlug]) next[operadoraSlug] = new Set();
      const set = new Set(next[operadoraSlug]);
      if (set.has(pageKey)) set.delete(pageKey);
      else set.add(pageKey);
      next[operadoraSlug] = set;
      return next;
    });
  };

  const isPageChecked = (slug: string, key: string) => operadoraPages[slug]?.has(key) ?? false;

  const salvar = async () => {
    setSalvando(true);
    setSalvoOk(false);
    for (const slug of operadoras.map((o) => o.slug)) {
      const { error: delErr } = await supabase.from("operadora_pages").delete().eq("operadora_slug", slug);
      if (delErr) {
        setSalvando(false);
        alert(`Erro ao salvar: ${delErr.message}`);
        return;
      }
      const keys = operadoraPages[slug];
      if (keys?.size) {
        const { error: insErr } = await supabase
          .from("operadora_pages")
          .insert([...keys].map((pageKey) => ({ operadora_slug: slug, page_key: pageKey })));
        if (insErr) {
          setSalvando(false);
          alert(`Erro ao salvar: ${insErr.message}`);
          return;
        }
      }
    }
    setSalvando(false);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 2500);
  };

  if (loading) {
    return <div style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body }}>Carregando...</div>;
  }

  if (operadoras.length === 0) {
    return (
      <div style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>
        Nenhuma operadora cadastrada. Cadastre operadoras em Gestão de Operadoras.
      </div>
    );
  }

  const ordemSecoes = ["Dashboards", "Lives", "Operações", "Plataforma", "Geral"];
  const pagesDaOp = PAGES.filter((p) => p.key !== "gestao_usuarios");
  const secoes = [...new Set(pagesDaOp.map((p) => p.secao))].sort(
    (a, b) => ordemSecoes.indexOf(a) - ordemSecoes.indexOf(b) || a.localeCompare(b, "pt-BR")
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, margin: 0 }}>
        Marque as páginas que operadores de cada operadora podem acessar. Todos os operadores com escopo na mesma
        operadora veem o mesmo menu. As ações (criar/editar/excluir) vêm da aba Permissões.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {operadoras.map((op) => (
          <div
            key={op.slug}
            style={{
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              borderLeft: `4px solid ${BRAND.roxoVivo}`,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(74,32,130,0.12)",
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize: 14,
                color: t.text,
              }}
            >
              {op.nome ?? op.slug}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 0,
                padding: 0,
              }}
            >
              {secoes.map((secao, secaoIdx) => {
                const pagesDaSec = pagesDaOp.filter((p) => p.secao === secao).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
                if (pagesDaSec.length === 0) return null;
                return (
                  <div
                    key={secao}
                    style={{
                      borderRight: secaoIdx < secoes.length - 1 ? `1px solid ${t.cardBorder}` : undefined,
                      borderBottom: `1px solid ${t.cardBorder}`,
                      padding: 0,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "rgba(74,32,130,0.08)",
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
                    <div style={{ padding: "8px 12px" }}>
                      {pagesDaSec.map((p, idx) => (
                        <label
                          key={p.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontFamily: FONT.body,
                            fontSize: 13,
                            color: t.text,
                            padding: "6px 4px",
                            borderBottom: idx < pagesDaSec.length - 1 ? `1px solid ${t.cardBorder}` : "none",
                          }}
                        >
                          <Checkbox checked={isPageChecked(op.slug, p.key)} onChange={() => togglePage(op.slug, p.key)} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {salvoOk && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: BRAND.verde, fontFamily: FONT.body, fontSize: 13 }}>
            <ShieldCheck size={14} /> Páginas salvas com sucesso
          </span>
        )}
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            background: salvando ? BRAND.cinza : BRAND.gradiente,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            opacity: salvando ? 0.7 : 1,
          }}
        >
          {salvando ? "Salvando..." : "Salvar páginas"}
        </button>
      </div>
    </div>
  );
}
