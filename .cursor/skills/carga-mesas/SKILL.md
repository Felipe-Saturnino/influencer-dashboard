---
name: carga-mesas
description: >-
  Carga diária Mesas Spin: Grafana/ClickHouse pelo Browser do chat → JSON em
  tmp/ → UPSERT direto no Supabase. Usar com /carga-mesas. Não usar na carga
  GP KPI/Sinais, feature, verificação ou UI.
disable-model-invocation: true
---

# Carga Mesas Spin

Esta frente é o **chat diário de carga comercial do Overview Spin**. Não misturar
com `/carga-grafana` (GP KPI/Sinais), `/nova-feature` ou `/verificacao`.

Antes de operar, **Read** `.cursor/rules/mesas-spin-carga.mdc`. O MDC é a lei:
D-0, split EsportivaBet, zeros, reconciliação e validação vivem lá.

## Uso

```text
/carga-mesas Atualizar os dados até D-1.
```

## Browser do chat — padrão

O usuário mantém qualquer página do **Grafana Spin** em
`spingaming2.grafana.proxylive.tech` aberta e autenticada pelo Pomerium.

1. Consultar o último dia de Dedicada e Network no Supabase. A janela começa no
   canal mais atrasado e termina em D-1.
2. Gerar a expressão:

   ```bash
   node scripts/grafana-mesas-spin-write-extract-expr.mjs \
     --de=YYYY-MM-DD --ate=YYYY-MM-DD
   ```

3. `browser_tabs` → aba Grafana; `browser_lock` → avaliar, em ordem, os
   `*-chunk-N.js` e depois `*-run.js` gerados em `tmp/`.
4. O extract faz uma chamada multi-query a `/api/ds/query` e deixa:
   - `window.__mesasGrafana.network`
   - `window.__mesasGrafana.dedicado`
   - `window.__mesasGrafana.monthly`
5. Salvar os três JSONs em `tmp/grafana-mesas-*.json`.
6. Dry-run e gravação:

   ```bash
   node scripts/mesas-spin-run.mjs \
     --network=tmp/grafana-mesas-network-….json \
     --dedicado=tmp/grafana-mesas-dedicado-….json \
     --monthly=tmp/grafana-mesas-monthly-….json \
     --de=YYYY-MM-DD --ate=YYYY-MM-DD \
     --preencher-faltantes --dry-run

   node scripts/mesas-spin-run.mjs \
     --network=tmp/grafana-mesas-network-….json \
     --dedicado=tmp/grafana-mesas-dedicado-….json \
     --monthly=tmp/grafana-mesas-monthly-….json \
     --de=YYYY-MM-DD --ate=YYYY-MM-DD \
     --preencher-faltantes --gravar
   ```

7. Validar último dia dos dois canais e volume dos slugs Network.
8. Sempre liberar o Browser ao terminar.

O extract acontece **neste compositor**; subagentes não herdam o Browser.

## Um comando local — fallback

Com `GRAFANA_MESAS_COOKIE` (ou `GRAFANA_GP_KPI_COOKIE`) somente no
`.env.gp-kpi`:

```bash
node scripts/carga-mesas-spin.mjs
```

O comando detecta a janela, extrai Network + Dedicada + Monthly numa chamada,
grava e valida. Nunca colar cookie no chat ou versioná-lo.

## Regras rápidas

- Nunca D-0.
- `--de` e `--ate` são **inclusivos**.
- Dinheiro: `amount` / `payout` da `filtered_player_bets_view` com
  `currency = 'BRL'`.
- Apostas: `count(bet_id)`.
- UAP: tabelas agregadas; EsportivaBet separada pelo último segmento de
  `player_id`.
- `live_dwh_agg` monetário é EUR: não usar `turnover/ggr` agregado para o
  Overview Spin.
- Discrepância fora de ±1/±2: não gravar; reportar.
- Não pedir SQL Editor salvo falha explícita do UPSERT.
- Commit/push: somente o usuário.

## Fora desta frente

- GP KPI / Sinais SM → `/carga-grafana`
- Página nova → `/nova-feature`
- Auditoria formal → `/verificacao`
