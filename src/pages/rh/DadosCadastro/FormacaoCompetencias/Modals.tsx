import { useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../../components/CampoObrigatorioMark";
import { CampoUploadArquivos } from "../../../../components/CampoUploadArquivos";
import { useApp } from "../../../../context/AppContext";
import { FONT } from "../../../../constants/theme";
import {
  RH_FORMACAO_GRAU_OPCOES,
  RH_FORMACAO_STATUS_OPCOES,
  RH_IDIOMA_NIVEL_OPCOES,
  RH_PORTFOLIO_TIPO_OPCOES,
  RH_PORTFOLIO_TIPOS_SOMENTE_LINK,
  rhFormacaoAnoMax,
} from "../../../../lib/rhFormacaoCompetenciasConstants";
import {
  RH_FORMACAO_PORTFOLIO_ACCEPT,
  portfolioArquivoPermitido,
  validarAnoFormacao,
  validarUrlPortfolio,
} from "../../../../lib/rhFormacaoCompetenciasStorage";
import type {
  RhFormacaoGrau,
  RhFormacaoStatus,
  RhFuncionarioCurso,
  RhFuncionarioFormacao,
  RhFuncionarioIdioma,
  RhFuncionarioPortfolio,
  RhIdioma,
  RhIdiomaNivel,
  RhPortfolioOrigem,
  RhPortfolioTipo,
} from "../../../../types/rhFormacaoCompetencias";
import { getFormacaoInputStyle } from "./sharedStyles";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  err: string | null;
  submitLabel: string;
  children: React.ReactNode;
};

function ModalShell({ title, onClose, onSubmit, loading, err, submitLabel, children }: ModalShellProps) {
  const { theme: t } = useApp();
  const inputStyle = getFormacaoInputStyle(t);
  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.text,
    fontFamily: FONT.body,
    marginBottom: 6,
  };
  const fieldGap: CSSProperties = { marginBottom: 14 };

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title={title} onClose={onClose} />
      {err ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}
      <div style={{ marginBottom: 16 }}>{children}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="app-lucide-spin" aria-hidden />
              Salvando…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
      {/* expõe estilos para filhos via closure — filhos usam props abaixo */}
      <span hidden data-label-style={JSON.stringify(labelStyle)} data-input-style={JSON.stringify(inputStyle)} data-field-gap={JSON.stringify(fieldGap)} />
    </ModalBase>
  );
}

function useModalFieldStyles() {
  const { theme: t } = useApp();
  return {
    labelStyle: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: t.text,
      fontFamily: FONT.body,
      marginBottom: 6,
    } as CSSProperties,
    inputStyle: getFormacaoInputStyle(t),
    fieldGap: { marginBottom: 14 } as CSSProperties,
  };
}

export type FormacaoAcademicaPayload = {
  curso: string;
  instituicao: string;
  grau: RhFormacaoGrau;
  ano_conclusao: number | null;
  status: RhFormacaoStatus;
};

export function ModalFormacaoAcademica({
  initial,
  onClose,
  onSave,
}: {
  initial?: RhFuncionarioFormacao | null;
  onClose: () => void;
  onSave: (payload: FormacaoAcademicaPayload) => Promise<void>;
}) {
  const { labelStyle, inputStyle, fieldGap } = useModalFieldStyles();
  const [curso, setCurso] = useState(initial?.curso ?? "");
  const [instituicao, setInstituicao] = useState(initial?.instituicao ?? "");
  const [grau, setGrau] = useState<RhFormacaoGrau>(initial?.grau ?? "graduacao");
  const [ano, setAno] = useState(initial?.ano_conclusao != null ? String(initial.ano_conclusao) : "");
  const [status, setStatus] = useState<RhFormacaoStatus>(initial?.status ?? "concluido");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!curso.trim()) {
      setErr("Informe o nome do curso.");
      return;
    }
    if (!instituicao.trim()) {
      setErr("Informe a instituição.");
      return;
    }
    const anoNum = ano.trim() ? Number(ano.trim()) : null;
    if (anoNum != null && !validarAnoFormacao(anoNum)) {
      setErr(`Ano deve estar entre 1950 e ${rhFormacaoAnoMax()}.`);
      return;
    }
    setLoading(true);
    try {
      await onSave({
        curso: curso.trim(),
        instituicao: instituicao.trim(),
        grau,
        ano_conclusao: anoNum,
        status,
      });
    } catch {
      setErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={initial ? "Editar formação acadêmica" : "Nova formação acadêmica"}
      onClose={onClose}
      onSubmit={() => void submit()}
      loading={loading}
      err={err}
      submitLabel="Salvar"
    >
      <div style={fieldGap}>
        <label style={labelStyle}>
          Curso
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={curso} onChange={(e) => setCurso(e.target.value)} aria-label="Curso" />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Instituição
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={instituicao} onChange={(e) => setInstituicao(e.target.value)} aria-label="Instituição" />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Grau
          <CampoObrigatorioMark />
        </label>
        <select style={inputStyle} value={grau} onChange={(e) => setGrau(e.target.value as RhFormacaoGrau)} aria-label="Grau">
          {RH_FORMACAO_GRAU_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>Ano de conclusão</label>
        <input
          style={inputStyle}
          inputMode="numeric"
          value={ano}
          onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-label="Ano de conclusão"
          placeholder="Ex.: 2022"
        />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Status
          <CampoObrigatorioMark />
        </label>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as RhFormacaoStatus)} aria-label="Status">
          {RH_FORMACAO_STATUS_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}

