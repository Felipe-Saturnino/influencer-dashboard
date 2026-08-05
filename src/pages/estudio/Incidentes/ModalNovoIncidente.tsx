import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Paperclip, Shuffle, UserRound } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CampoUploadArquivos } from "../../../components/CampoUploadArquivos";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";
import { getFiltroBarTabButtonStyle } from "../../../lib/filterBarStyles";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import {
  fetchStaffFormIncidente,
  insertEstudioIncidente,
  uploadEstudioIncidenteAnexos,
} from "../../../lib/estudioIncidentesFetch";
import {
  ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES,
  INCIDENTE_CATEGORIA_OPTIONS,
  INCIDENTE_ID_RODADA_SEM_ID,
  INCIDENTE_RESOLUCAO_OPTIONS,
  type IncidenteCategoria,
  type IncidenteLocalMesa,
  type IncidenteResolucao,
  type IncidenteStaffOption,
  type IncidenteTimeAlvo,
} from "../../../lib/estudioIncidentesTypes";
import {
  compareNumeroMesaIncidente,
  hojeIsoDateLocal,
  labelPrestadorIncidente,
  normalizarHoraRodadaTexto,
  normalizarTipoJogoIncidente,
  tiposIncidenteParaForm,
} from "../../../lib/estudioIncidentesHelpers";

export type NovoIncidenteMesaOption = {
  id: string;
  label: string;
  numeroMesa: string | null;
  estudioSlug: string | null;
  tipoJogo: string;
};

const ERRO_GENERICO =
  "Não foi possível registrar o incidente. Se o problema persistir, entre em contato com o suporte.";

const ANEXO_HINT = "Vários arquivos · tamanho máximo por arquivo: 10 MB";

type AnexoPendente = { key: string; file: File };

type ComboOption = {
  id: string;
  label: string;
  /** Textos extras para busca (ex.: nickname). */
  buscaExtras?: string[];
};

function ComboBuscavel({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
  forceSearch,
  searchPlaceholder,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: string) => void;
  options: ComboOption[];
  disabled?: boolean;
  /** Exibe a barra de pesquisa mesmo com ≤5 opções. */
  forceSearch?: boolean;
  searchPlaceholder?: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selecionado = options.find((o) => o.id === value);
  const showSearch = forceSearch || options.length > 5;
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) =>
      textoContemBuscaEmAlgum(query, o.label, ...(o.buscaExtras ?? [])),
    );
  }, [options, query]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "9px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: disabled ? t.cardBg : (t.inputBg ?? t.cardBg),
          color: selecionado ? t.text : t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selecionado?.label ?? placeholder}
        </span>
        <ChevronDown size={13} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1200,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            maxHeight: 280,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {showSearch ? (
            <div style={{ marginBottom: 6 }}>
              <BarraPesquisaFiltroPainel
                value={query}
                onChange={setQuery}
                placeholder={searchPlaceholder ?? placeholderPesquisaFiltro(label)}
              />
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 12,
                color: t.textMuted,
                fontFamily: FONT.body,
                textAlign: "center",
              }}
            >
              Nenhum resultado.
            </div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                tabIndex={0}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(o.id);
                    setOpen(false);
                  }
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  color: o.id === value ? brand.primary : t.text,
                  fontWeight: o.id === value ? 700 : 400,
                  background:
                    o.id === value
                      ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                      : "transparent",
                }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          fontFamily: FONT.body,
          marginBottom: 6,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        {label}
        {required ? <CampoObrigatorioMark /> : null}
      </label>
      {children}
    </div>
  );
}

