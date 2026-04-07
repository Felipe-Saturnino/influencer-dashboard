#!/usr/bin/env python3
"""Gera INSERT ... ON CONFLICT para pls_jogador_dados (cda_id, data_cadastro_bet).

Entrada: TSV ou linhas "cda_id<TAB>dd/mm/yyyy" (e.g. export Excel).
Uso:
  python scripts/generate_pls_cadastro_bet_sql.py < dados.tsv > import.sql
  python scripts/generate_pls_cadastro_bet_sql.py dados.tsv -o import.sql

Datas em DD/MM/YYYY são convertidas para meia-noite UTC (compatível com o dashboard).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_lines(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.upper().startswith("ID"):
            continue
        if "\t" in line:
            parts = line.split("\t", 1)
        else:
            parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        cda_id, dmy = parts[0].strip(), parts[1].strip()
        if not cda_id.isdigit():
            continue
        rows.append((cda_id, dmy))
    return rows


def dmy_to_iso_z(dmy: str) -> str:
    dt = datetime.strptime(dmy, "%d/%m/%Y").replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def emit_sql(rows: list[tuple[str, str]], out) -> None:
    print(
        """-- Upload manual: cda_id + data_cadastro_bet (meia-noite UTC por dia de calendário).
-- Não altera primeiro_jogo_spin nem outros campos no UPDATE.

INSERT INTO public.pls_jogador_dados (cda_id, data_cadastro_bet, updated_at)
VALUES""",
        file=out,
    )
    for i, (cda_id, dmy) in enumerate(rows):
        iso = dmy_to_iso_z(dmy)
        comma = "," if i < len(rows) - 1 else ""
        print(f"  ('{cda_id}', '{iso}'::timestamptz, now()){comma}", file=out)
    print(
        """ON CONFLICT (cda_id) DO UPDATE SET
  data_cadastro_bet = EXCLUDED.data_cadastro_bet,
  updated_at = EXCLUDED.updated_at;""",
        file=out,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument(
        "input",
        nargs="?",
        type=Path,
        help="Ficheiro TSV (omitir = stdin)",
    )
    ap.add_argument("-o", "--output", type=Path, help="Ficheiro de saída (omitir = stdout)")
    args = ap.parse_args()

    if args.input:
        text = args.input.read_text(encoding="utf-8")
    else:
        text = sys.stdin.read()

    rows = parse_lines(text)
    if not rows:
        print("Nenhuma linha válida (esperado: cda_id<TAB>dd/mm/yyyy).", file=sys.stderr)
        sys.exit(1)

    out = args.output.open("w", encoding="utf-8") if args.output else sys.stdout
    try:
        emit_sql(rows, out)
    finally:
        if args.output:
            out.close()

    if args.output:
        print(f"Escrito: {args.output} ({len(rows)} linhas)", file=sys.stderr)


if __name__ == "__main__":
    main()
