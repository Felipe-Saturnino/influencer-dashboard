import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { FONT } from "../../constants/theme";
import { SelectComIcone } from "../dashboard/SelectComIcone";
import { FilterBarIcons } from "../../lib/filterBarIconCatalog";
import {
  INFORMATIVO_OPERADOR_ESCOPO_TODOS,
  INFORMATIVO_OPERADOR_ESCOPO_TODOS_LABEL,
  type OperadoraAtivaOption,
} from "../../lib/informativosOperadorEscopo";

type ThemePick = {
  cardBorder: string;
  textMuted: string;
};

export function InformativoOperadorEscopoSelect({
  value,
  onChange,
  t,
  hasError,
}: {
  value: string | null;
  onChange: (slugOuTodos: string) => void;
  t: ThemePick;
  hasError?: boolean;
}) {
  const [operadoras, setOperadoras] = useState<OperadoraAtivaOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("operadoras")
        .select("slug, nome")
        .eq("ativo", true)
        .order("nome");
      if (cancelled) return;
      if (error) {
        console.error("[InformativoOperadorEscopoSelect] operadoras:", error);
        setOperadoras([]);
      } else {
        setOperadoras(
          (data ?? []).map((row) => {
            const r = row as { slug: string; nome: string };
            return { slug: r.slug, nome: r.nome };
          }),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectValue = value ?? "";

  return (
    <div
      style={{
        marginTop: 4,
        padding: hasError ? "10px 12px" : undefined,
        borderRadius: hasError ? 10 : undefined,
        border: hasError ? "1px solid #e84025" : undefined,
      }}
    >
      <SelectComIcone
        id="informativo-operador-escopo"
        icon={FilterBarIcons.operadora}
        value={selectValue}
        onChange={onChange}
        label="Operadora do informativo para perfil Operador"
        minWidth={280}
        pill={false}
        disabled={loading}
        style={{ width: "100%", maxWidth: "100%" }}
      >
        <option value="" disabled>
          {loading ? "Carregando operadoras…" : "Selecione a operadora"}
        </option>
        <option value={INFORMATIVO_OPERADOR_ESCOPO_TODOS}>{INFORMATIVO_OPERADOR_ESCOPO_TODOS_LABEL}</option>
        {operadoras.map((op) => (
          <option key={op.slug} value={op.slug}>
            {op.nome}
          </option>
        ))}
      </SelectComIcone>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 11,
          color: t.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.45,
        }}
      >
        Operadoras com perfil <strong style={{ fontWeight: 700 }}>Ativa</strong> em Gestão de Operadoras.{" "}
        <strong style={{ fontWeight: 700 }}>{INFORMATIVO_OPERADOR_ESCOPO_TODOS_LABEL}</strong> envia o informativo a
        todos os usuários com perfil Operador.
      </p>
    </div>
  );
}
