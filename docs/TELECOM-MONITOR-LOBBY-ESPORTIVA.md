# Telecom — Monitor Lobby Esportiva Bet

Job horário que lê a prateleira **Cassino Ao Vivo** da **home** Esportiva e envia o snapshot para a Edge `monitor-lobby-esportiva`.

**Agregador das mesas Spin:** Good Game Labs.  
IDs = `child[].id` da seção home — cadastrados em **Gestão de Estúdios → ID Esportiva Bet**.

---

## Endpoint correto (F12)

| Item | Valor |
|------|--------|
| Host | `https://painel.esportivabet.cloud` |
| Request | `GET /api/home-sections/public` |
| URL completa | `https://painel.esportivabet.cloud/api/home-sections/public` |
| Seção | `title` = **`Cassino Ao Vivo`** (`type` = `games-fixed`) |
| Ordem | índice de `child[]` (1º item = posição 1) |

**Não usar** `GET /api/casino-games/filter?categories[]=cassino-ao-vivo` — esse é o **catálogo completo** (~559 jogos) e gera posições ~100+ que **não** batem com a home.

### Como achar no DevTools

1. Abrir `https://esportiva.bet.br/` (home).
2. F12 → **Rede** → limpar → filtrar: `home-sections` ou `painel.esportivabet`.
3. Recarregar a página.
4. Abrir a resposta → achar o objeto com `"title":"Cassino Ao Vivo"`.
5. Em `child[]`, as mesas Spin (Good Game Labs) devem estar no **topo** (hoje P1–P4).

Mesas Spin esperadas (IDs atuais da home — atualizar Gestão de Estúdios se divergir):

| `id` (cadastrar) | Nome na home | Slug |
|------------------|--------------|------|
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro | `goodgame/futebol-brasileiro` |
| `good-game-v2:live-roulette` | Roulette | `goodgame/roulette` |
| `5685` | Blackjack | `goodgame/blackjack` |
| `good-game-v2:live-baccarat` | Baccarat | `goodgame/baccarat` |

**Nota Blackjack:** no catálogo BS2Bet o mesmo jogo aparece como `good-game-v2:live-blackjack`; na home o CMS usa **`5685`**. Preferir cadastrar **`5685`**. O monitor aceita os dois como alias.

---

## O que a Telecom precisa

| Item | Valor |
|------|--------|
| Script | `scripts/monitor-lobby-esportiva-run.mjs` |
| Wrapper Windows | `scripts/run-monitor-lobby-esportiva.ps1` |
| Frequência | A cada **1 hora** (`America/Sao_Paulo`) |
| Rede | Escritório / IP BR |
| Env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (mesmo `.env.monitor` do Blaze) |
| Cookie | **Não** precisa |

Defaults do script:

- URL: `https://painel.esportivabet.cloud/api/home-sections/public`
- Seção: `Cassino Ao Vivo`
- Override opcional: `ESPORTIVA_LOBBY_HOME_SECTIONS_URL`, `ESPORTIVA_LOBBY_HOME_SECTION_TITLE`

## Teste

```bash
node scripts/monitor-lobby-esportiva-run.mjs --dry-run
```

Esperado: `mesas_encontradas` alinhado aos IDs da home (P1–P4 para as quatro mesas Spin, se a curadoria da Esportiva mantiver o topo).

Produção:

```bash
node scripts/monitor-lobby-esportiva-run.mjs
```

Setup interno Spin: `docs/SETUP-MONITOR-LOBBY-ESPORTIVA.md`
