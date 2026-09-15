---
name: carga-mesas
description: >-
  Carga diária Mesas Spin: extract Superset dashboard 15 → JSON em tmp/ →
  UPSERT --gravar. Usar com /carga-mesas ou pedidos atualizar/carregar mesas.
  Não em feature, verificação nem UI.
disable-model-invocation: true
---

# Carga Mesas Spin

Esta frente é o **chat diário de carga**. Não misturar com `/nova-feature` nem `/verificacao`.

Lei: **Read** `.cursor/rules/mesas-spin-carga.mdc` **antes** de extract ou runner. Não recopiar o MDC aqui. Split EsportivaBet / zeros / D-0 estão lá.

Preferir **Custom Mode**: `/carga-mesas` + Alt+Enter (Windows). No chat de carga do dia, ligar o modo na primeira mensagem.

## Instruções

1. Read `.cursor/rules/mesas-spin-carga.mdc`.
2. Descobrir a janela: último dia em `relatorio_daily_summary` e `relatorio_network_daily_summary` (`tmp/ultimo-dia-supabase.mjs` ou equivalente). Só dias **completos**. **Não** D-0. `ATE` no Superset é exclusivo.
3. Seguir o fluxo operacional do MDC: browser dashboard 15 logado → extract Network → Dedicado → Monthly (oneshot) → JSON em `tmp/` → `superset-mesas-spin-run.mjs` com `--escrever-sql --gravar` (e `--preencher-faltantes` na carga rotineira).
4. Não pedir SQL no Editor salvo falha de `--gravar`. Não `FORCE=true` na rotina. Não slug de estúdio como `operadora_slug`.
5. Validar slugs EsportivaBet no intervalo. Discrepância mesas vs daily ±1/±2: **sinalizar**, não corrigir sozinho.
6. Informar dias carregados e slugs novos com volume. Commit/push **não**.

Reload histórico (`--de` / `--ate` explícitos) só se o usuário pedir; aí o MDC ainda manda.

## Fora desta frente

- UI / página nova → `/nova-feature`
- Varredura → `/verificacao`

## Exemplos

```
/carga-mesas
Atualizar os dados até D-1.
```

```
/carga-mesas
Reload 01/09 a 06/09 (inclusivos).
```