export type IdiomaPayload = { rh_idioma_id: string; nivel: RhIdiomaNivel };

export function ModalIdioma({
  idiomas,
  idsJaCadastrados,
  initial,
  onClose,
  onSave,
}: {
  idiomas: RhIdioma[];
  idsJaCadastrados: Set<string>;
  initial?: RhFuncionarioIdioma | null;
  onClose: () => void;
  onSave: (payload: IdiomaPayload) => Promise<void>;
}) {
  const { labelStyle, inputStyle, fieldGap } = useModalFieldStyles();
  const [rhIdiomaId, setRhIdiomaId] = useState(initial?.rh_idioma_id ?? "");
  const [nivel, setNivel] = useState<RhIdiomaNivel>(initial?.nivel ?? "intermediario");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opcoes = idiomas.filter((i) => initial?.rh_idioma_id === i.id || !idsJaCadastrados.has(i.id));

  useEffect(() => {
    if (!rhIdiomaId && opcoes.length > 0) setRhIdiomaId(opcoes[0].id);
  }, [opcoes, rhIdiomaId]);

  const submit = async () => {
    setErr(null);
    if (!rhIdiomaId) {
      setErr("Selecione um idioma.");
      return;
    }
    setLoading(true);
    try {
      await onSave({ rh_idioma_id: rhIdiomaId, nivel });
    } catch {
      setErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={initial ? "Editar idioma" : "Novo idioma"}
      onClose={onClose}
      onSubmit={() => void submit()}
      loading={loading}
      err={err}
      submitLabel="Salvar"
    >
      <div style={fieldGap}>
        <label style={labelStyle}>
          Idioma
          <CampoObrigatorioMark />
        </label>
        <select
          style={inputStyle}
          value={rhIdiomaId}
          onChange={(e) => setRhIdiomaId(e.target.value)}
          aria-label="Idioma"
          disabled={!!initial}
        >
          {opcoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Nível
          <CampoObrigatorioMark />
        </label>
        <select style={inputStyle} value={nivel} onChange={(e) => setNivel(e.target.value as RhIdiomaNivel)} aria-label="Nível">
          {RH_IDIOMA_NIVEL_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </ModalShell>
  );
}

export type CursoPayload = {
  nome: string;
  instituicao: string;
  carga_horaria_horas: number | null;
  ano: number | null;
};

export function ModalCurso({
  initial,
  onClose,
  onSave,
}: {
  initial?: RhFuncionarioCurso | null;
  onClose: () => void;
  onSave: (payload: CursoPayload) => Promise<void>;
}) {
  const { labelStyle, inputStyle, fieldGap } = useModalFieldStyles();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [instituicao, setInstituicao] = useState(initial?.instituicao ?? "");
  const [carga, setCarga] = useState(initial?.carga_horaria_horas != null ? String(initial.carga_horaria_horas) : "");
  const [ano, setAno] = useState(initial?.ano != null ? String(initial.ano) : "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!nome.trim()) {
      setErr("Informe o nome do curso.");
      return;
    }
    if (!instituicao.trim()) {
      setErr("Informe a instituição.");
      return;
    }
    const anoNum = ano.trim() ? Number(ano.trim()) : null;
    if (anoNum != null && !validarAnoFormacao(anoNum)) {
      setErr(`Ano deve estar entre 1950 e ${rhFormacaoAnoMax()}.`);
      return;
    }
    const cargaNum = carga.trim() ? Number(carga.trim()) : null;
    if (cargaNum != null && (cargaNum < 0 || !Number.isInteger(cargaNum))) {
      setErr("Carga horária inválida.");
      return;
    }
    setLoading(true);
    try {
      await onSave({
        nome: nome.trim(),
        instituicao: instituicao.trim(),
        carga_horaria_horas: cargaNum,
        ano: anoNum,
      });
    } catch {
      setErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={initial ? "Editar curso" : "Novo curso"}
      onClose={onClose}
      onSubmit={() => void submit()}
      loading={loading}
      err={err}
      submitLabel="Salvar"
    >
      <div style={fieldGap}>
        <label style={labelStyle}>
          Nome do curso
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do curso" />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Instituição
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={instituicao} onChange={(e) => setInstituicao(e.target.value)} aria-label="Instituição" />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>Carga horária (horas)</label>
        <input
          style={inputStyle}
          inputMode="numeric"
          value={carga}
          onChange={(e) => setCarga(e.target.value.replace(/\D/g, ""))}
          aria-label="Carga horária em horas"
        />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>Ano</label>
        <input
          style={inputStyle}
          inputMode="numeric"
          value={ano}
          onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-label="Ano"
        />
      </div>
    </ModalShell>
  );
}

export type PortfolioPayload = {
  titulo: string;
  tipo: RhPortfolioTipo;
  origem: RhPortfolioOrigem;
  url: string | null;
  file: File | null;
};

export function ModalPortfolio({
  initial,
  onClose,
  onSave,
}: {
  initial?: RhFuncionarioPortfolio | null;
  onClose: () => void;
  onSave: (payload: PortfolioPayload) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const { labelStyle, inputStyle, fieldGap } = useModalFieldStyles();
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [tipo, setTipo] = useState<RhPortfolioTipo>(initial?.tipo ?? "texto");
  const [origem, setOrigem] = useState<RhPortfolioOrigem>(initial?.origem ?? "link");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const somenteLink = RH_PORTFOLIO_TIPOS_SOMENTE_LINK.includes(tipo);

  useEffect(() => {
    if (somenteLink) {
      setOrigem("link");
      setFile(null);
    }
  }, [somenteLink]);

  const submit = async () => {
    setErr(null);
    if (!titulo.trim()) {
      setErr("Informe o título.");
      return;
    }
    const origemFinal = somenteLink ? "link" : origem;
    if (origemFinal === "link") {
      if (!validarUrlPortfolio(url)) {
        setErr("Informe uma URL válida (http ou https).");
        return;
      }
    } else if (!initial && !file) {
      setErr("Selecione um arquivo.");
      return;
    } else if (file && !portfolioArquivoPermitido(file)) {
      setErr("Arquivo inválido ou maior que 15 MB. Use PDF, PNG, JPEG, WebP, DOC ou DOCX.");
      return;
    }
    setLoading(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        tipo,
        origem: origemFinal,
        url: origemFinal === "link" ? url.trim() : null,
        file: origemFinal === "arquivo" ? file : null,
      });
    } catch {
      setErr("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={initial ? "Editar item do portfólio" : "Novo item do portfólio"}
      onClose={onClose}
      onSubmit={() => void submit()}
      loading={loading}
      err={err}
      submitLabel="Salvar"
    >
      <div style={fieldGap}>
        <label style={labelStyle}>
          Título
          <CampoObrigatorioMark />
        </label>
        <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Título" />
      </div>
      <div style={fieldGap}>
        <label style={labelStyle}>
          Tipo
          <CampoObrigatorioMark />
        </label>
        <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value as RhPortfolioTipo)} aria-label="Tipo">
          {RH_PORTFOLIO_TIPO_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {!somenteLink ? (
        <div style={fieldGap}>
          <label style={labelStyle}>
            Origem
            <CampoObrigatorioMark />
          </label>
          <select
            style={inputStyle}
            value={origem}
            onChange={(e) => setOrigem(e.target.value as RhPortfolioOrigem)}
            aria-label="Origem"
            disabled={!!initial && initial.origem === "arquivo"}
          >
            <option value="link">Link externo</option>
            <option value="arquivo">Arquivo</option>
          </select>
        </div>
      ) : null}
      {somenteLink || origem === "link" ? (
        <div style={fieldGap}>
          <label style={labelStyle}>
            URL
            <CampoObrigatorioMark />
          </label>
          <input
            style={inputStyle}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="URL"
            placeholder="https://..."
          />
        </div>
      ) : null}
      {!somenteLink && origem === "arquivo" ? (
        <CampoUploadArquivos
          id="portfolio-arquivo"
          label={initial ? "Substituir arquivo" : "Arquivo"}
          buttonLabel={initial ? "Substituir arquivo" : "Selecionar arquivo"}
          accept={RH_FORMACAO_PORTFOLIO_ACCEPT}
          multiple={false}
          items={file ? [{ key: "novo", label: file.name, pendente: true }] : []}
          onAdd={(files) => setFile(files[0] ?? null)}
          onRemove={() => setFile(null)}
          disabled={loading}
          t={t}
          footer={
            !file && initial?.file_name ? (
              <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                Arquivo atual: {initial.file_name}
              </div>
            ) : null
          }
        />
      ) : null}
    </ModalShell>
  );
}
