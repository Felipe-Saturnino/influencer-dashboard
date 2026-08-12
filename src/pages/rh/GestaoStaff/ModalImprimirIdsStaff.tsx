import { useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { getCtaCriarButtonStyle } from "../../../lib/ctaCriarStyles";
import { baixarImprimirIdsStaffPdf } from "../../../lib/gestaoStaffImprimirIdsPdf";
import { isGamePresenterTimeNome } from "../../../lib/rhGamePresenterDealerSync";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { FONT } from "../../../constants/theme";
import type { RhFuncionario } from "../../../types/rhFuncionario";

type TimeRef = { id: string; nome: string };

const ERRO_GERAR =
  "Não foi possível gerar o PDF. Se o problema persistir, entre em contato com o suporte.";

export function ModalImprimirIdsStaff({
  open,
  onClose,
  prestadores,
  times,
}: {
  open: boolean;
  onClose: () => void;
  prestadores: RhFuncionario[];
  times: TimeRef[];
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gps = useMemo(() => {
    const timeNomePorId = new Map(times.map((x) => [x.id, x.nome]));
    return prestadores
      .filter((p) => {
        if (p.status !== "ativo" && p.status !== "indisponivel") return false;
        const tn = p.org_time_id ? timeNomePorId.get(p.org_time_id) : null;
        return isGamePresenterTimeNome(tn);
      })
      .slice()
      .sort((a, b) => {
        const na = (a.staff_nickname ?? a.nome ?? "").localeCompare(b.staff_nickname ?? b.nome ?? "", "pt-BR");
        return na;
      });
  }, [prestadores, times]);

  const gpsFiltrados = useMemo(() => {
    if (!busca.trim()) return gps;
    return gps.filter((p) => textoContemBuscaEmAlgum(busca, p.nome, p.staff_nickname, p.staff_barcode));
  }, [gps, busca]);

  const comBarcode = useMemo(
    () => gpsFiltrados.filter((p) => Boolean((p.staff_barcode ?? "").trim())),
    [gpsFiltrados],
  );
  const semBarcodeCount = gpsFiltrados.length - comBarcode.length;

  if (!open) return null;

  const toggle = (id: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selecionarTodosComBarcode = () => {
    setSelecionados(new Set(comBarcode.map((p) => p.id)));
  };

  const limparSelecao = () => setSelecionados(new Set());

  const gerar = async () => {
    setErro(null);
    const escolhidos = gps.filter((p) => selecionados.has(p.id));
    const comCodigo = escolhidos
      .map((p) => ({
        barcode: (p.staff_barcode ?? "").trim(),
        nickname: (p.staff_nickname ?? "").trim() || (p.nome ?? "").trim() || "—",
      }))
      .filter((x) => x.barcode);
    if (comCodigo.length === 0) {
      setErro("Selecione ao menos um Game Presenter com barcode cadastrado.");
      return;
    }
    setGerando(true);
    try {
      await baixarImprimirIdsStaffPdf(comCodigo);
      onClose();
    } catch (e) {
      console.error("[ModalImprimirIdsStaff] gerar PDF:", e);
      setErro(ERRO_GERAR);
    } finally {
      setGerando(false);
    }
  };

  const checkStyle = {
    width: 16,
    height: 16,
    accentColor: "var(--brand-primary, #7c3aed)",
    cursor: "pointer" as const,
  };

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1100}>
      <ModalHeader title="Imprimir IDs" onClose={onClose} />

      <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.45 }}>
        Selecione os Game Presenters. Será gerado um único PDF com etiquetas de 8×6 cm (código de barras, número e
        nickname) para impressão.
      </p>

      <BarraPesquisaPagina
        value={busca}
        onChange={setBusca}
        placeholder="Pesquisar por nickname, nome ou barcode..."
        aria-label="Pesquisar Game Presenters"
        wrapperStyle={{ width: "100%", marginBottom: 12 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={selecionarTodosComBarcode}
          disabled={comBarcode.length === 0}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: comBarcode.length === 0 ? "not-allowed" : "pointer",
            opacity: comBarcode.length === 0 ? 0.5 : 1,
          }}
        >
          Selecionar todos com barcode
        </button>
        <button
          type="button"
          onClick={limparSelecao}
          disabled={selecionados.size === 0}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: selecionados.size === 0 ? "not-allowed" : "pointer",
            opacity: selecionados.size === 0 ? 0.5 : 1,
          }}
        >
          Limpar seleção
        </button>
      </div>

      {semBarcodeCount > 0 ? (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#f59e0b", fontFamily: FONT.body }}>
          {semBarcodeCount} GP(s) sem barcode cadastrado — não entram na impressão.
        </p>
      ) : null}

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginBottom: 10 }}>
          {erro}
        </div>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          maxHeight: "min(48dvh, 360px)",
          overflowY: "auto",
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
        }}
      >
        {gpsFiltrados.length === 0 ? (
          <li style={{ padding: 20, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum Game Presenter encontrado.
          </li>
        ) : (
          gpsFiltrados.map((p) => {
            const barcode = (p.staff_barcode ?? "").trim();
            const semCodigo = !barcode;
            const nick = (p.staff_nickname ?? "").trim() || "—";
            const checked = selecionados.has(p.id);
            return (
              <li
                key={p.id}
                style={{
                  borderBottom: `1px solid ${t.cardBorder}`,
                  opacity: semCodigo ? 0.55 : 1,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    cursor: semCodigo ? "not-allowed" : "pointer",
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={semCodigo || gerando}
                    onChange={() => toggle(p.id)}
                    style={checkStyle}
                    aria-label={`Selecionar ${nick}`}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, color: t.text }}>{nick}</span>
                    <span style={{ display: "block", fontSize: 12, color: t.textMuted }}>
                      {p.nome}
                      {semCodigo ? " · Sem barcode" : ` · ${barcode}`}
                    </span>
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={gerando}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: gerando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void gerar()}
          disabled={gerando || selecionados.size === 0}
          style={{
            ...getCtaCriarButtonStyle(brand),
            opacity: gerando || selecionados.size === 0 ? 0.55 : 1,
            cursor: gerando || selecionados.size === 0 ? "not-allowed" : "pointer",
            color: "#fff",
          }}
        >
          {gerando ? <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden /> : <Printer size={14} aria-hidden />}
          {gerando ? "Gerando…" : "Gerar PDF"}
        </button>
      </div>
    </ModalBase>
  );
}