const inputBaseStyle = (t: { cardBorder: string; inputBg?: string; cardBg: string; text: string }) => ({
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${t.cardBorder}`,
  background: t.inputBg ?? t.cardBg,
  color: t.text,
  fontSize: 13,
  fontFamily: FONT.body,
  outline: "none",
  boxSizing: "border-box" as const,
});

const row2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const row3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

export function ModalNovoIncidente({
  mesas,
  onClose,
  onSaved,
}: {
  mesas: NovoIncidenteMesaOption[];
  onClose: () => void;
  onSaved: (protocolo: string) => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();

  const [timeAlvo, setTimeAlvo] = useState<IncidenteTimeAlvo>("gp");
  const [mesaId, setMesaId] = useState("");
  const [idRodada, setIdRodada] = useState("");
  const [semIdRodada, setSemIdRodada] = useState(false);
  const [dataRodada, setDataRodada] = useState(hojeIsoDateLocal());
  const [horaRodada, setHoraRodada] = useState("");
  const [prestadorId, setPrestadorId] = useState("");
  const [incidenteCategoria, setIncidenteCategoria] = useState<IncidenteCategoria>("caso");
  const [tipo, setTipo] = useState("");
  const [localMesa, setLocalMesa] = useState<IncidenteLocalMesa | "">("em_mesa");
  const [resolucao, setResolucao] = useState<IncidenteResolucao>(INCIDENTE_RESOLUCAO_OPTIONS[0]!);
  const [payoutNecessario, setPayoutNecessario] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<AnexoPendente[]>([]);

  const [staffOptions, setStaffOptions] = useState<IncidenteStaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoadingStaff(true);
      try {
        const rows = await fetchStaffFormIncidente(timeAlvo);
        if (!cancel) setStaffOptions(rows);
      } catch (e) {
        console.error("Incidentes: falha ao carregar staff do formulário", e);
        if (!cancel) setStaffOptions([]);
      } finally {
        if (!cancel) setLoadingStaff(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [timeAlvo]);

  useEffect(() => {
    setMesaId("");
    setTipo("");
    setPrestadorId("");
    setLocalMesa(timeAlvo === "shuf" ? "em_mesa" : "");
  }, [timeAlvo]);

  const mesasDisponiveis = useMemo(() => {
    const base =
      timeAlvo !== "shuf"
        ? [...mesas]
        : mesas.filter((m) => normalizarTipoJogoIncidente(m.tipoJogo) !== "roleta");
    return base.sort((a, b) => compareNumeroMesaIncidente(a.numeroMesa, b.numeroMesa));
  }, [mesas, timeAlvo]);

  const mesaSelecionada = mesasDisponiveis.find((m) => m.id === mesaId) ?? null;

  const tiposOptions = useMemo(
    () => tiposIncidenteParaForm(timeAlvo, mesaSelecionada?.tipoJogo ?? null),
    [timeAlvo, mesaSelecionada],
  );

  useEffect(() => {
    if (tipo && !tiposOptions.includes(tipo)) setTipo("");
  }, [tiposOptions, tipo]);

  const prestadorComboOptions = useMemo<ComboOption[]>(
    () =>
      staffOptions.map((s) => ({
        id: s.id,
        label: labelPrestadorIncidente(s.nome, s.nickname),
        buscaExtras: [s.nome, s.nickname ?? ""],
      })),
    [staffOptions],
  );

  function onAddAnexos(files: File[]) {
    const oversized = files.find((f) => f.size > ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES);
    if (oversized) {
      setErro(`O anexo «${oversized.name}» excede o tamanho máximo de 10 MB.`);
      return;
    }
    setErro(null);
    setAnexos((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
      })),
    ]);
  }

  function onRemoveAnexo(key: string) {
    setAnexos((prev) => prev.filter((a) => a.key !== key));
  }

  async function handleSalvar() {
    setErro(null);

    if (!mesaSelecionada) {
      setErro("Selecione a mesa do incidente.");
      return;
    }
    if (!semIdRodada && !idRodada.trim()) {
      setErro("Informe o ID da rodada ou marque «Não tem ID».");
      return;
    }
    if (!dataRodada) {
      setErro("Informe a data da rodada.");
      return;
    }
    const horaNorm = normalizarHoraRodadaTexto(horaRodada);
    if (!horaNorm) {
      setErro("Informe a hora da rodada no formato HH:MM.");
      return;
    }
    if (!prestadorId) {
      setErro("Selecione o prestador envolvido no incidente.");
      return;
    }
    if (!tipo) {
      setErro("Selecione o tipo do incidente.");
      return;
    }
    if (timeAlvo === "shuf" && !localMesa) {
      setErro("Selecione o local do shoe.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Descreva o incidente.");
      return;
    }
    for (const a of anexos) {
      if (a.file.size > ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES) {
        setErro(`O anexo «${a.file.name}» excede o tamanho máximo de 10 MB.`);
        return;
      }
    }

    const prestador = staffOptions.find((s) => s.id === prestadorId);
    if (!prestador) {
      setErro("Prestador inválido. Selecione novamente.");
      return;
    }

    const relatorNome = user?.name?.trim() || user?.email || "Usuário";
    const ocorridoEm = `${dataRodada}T${horaNorm}`;

    setSalvando(true);
    try {
      const { data, error } = await insertEstudioIncidente({
        ocorrido_em: new Date(ocorridoEm).toISOString(),
        time_alvo: timeAlvo,
        prestador_id: prestador.id,
        prestador_nome: prestador.nome,
        mesa_id: mesaSelecionada.id,
        mesa_label: mesaSelecionada.label,
        estudio_slug: mesaSelecionada.estudioSlug,
        jogo: mesaSelecionada.tipoJogo,
        incidente: incidenteCategoria,
        tipo,
        id_rodada: semIdRodada ? INCIDENTE_ID_RODADA_SEM_ID : idRodada.trim(),
        data_rodada: dataRodada,
        hora_rodada: horaNorm,
        local_mesa: timeAlvo === "gp" ? "em_mesa" : (localMesa as IncidenteLocalMesa),
        resolucao,
        payout_necessario: payoutNecessario,
        descricao: descricao.trim(),
        relator_user_id: user?.id ?? null,
        relator_nome: relatorNome,
        created_by: user?.id ?? null,
      });

      if (error || !data) {
        setErro(error ?? ERRO_GENERICO);
        setSalvando(false);
        return;
      }

      if (anexos.length > 0) {
        const up = await uploadEstudioIncidenteAnexos(
          data.id,
          anexos.map((a) => a.file),
        );
        if (!up.ok) {
          setErro(up.error ?? ERRO_GENERICO);
          setSalvando(false);
          return;
        }
      }

      onSaved(data.protocolo);
    } catch (e) {
      console.error("Incidentes: falha ao salvar", e);
      setErro(ERRO_GENERICO);
      setSalvando(false);
    }
  }

  const campoMesa = (
    <Campo label="Mesa" required>
      <ComboBuscavel
        id="novo-incidente-mesa"
        label="Mesa"
        placeholder="Selecione a mesa"
        value={mesaId}
        onChange={setMesaId}
        options={mesasDisponiveis.map((m) => ({ id: m.id, label: m.label }))}
      />
    </Campo>
  );

  const campoTipo = (
    <Campo label="Tipo" required>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        disabled={tiposOptions.length === 0}
        style={inputBaseStyle(t)}
      >
        <option value="">{tiposOptions.length === 0 ? "Selecione a mesa primeiro" : "Selecione o tipo"}</option>
        {tiposOptions.map((tp) => (
          <option key={tp} value={tp}>
            {tp}
          </option>
        ))}
      </select>
    </Campo>
  );

  const campoIncidente = (
    <Campo label="Incidente">
      <select
        value={incidenteCategoria}
        onChange={(e) => setIncidenteCategoria(e.target.value as IncidenteCategoria)}
        style={inputBaseStyle(t)}
      >
        {INCIDENTE_CATEGORIA_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Campo>
  );

  const campoResolucao = (
    <Campo label="Resolução">
      <select
        value={resolucao}
        onChange={(e) => setResolucao(e.target.value as IncidenteResolucao)}
        style={inputBaseStyle(t)}
      >
        {INCIDENTE_RESOLUCAO_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </Campo>
  );

  const campoPayout = (
    <Campo label="Payout necessário">
      <div role="group" aria-label="Payout necessário" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-pressed={payoutNecessario}
          onClick={() => setPayoutNecessario(true)}
          style={getFiltroBarTabButtonStyle(t, brand, payoutNecessario)}
        >
          Sim
        </button>
        <button
          type="button"
          aria-pressed={!payoutNecessario}
          onClick={() => setPayoutNecessario(false)}
          style={getFiltroBarTabButtonStyle(t, brand, !payoutNecessario)}
        >
          Não
        </button>
      </div>
    </Campo>
  );

  const campoLocalShoe = (
    <Campo label="Local do Shoe" required>
      <div role="group" aria-label="Local do Shoe" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-pressed={localMesa === "em_mesa"}
          onClick={() => setLocalMesa("em_mesa")}
          style={getFiltroBarTabButtonStyle(t, brand, localMesa === "em_mesa")}
        >
          Em Jogo
        </button>
        <button
          type="button"
          aria-pressed={localMesa === "fora_mesa"}
          onClick={() => setLocalMesa("fora_mesa")}
          style={getFiltroBarTabButtonStyle(t, brand, localMesa === "fora_mesa")}
        >
          Fora de Jogo
        </button>
      </div>
    </Campo>
  );

  const campoPrestador = (
    <Campo label="Prestador" required>
      <ComboBuscavel
        id="novo-incidente-prestador"
        label="Prestador"
        placeholder={loadingStaff ? "Carregando…" : "Selecione o prestador"}
        value={prestadorId}
        onChange={setPrestadorId}
        options={prestadorComboOptions}
        disabled={loadingStaff}
        forceSearch
        searchPlaceholder="Pesquisar por nome ou nickname..."
      />
    </Campo>
  );

  const campoIdRodada = (
    <Campo label="ID da Rodada" required={!semIdRodada}>
      <input
        type="text"
        value={semIdRodada ? "" : idRodada}
        onChange={(e) => setIdRodada(e.target.value)}
        disabled={semIdRodada || salvando}
        placeholder={semIdRodada ? "Sem ID" : undefined}
        style={{
          ...inputBaseStyle(t),
          opacity: semIdRodada ? 0.6 : 1,
        }}
        aria-required={!semIdRodada}
      />
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          fontSize: 12,
          color: t.text,
          fontFamily: FONT.body,
          cursor: salvando ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={semIdRodada}
          disabled={salvando}
          onChange={(e) => {
            const checked = e.target.checked;
            setSemIdRodada(checked);
            if (checked) setIdRodada("");
          }}
          style={{ width: 15, height: 15, accentColor: "var(--brand-primary, #7c3aed)" }}
        />
        Não tem ID
      </label>
    </Campo>
  );

  const campoDataRodada = (
    <Campo label="Data da Rodada" required>
      <input
        type="date"
        value={dataRodada}
        onChange={(e) => setDataRodada(e.target.value)}
        style={inputBaseStyle(t)}
      />
    </Campo>
  );

  const campoHoraRodada = (
    <Campo label="Hora da Rodada" required>
      <input
        type="text"
        value={horaRodada}
        onChange={(e) => setHoraRodada(e.target.value)}
        placeholder="HH:MM"
        inputMode="numeric"
        autoComplete="off"
        style={inputBaseStyle(t)}
        aria-describedby="hint-hora-rodada"
      />
      <div id="hint-hora-rodada" style={{ marginTop: 6, fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
        Formato 24h, ex.: 14:30
      </div>
    </Campo>
  );

  return (
    <ModalBase onClose={onClose} maxWidth={920}>
      <ModalHeader title="Novo Incidente" onClose={onClose} />

      <div style={{ display: "grid", gap: 18 }}>
        <Campo label="Time">
          <div role="tablist" aria-label="Time" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FiltroBarTabButton
              id="tab-novo-incidente-gp"
              active={timeAlvo === "gp"}
              onClick={() => setTimeAlvo("gp")}
              icon={<UserRound {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Game Presenter
            </FiltroBarTabButton>
            <FiltroBarTabButton
              id="tab-novo-incidente-shuf"
              active={timeAlvo === "shuf"}
              onClick={() => setTimeAlvo("shuf")}
              icon={<Shuffle {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Shuffler
            </FiltroBarTabButton>
          </div>
        </Campo>

        <div style={row2}>
          {campoMesa}
          {campoTipo}
        </div>

        {timeAlvo === "gp" ? (
          <div style={row3}>
            {campoIncidente}
            {campoResolucao}
            {campoPayout}
          </div>
        ) : (
          <>
            <div style={row2}>
              {campoIncidente}
              {campoResolucao}
            </div>
            <div style={row2}>
              {campoPayout}
              {campoLocalShoe}
            </div>
          </>
        )}

        <div style={row2}>
          {campoPrestador}
          {campoIdRodada}
        </div>

        <div style={row2}>
          {campoDataRodada}
          {campoHoraRodada}
        </div>

        <Campo label="Descrição" required>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            style={{ ...inputBaseStyle(t), resize: "vertical" as const, fontFamily: FONT.body }}
          />
        </Campo>

        <CampoUploadArquivos
          id="incidente-anexos"
          label="Anexos"
          buttonLabel="Adicionar anexo"
          icon={Paperclip}
          multiple
          items={anexos.map((a) => ({ key: a.key, label: a.file.name, pendente: true }))}
          onAdd={onAddAnexos}
          onRemove={onRemoveAnexo}
          disabled={salvando}
          t={t}
          hint={ANEXO_HINT}
        />

        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: salvando ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={salvando}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background:
                "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: salvando ? "not-allowed" : "pointer",
              opacity: salvando ? 0.75 : 1,
            }}
          >
            {salvando ? "Salvando…" : "Registrar Incidente"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
