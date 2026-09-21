---
name: carga-grafana
description: >-
  Carga diária Grafana → Supabase (GP KPI em gp_kpi_diario e sinais SM em
  sm_sinais). Usar com /carga-grafana. Não misturar com Mesas Spin, feature
  nem verificação.
disable-model-invocation: true
---

# Carga Grafana (GP KPI + sinais SM)

Chat **diário desta frente**. Não misturar com `/carga-mesas`.

Lei: **Read** `.cursor/rules/grafana-carga.mdc` **antes** de extract ou runner. Setup longo: `docs/SETUP-GP-KPI-GRAFANA.md` só se falhar sessão ou SQL.

No **painel do editor**, Custom Mode não liga. Uma mensagem, Enter:

```
/carga-grafana Atualizar até D-1.
```

O `/carga-grafana` laranja **é** a invocação. Nunca colar cookie Pomerium no chat.

## Instruções

1. Read `.cursor/rules/grafana-carga.mdc`.
2. Grafana logado no browser. Sem sessão → parar e pedir login na aba.
3. Só dias **completos** (não D-0). Rotina: **os dois** pipelines (GP KPI e sinais SM), salvo o usuário pedir um só.
4. Extract na aba → `tmp/` → dry-run se a janela for nova → runner `--arquivo=` para gravar.
5. Listar órfãos (mesa / Work ID); não inventar vínculo. Commit/push **não**.

Esta frente **pode** correr extract e gravar no Supabase (exceção operacional, como `/carga-mesas`). Não editar código de produto.

## Fora desta frente

- Mesas Spin comercial / Overview Spin → `/carga-mesas`
- UI → `/nova-feature` · varredura → `/verificacao`
