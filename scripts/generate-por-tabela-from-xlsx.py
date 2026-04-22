"""Dados por Mesa.xlsx -> relatorio_por_tabela (UPSERT).

Colunas esperadas: DATA, filter (nome da mesa), Turnover, GGR, Apostas.
Operadora fixa: Casa de Apostas (planilha não traz operadora).
Cadastro canónico de mesas (nome, tipo, número, ID): tabela `mesas_spin_cadastro` (Gestão de Mesas).
"""
from pathlib import Path

import pandas as pd

path_in = Path(r"c:\Users\Felipe Saturnino\Downloads\Dados por Mesa.xlsx")
path_out = Path(__file__).resolve().parent / "dados-por-mesa-from-xlsx.sql"

OPERADORA = "Casa de Apostas"

# Alinha ao dashboard (syntheticNomeTabela → "Casa de Apostas VIP Blackjack 1" para canonicalMesaCasaAposta)
MESA_MAP = {
    "Blackjack VIP": "VIP Blackjack 1",
}

df = pd.read_excel(path_in)
df["dia"] = pd.to_datetime(df["DATA"]).dt.strftime("%Y-%m-%d")
raw = df["filter"].astype(str).str.strip()
df["mesa"] = raw.map(lambda m: MESA_MAP.get(m, m))
df = df.sort_values(["dia", "mesa"])


def fmt_money(x: object) -> str:
    s = format(round(float(x), 6), "f").rstrip("0").rstrip(".")
    return s if s else "0"


def sql_str(s: str) -> str:
    return s.replace("'", "''")


lines = []
for row in df.itertuples(index=False):
    lines.append(
        "  ("
        f"'{row.dia}', '{sql_str(OPERADORA)}', '{sql_str(row.mesa)}', "
        f"{fmt_money(row.GGR)}, {fmt_money(row.Turnover)}, {int(row.Apostas)}"
        ")"
    )

header = f"""-- Gerado por scripts/generate-por-tabela-from-xlsx.py a partir de: {path_in.name}
-- Alvo: public.relatorio_por_tabela — operadora = '{OPERADORA}' (planilha só tem mesa em "filter")
-- Linhas: {len(df)} | Dias: {df['dia'].iloc[0]} .. {df['dia'].iloc[-1]} | Mesas: {df['mesa'].nunique()}
-- Correr no SQL Editor Supabase (role com bypass RLS).

BEGIN;

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas)
VALUES
"""

footer = """
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

COMMIT;
"""

path_out.write_text(header + ",\n".join(lines) + footer, encoding="utf-8", newline="\n")
print("Wrote", path_out, "rows", len(df))
