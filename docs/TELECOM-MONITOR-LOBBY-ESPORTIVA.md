# Telecom — Monitor Lobby Esportiva Bet

Job horário que lê o **Cassino ao Vivo** da Esportiva e envia o snapshot para a Edge `monitor-lobby-esportiva`.

**Agregador das mesas Spin:** Good Game Labs (`provider.slug = goodgame`).  
IDs no formato `good-game-v2:…` — cadastrados em **Gestão de Estúdios → ID Esportiva Bet**.

---

## Endpoint correto (F12)

| Item | Valor |
|------|--------|
| Host | `https://esportiva.bet.br` (página inicial) |
| Request | `GET /api/casino-games/filter` |
| Query | `categories[]=cassino-ao-vivo&per_page=50&page=N` |
| URL completa (página 1) | `https://esportiva.bet.br/api/casino-games/filter?categories%5B%5D=cassino-ao-vivo&per_page=50&page=1` |

**Não usar** requests com `categories[]=jogos-crash` — essa é outra seção da home (Aviator etc.) e **não** lista as mesas Spin.

### Como achar no DevTools

1. Abrir `https://esportiva.bet.br/` (ou a seção **Cassino Ao Vivo**).
2. F12 → **Rede** → limpar → filtrar: `casino-games` ou `filter`.
3. Recarregar / rolar até **Cassino Ao Vivo**.
4. Clicar no request cujo **Query String** tenha `categories[]` = **`cassino-ao-vivo`** (não `jogos-crash`).
5. Aba **Resposta** → em `data[]`, filtrar mentalmente por `provider.name` = **Good Game Labs**.

Mesas Spin esperadas na API (nomes técnicos; na UI podem aparecer como Roleta / Blackjack VIP / Baccarat VIP com logo Spin):

| `id` (cadastrar na plataforma) | `name` na API |
|--------------------------------|---------------|
| `good-game-v2:live-roulette` | Roulette |
| `good-game-v2:live-blackjack` | Blackjack |
| `good-game-v2:live-baccarat` | Baccarat |
| `good-game-v2:live-cardmatchup` | Futebol Brasileiro |

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

Defaults do script (já corretos):

- Base: `https://esportiva.bet.br/api/casino-games/filter`
- Query: `categories%5B%5D=cassino-ao-vivo&per_page=50`

## Teste

```bash
node scripts/monitor-lobby-esportiva-run.mjs --dry-run
```

Esperado: `mesas_encontradas` alinhado aos IDs Good Game Labs cadastrados.

Produção:

```bash
node scripts/monitor-lobby-esportiva-run.mjs
```

Setup interno Spin: `docs/SETUP-MONITOR-LOBBY-ESPORTIVA.md`
