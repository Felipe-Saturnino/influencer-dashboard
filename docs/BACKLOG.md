# Backlog — Data Intelligence

**Um ficheiro** para o repo; **vários fios** (trabalhos longos ou pausáveis). Não é diário
nem backlog de produto eterno. Teto ~40 linhas — fio fechado **sai** daqui.

**Leitura:** todo chat (ver `AGENTS.md`). Cargas diárias: secção **Locks** basta.
**Escrita:** só com `/atualizar-backlog` — altera **só o fio deste chat**; não reescrever o ficheiro inteiro.

## Em curso

- **Método RS no cérebro do agente** (handoff ERP Brain, 11/09).
  Feito: dieta always-on · `AGENTS.md` · 4 skills de frente · este Backlog + `/atualizar-backlog`.
  Próximo: preencher fios dos outros chats (pedir atualização ao fechar cada um).

## Pausado

- **Verificação 2.0** — parada no ciclo 14 (Resultados + Feedback).
  Retomar ciclo 15. Checks: `.cursor/skills/verificacao/historico-verificacao-2.md`.

## Próximo

- (vazio — novos fios entram via `/atualizar-backlog` nos chats em curso)

## Aberto, sem data

- Estatuto / locks datados / fila / testes que travam a lei.
- Handoff datado no git (hoje só `docs/HANDOFF-*` avulsos).
- Script de verdade fora da SPA (tipo `lastro_snapshot.py`).
- Promote staging → prod com GO explícito.

## Locks (valem sempre)

- Git: só o humano commita/publica. Agente nunca.
- Código de produto: só após «pode implementar» / «pode gravar». Cargas são exceção.
- Carga nunca D-0. Mesas e Grafana **nunca** no mesmo chat.

## Não fazer

- ERP (NFS-e, DRE, Bank Rec) dentro da Data Intelligence.
- Reabrir always-on de `global` / `business` / Brand.
