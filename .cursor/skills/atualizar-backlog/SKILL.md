---
name: atualizar-backlog
description: >-
  Propõe alteração mínima em docs/BACKLOG.md para o fio deste chat (estado,
  pausa, próximo passo). Usar ao fechar chat longo com /atualizar-backlog —
  não em carga diária concluída nem a cada mensagem.
disable-model-invocation: true
---

# Atualizar Backlog

Ritual de **fecho**. Um ficheiro (`docs/BACKLOG.md`), um **fio** por trabalho longo.

No compositor: Enter numa mensagem:

```
/atualizar-backlog
```

Opcional: nome do fio e estado na mesma mensagem.

## Instruções

1. Read `docs/BACKLOG.md`.
2. Inferir o **fio deste chat** (ou pedir ao usuário uma linha: nome + em curso / pausado / fechado + próximo passo).
3. Propor diff **só** nas secções Em curso / Pausado / Próximo / Aberto — mover ou editar **apenas** o bloco desse fio.
4. Manter teto ~40 linhas. Não colar tabelas de verificação, commits, SQL — apontar para ficheiros (ex.: `historico-verificacao-2.md`).
5. **Parar** na proposta. Gravar `docs/BACKLOG.md` só se o usuário aprovar («pode gravar», «aplica», «ok»).
6. Commit/push **não**.
7. Carga Mesas/Grafana **sem** fio aberto: dizer que não precisa atualizar; Locks já estão no ficheiro.

## Fora deste ritual

- Trabalho do dia (bugfix rápido, carga D-1 ok) → não obriga atualização.
- Feature/verificação/método com fio longo → usar aqui ao fechar.
