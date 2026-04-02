"""DETALHAMENTO DIÁRIO.xlsx (Sheet1: Data, GGR, Turnover, Apostas, UAP) -> detalhamento-diario-from-xlsx.sql"""
from pathlib import Path

import pandas as pd

path_in = Path(r"c:\Users\Felipe Saturnino\Downloads\DETALHAMENTO DIÁRIO.xlsx")
path_out = Path(__file__).resolve().parent / "detalhamento-diario-from-xlsx.sql"

df = pd.read_excel(path_in)
df["Data"] = pd.to_datetime(df["Data"]).dt.strftime("%Y-%m-%d")


def fmt_money(x: object) -> str:
    s = format(round(float(x), 6), "f").rstrip("0").rstrip(".")
    return s if s else "0"


lines = [
    f"  ('{row.Data}', {fmt_money(row.Turnover)}, {fmt_money(row.GGR)}, {int(row.Apostas)}, {int(row.UAP)})"
    for row in df.itertuples(index=False)
]

header = f"""-- Gerado por scripts/generate-detalhamento-diario-from-xlsx.py a partir de: {path_in.name}
-- Alvo: public.relatorio_daily_summary (Detalhamento Diário no dashboard Mesas Spin)
-- Período: {df["Data"].iloc[0]} .. {df["Data"].iloc[-1]} ({len(df)} linhas)
-- Correr no SQL Editor Supabase (role com bypass RLS).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, turnover, ggr, apostas, uap)
VALUES
"""

footer = """
ON CONFLICT (data) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
"""

path_out.write_text(header + ",\n".join(lines) + footer, encoding="utf-8", newline="\n")
print("Wrote", path_out)
