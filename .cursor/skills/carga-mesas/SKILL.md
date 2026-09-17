---
name: carga-mesas
description: >-
  Carga diária Mesas Spin: extract Superset dashboard 15 (Browser do chat
  logado ou cookie) → JSON em tmp/ → UPSERT --gravar. Usar com /carga-mesas.
  Não em feature, verificação nem UI.
disable-model-invocation: true
---

# Carga Mesas Spin

Esta frente é o **chat diário de carga**. Não misturar com `/nova-feature` nem `/verificacao`.

Lei: **Read** `.cursor/rules/mesas-spin-carga.mdc` **antes** de extract ou runner. Não recopiar o MDC aqui. Split EsportivaBet / zeros / D-0 estão lá.

No **painel do editor** (Composer com Open Canvas / Changes / This PC): Custom Mode **não liga**. Alt+Enter só insere `/carga-mesas` em laranja no campo — é o fluxo certo daqui.

**Como usar neste chat:** uma mensagem só, Enter:

```
/carga-mesas Atualizar os dados até D-1.
```

O texto laranja `/carga-mesas` no input (e a bolha no histórico) **é** a confirmação. Não há badge.

Badge / Alt+Enter / Use as Mode: só na **Agents Window** (janela Agents), não neste compositor.

## Browser do chat (padrão — cookie **não** necessário)

O usuário mantém o **Daily Commercial Report [BRL]** (dashboard 15) **logado** no **Browser do painel do chat** (MCP `cursor-ide-browser`). Em cada `/carga-mesas`, usar essa aba — **não** pedir cookie, **não** pedir copiar request do DevTools Network (aba vazia até recarregar é normal e **não** bloqueia o extract).

Fluxo agent (detalhe no MDC § Browser do chat):

1. `browser_tabs` → aba `superset-sg.proxylive.tech/.../dashboard/15`.
2. Extract **network → dedicado → monthly** via `browser_cdp` (`Runtime.evaluate`), script canónico: `tmp/make-compact-extract.mjs` + chunks/`eval` (Smart Mode se Auto-review bloquear fetch).
3. Dump `window.__mesasNet` / `__mesasDed` / `__mesasMon` → `tmp/superset-*.json`.
4. `node scripts/superset-mesas-spin-run.mjs … --preencher-faltantes --escrever-sql --gravar` (ou `node scripts/carga-mesas-spin.mjs --so-gravar …` se JSON já existir).

Subagentes **não** enxergam o Browser do compositor — extract **neste chat**, não delegar.

## Instruções

1. Read `.cursor/rules/mesas-spin-carga.mdc`.
2. Descobrir a janela: último dia em `relatorio_daily_summary` e `relatorio_network_daily_summary` (`tmp/ultimo-dia-supabase.mjs`). Só dias **completos**. **Não** D-0. `ATE` no Superset é exclusivo.
3. **Extract:** Browser do chat (acima). **Fallback** (sem aba logada): `SUPERSET_MESAS_COOKIE` em `.env.gp-kpi` → `node scripts/carga-mesas-spin.mjs`, ou Chrome `--remote-debugging-port=9222` → `--cdp` (MDC § Comando único).
4. Não pedir SQL no Editor salvo falha de `--gravar`. Não `FORCE=true` na rotina. Não slug de estúdio como `operadora_slug`.
5. Validar slugs EsportivaBet no intervalo. Discrepância mesas vs daily ±1/±2: **sinalizar**, não corrigir sozinho.
6. Informar dias carregados e slugs novos com volume. Commit/push **não**.

Reload histórico (`--de` / `--ate` explícitos) só se o usuário pedir; aí o MDC ainda manda.

## Fora desta frente

- UI / página nova → `/nova-feature`
- Varredura → `/verificacao`
- Grafana (GP KPI / sinais SM) → `/carga-grafana`

## Exemplos

```
/carga-mesas
Atualizar os dados até D-1.
```

```
/carga-mesas
Reload 01/09 a 06/09 (inclusivos).
```
