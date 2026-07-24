import { useEffect, useState } from "react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { TutorialPerfilMultiSelect } from "../../../components/TutorialPerfilMultiSelect";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { salvarTutorialVisibilidade } from "../../../lib/ajudaTutorialVisibilidade";
import type { Role } from "../../../types";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";

type Props = {
  tutorialId: string;
  tutorialTitulo: string;
  rolesIniciais: Role[];
  onClose: () => void;
  onSaved: (roles: Role[]) => void;
};

export function ModalEditarVisibilidadeTutorial({
  tutorialId,
  tutorialTitulo,
  rolesIniciais,
  onClose,
  onSaved,
}: Props) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const [roles, setRoles] = useState<Role[]>(rolesIniciais);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRoles(rolesIniciais);
    setErr(null);
  }, [rolesIniciais, tutorialId]);

  async function salvar() {
    if (roles.length === 0) {
      setErr("Selecione ao menos um perfil.");
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await salvarTutorialVisibilidade(tutorialId, roles, user?.id ?? null);
    setSaving(false);
    if (!res.ok) {
      setErr("Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    onSaved(roles);
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Visibilidade do tutorial" onClose={onClose} />
      <div style={{ padding: "8px 4px 0" }}>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            lineHeight: 1.55,
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          Defina quais perfis verão o tutorial <strong style={{ color: t.text }}>{tutorialTitulo}</strong> na
          Ajuda. O Administrador sempre vê todos os tutoriais.
        </p>
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: t.text,
              fontFamily: FONT.body,
            }}
          >
            Perfis
            <CampoObrigatorioMark />
          </span>
        </div>
        <TutorialPerfilMultiSelect
          selected={roles}
          onChange={(next) => {
            setRoles(next);
            if (err) setErr(null);
          }}
          t={t}
          hasError={Boolean(err && roles.length === 0)}
        />
        {err ? (
          <div
            role="alert"
            aria-live="polite"
            style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginTop: 12 }}
          >
            {err}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: saving ? "default" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={saving}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
