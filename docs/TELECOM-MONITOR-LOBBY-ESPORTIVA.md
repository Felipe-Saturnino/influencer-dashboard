# Telecom — Monitor Lobby Esportiva Bet

Job horário que lê o Cassino ao Vivo da Esportiva (`api-esportiva-betbr.bs2bet.com`) e envia o snapshot para a Edge `monitor-lobby-esportiva` gravar em `lobby_monitor_*`.

**Agregador:** Good Game Labs (GG Labs). IDs no formato `good-game-v2:…` cadastrados em **Gestão de Estúdios → ID Esportiva Bet**.

## O que a Telecom precisa

| Item | Valor |
|------|--------|
| Script | `scripts/monitor-lobby-esportiva-run.mjs` |
| Wrapper Windows | `scripts/run-monitor-lobby-esportiva.ps1` |
| Frequência | A cada **1 hora** (fuso `America/Sao_Paulo`) |
| Rede | Escritório / IP BR (se a API bloquear datacenter — mesmo padrão Blaze) |
| Env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mesmo `.env.monitor` do Blaze/CDA) |
| Cookie | **Não** precisa (diferente da CDA) |

## Teste

```bash
node scripts/monitor-lobby-esportiva-run.mjs --dry-run
```

Esperado: `mesas_encontradas` = quantidade de IDs cadastrados (ou `parcial` se algum ID não aparecer no filtro).

Produção (grava):

```bash
node scripts/monitor-lobby-esportiva-run.mjs
```

## Query da API

Default: `category=cassino-ao-vivo` em  
`https://api-esportiva-betbr.bs2bet.com/v2/casino-games/filter`

Se o F12 mostrar outro parâmetro, sobrescrever:

```env
ESPORTIVA_LOBBY_FILTER_QUERY=...
```

## Spin (já feito no repo)

- Edge `monitor-lobby-esportiva`
- Migration `integrations` slug `lobby_esportiva`
- UI Posicionamento + Status Técnico

Setup interno: `docs/SETUP-MONITOR-LOBBY-ESPORTIVA.md`
