import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { type RhFigurinoPeca, type RhWithdrawalType } from "./types"
import { ctaButtonContent, fmtDataHora } from "./figurinosPageHelpers"
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico"
import type { PrestadorRetiradaRow } from "./figurinosModalShared"
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina"
import { FILTER_SEARCH_STAFF } from "../../../lib/searchBarConstants"
import { textoContemBuscaEmAlgum } from "../../../lib/searchText"

export function ModalRetirada({
  peca,
  resumoEstudios,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoEstudios: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [prestadores, setPrestadores] = useState<PrestadorRetiradaRow[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroCargaPrestadores, setErroCargaPrestadores] = useState<string | null>(null);
  const [buscaPrestador, setBuscaPrestador] = useState("");
  const [prestadorSelecionadoId, setPrestadorSelecionadoId] = useState<string | null>(null);
  const [tipoRetirada, setTipoRetirada] = useState<RhWithdrawalType>("emprestar");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoadingPrestadores(true);
      setErroCargaPrestadores(null);
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("id, nome, setor, status")
        .in("status", ["ativo", "indisponivel"])
        .order("nome", { ascending: true })
        .limit(5000);
      if (cancelado) return;
      if (error) {
        console.error("[Figurinos] Erro ao carregar prestadores:", error);
        setErroCargaPrestadores("Não foi possível carregar a lista de prestadores. Tente novamente ou entre em contato com o suporte.");
        setPrestadores([]);
      } else {
        setPrestadores((data ?? []) as PrestadorRetiradaRow[]);
      }
      setLoadingPrestadores(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => buscaRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  const prestadorSelecionado = useMemo(
    () => (prestadorSelecionadoId ? prestadores.find((p) => p.id === prestadorSelecionadoId) : undefined),
    [prestadores, prestadorSelecionadoId],
  );

  const prestadoresFiltrados = useMemo(() => {
    const q = buscaPrestador.trim();
    if (!q) return prestadores;
    return prestadores.filter((p) => textoContemBuscaEmAlgum(q, p.nome, p.setor));
  }, [prestadores, buscaPrestador]);

  const confirmar = async () => {
    setErr(null);
    const row = prestadorSelecionado;
    if (!row?.id || !(row.nome ?? "").trim()) {
      setErr("Selecione um prestador na lista (cadastro da Gestão de Prestadores).");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_emprestimo", {
      p_item_id: peca.id,
      p_borrower_name: row.nome.trim(),
      p_borrower_ref: row.id,
      p_withdrawal_type: tipoRetirada,
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao registrar retirada:", error);
      setErr("Não foi possível registrar a retirada. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    await onOk();
  };

  const confirmarDesabilitado =
    loading ||
    loadingPrestadores ||
    !prestadorSelecionadoId ||
    !!erroCargaPrestadores ||
    prestadores.length === 0;

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Retirada" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} estudiosTexto={resumoEstudios} t={t} />
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span>
            Prestador <span style={{ color: "#e84025" }}>*</span>
          </span>
          {loadingPrestadores ? <Loader2 size={14} className="app-lucide-spin" style={{ color: t.textMuted }} aria-hidden /> : null}
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.45, opacity: 0.92 }}>
          Mesma base da página Gestão de Prestadores (ativos e indisponíveis). Pesquise por nome ou setor e escolha na lista.
        </p>
        {erroCargaPrestadores ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 8 }}>
            {erroCargaPrestadores}
          </div>
        ) : null}
        {!loadingPrestadores && !erroCargaPrestadores && prestadores.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
            Sem prestadores ativos ou indisponíveis cadastrados na Gestão de Prestadores.
          </div>
        ) : null}
        {prestadorSelecionado ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{prestadorSelecionado.nome}</div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              {(prestadorSelecionado.setor ?? "").trim() || "—"}
              {" · "}
              {prestadorSelecionado.status === "indisponivel" ? "Indisponível" : "Ativo"}
            </div>
            <button
              type="button"
              onClick={() => {
                setPrestadorSelecionadoId(null);
                setBuscaPrestador("");
                window.setTimeout(() => buscaRef.current?.focus(), 50);
              }}
              style={{
                alignSelf: "flex-start",
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${t.cardBorder}`,
                background: "transparent",
                color: t.text,
                fontSize: 12,
                fontFamily: FONT.body,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Trocar prestador
            </button>
          </div>
        ) : (
          <>
            <BarraPesquisaPagina
              inputRef={buscaRef}
              value={buscaPrestador}
              onChange={setBuscaPrestador}
              disabled={loadingPrestadores || !!erroCargaPrestadores || prestadores.length === 0}
              placeholder={FILTER_SEARCH_STAFF}
              aria-label="Filtrar prestadores por nome ou setor"
              wrapperStyle={{ width: "100%", marginBottom: 8 }}
            />
            <div
              role="listbox"
              aria-label="Prestadores da Gestão de Prestadores"
              style={{
                maxHeight: 200,
                overflowY: "auto",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
              }}
            >
              {prestadoresFiltrados.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Nenhum resultado para a pesquisa.
                </div>
              ) : (
                prestadoresFiltrados.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={prestadorSelecionadoId === p.id}
                    onClick={() => {
                      setPrestadorSelecionadoId(p.id);
                      setBuscaPrestador("");
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom:
                        i === prestadoresFiltrados.length - 1 ? "none" : `1px solid ${t.cardBorder}`,
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: FONT.body,
                    }}
                  >
                    <span style={{ display: "block", color: t.text, fontSize: 13, fontWeight: 600 }}>{p.nome}</span>
                    <span style={{ display: "block", color: t.textMuted, fontSize: 11, marginTop: 2 }}>
                      {(p.setor ?? "").trim() || "—"}
                      {p.status === "indisponivel" ? " · Indisponível" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Tipo de retirada *
        <select
          value={tipoRetirada}
          onChange={(e) => setTipoRetirada(e.target.value as RhWithdrawalType)}
          aria-label="Tipo de retirada"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        >
          <option value="emprestar">Emprestada</option>
          <option value="fixo">Fixo</option>
        </select>
      </label>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora do registro: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={confirmarDesabilitado}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: confirmarDesabilitado ? "not-allowed" : "pointer",
            opacity: confirmarDesabilitado ? 0.55 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar Retirada", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}
