# Mesas Spin — carga diária via Grafana/ClickHouse

## Fonte e destino

| Item | Valor |
|---|---|
| Gateway | Grafana `spingaming2.grafana.proxylive.tech` |
| Datasource | `risk_integrity_ch_live_sg` |
| Bets BRL | `live_dwh.filtered_player_bets_view` |
| UAP | `live_dwh_agg.agg_reporting_uap` / `agg_player_bets` |
| Destino | famílias `relatorio_*` e `relatorio_network_*` no Supabase |
| Orquestrador | `scripts/carga-mesas-spin.mjs` |
| Runner | `scripts/mesas-spin-run.mjs` |

Valores monetários:

```sql
sum(amount)                 -- turnover BRL
sum(amount) - sum(payout)   -- GGR BRL
count(bet_id)               -- apostas
```

As consultas aplicam `currency = 'BRL'`. Não usar `turnover/ggr` de
`live_dwh_agg`: são EUR.

## Pré-requisitos

- `.env.gp-kpi` ou `.env` com `VITE_SUPABASE_URL`/`SUPABASE_URL` e
  `SUPABASE_SERVICE_ROLE_KEY`.
- Browser do chat autenticado no Grafana pelo Pomerium.
- Nunca carregar D-0.

## Browser do chat — modo preferido

1. Gerar o extract para a janela inclusiva:

   ```bash
   node scripts/grafana-mesas-spin-write-extract-expr.mjs \
     --de=2026-09-18 --ate=2026-09-20
   ```

2. Na aba Grafana controlada, avaliar em ordem os arquivos
   `tmp/grafana-mesas-extract-2026-09-18_2026-09-20-chunk-N.js` e por fim
   `*-run.js`. O arquivo sem sufixo continua disponível para colar no Console.

3. O script executa uma chamada multi-query e guarda:

   ```js
   window.__mesasGrafana.network
   window.__mesasGrafana.dedicado
   window.__mesasGrafana.monthly
   ```

4. Salvar os dumps em:

   ```text
   tmp/grafana-mesas-network-2026-09-20.json
   tmp/grafana-mesas-dedicado-2026-09-20.json
   tmp/grafana-mesas-monthly-2026-09.json
   ```

5. Dry-run:

   ```bash
   node scripts/mesas-spin-run.mjs \
     --network=tmp/grafana-mesas-network-2026-09-20.json \
     --dedicado=tmp/grafana-mesas-dedicado-2026-09-20.json \
     --monthly=tmp/grafana-mesas-monthly-2026-09.json \
     --de=2026-09-18 --ate=2026-09-20 \
     --preencher-faltantes --dry-run
   ```

6. Gravar removendo `--dry-run` e acrescentando `--gravar`.

## Um comando local com cookie

Cookie Pomerium somente no `.env.gp-kpi`:

```env
GRAFANA_MESAS_COOKIE=...
```

Também é aceito `GRAFANA_GP_KPI_COOKIE`.

Carga até D-1:

```bash
node scripts/carga-mesas-spin.mjs
```

Reload explícito, datas inclusivas:

```bash
node scripts/carga-mesas-spin.mjs \
  --de=2026-09-01 --ate=2026-09-06
```

Somente gravar JSON já extraído:

```bash
node scripts/carga-mesas-spin.mjs --so-gravar \
  --network=tmp/grafana-mesas-network-2026-09-20.json \
  --dedicado=tmp/grafana-mesas-dedicado-2026-09-20.json \
  --monthly=tmp/grafana-mesas-monthly-2026-09.json \
  --de=2026-09-18 --ate=2026-09-20
```

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `grafana-mesas-spin-extract-browser.js` | SQL e transformação canônica |
| `grafana-mesas-spin-write-extract-expr.mjs` | prepara expressão do Browser |
| `grafana-mesas-spin-extract-node.mjs` | fallback local com cookie |
| `carga-mesas-spin.mjs` | janela, extract, gravação e validação |
| `mesas-spin-run.mjs` | entrada canônica do runner |
| `superset-mesas-spin-run.mjs` | implementação histórica interna compatível |

Os extractors `superset-mesas-spin-*` ficam disponíveis somente para diagnóstico
e rollback. Não fazem parte da rotina `/carga-mesas`.

## Validação

- Último dia Dedicada e Network = D-1.
- Apostas fecham exatamente.
- UAP diário e por jogo fecham; UAP diário não é soma dos jogos.
- Daily = soma das mesas após arredondamento.
- TO/GGR aceitam somente a tolerância histórica ±1/±2.
- Confirmar split EsportivaBet (inclui `goldebet` / `goldebetbr_*`) e zeros após o primeiro dia com histórico.

## Paridade certificada

Agosto/2026 completo:

- Network: 117 daily, 468 mesas e 468 UAP/jogo iguais ao Supabase; monthly
  existente também igual.
- Dedicada: 62 daily, 341 mesas e 217 UAP/jogo; apostas/UAP exatos e apenas
  diferenças ±1/±2 históricas em TO/GGR.
- Consultas de 31 dias: aproximadamente 7 segundos no total.

Lei operacional completa: `.cursor/rules/mesas-spin-carga.mdc`.
