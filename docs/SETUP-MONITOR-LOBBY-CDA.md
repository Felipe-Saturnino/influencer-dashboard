# Monitor de lobby — Casa de Apostas (CDA)

Posicionamento horário das mesas Spin nas categorias ao vivo do cassino CDA.

**Operação:** job na **Telecom** (`scripts/monitor-lobby-cda-run.mjs`) — mesmo modelo do Lobby Blaze.

| Documento | Público |
|-----------|---------|
| [TELECOM-MONITOR-LOBBY-CDA.md](./TELECOM-MONITOR-LOBBY-CDA.md) | Equipe Telecom (runbook + agendamento) |
| [CHECKLIST-MONITOR-LOBBY-CDA-INTERNO.md](./CHECKLIST-MONITOR-LOBBY-CDA-INTERNO.md) | Spin (deploy, SQL, validação) |

---

## API

```text
GET https://casadeapostas.bet.br/api/content/casino-categories?languageId=21
```

Requer header **`Cookie`** de sessão logada (`CDA_LOBBY_COOKIE`). Sem cookie → **HTTP 401**.

---

## Blaze vs CDA

| | Blaze | CDA |
|---|--------|-----|
| Formato | Lista plana `records` | Categorias + `competitions[]` |
| Provedor das mesas Spin | `Spin` | **`GamesGlobal`** no JSON |
| Posição | Global no live-casino | **Por categoria** (Roleta, Baccarat & Sic Bo, BlackJack & Poker) |
| Fetch | API pública (451 em datacenter) | Cookie obrigatório |

## IDs (`mesa_identificacao_operadora` / Gestão de Estúdios → ID CDA)

**Fonte preferida:** Gestão de Estúdios → mesa → campo **ID CDA** (`mesas_spin_operadora_identificacao` com `operadora_slug = casa_apostas`).  
**Legado:** coluna `mesas_spin_cadastro.mesa_identificacao_operadora` com `operadora_slug = casa_apostas`.

A Edge une as duas fontes (sem duplicar a mesma mesa Spin).

Script legado (mesas dedicadas): `scripts/manual-supabase-mesas-spin-cda-lobby-ids.sql`

| Mesa | `competition.id` |
|------|------------------|
| Roleta | 3304 |
| Speed Baccarat | 3305 |
| Blackjack 1 | 3302 |
| Blackjack VIP | 3303 |
| Blackjack 2 | 3306 |

### Como achar o ID no F12 (lobby CDA)

1. Abrir `https://www.casadeapostas.bet.br/br/casino` **logado**.
2. F12 → aba **Rede** (Network) → filtrar por: **`casino-categories`**.
3. Recarregar a página → clicar no request  
   `casino-categories?languageId=21` (API `GET …/api/content/casino-categories`).
4. Aba **Resposta** / Preview → array de categorias; em cada uma, `competitions[]`.
5. Para mesas Spin, filtrar `providerName` ≈ **GamesGlobal**.
6. O ID a cadastrar na Gestão de Estúdios é **`competition.id`** (número, ex. `3304`).  
   Alternativa aceita pela Edge: `externalIdentifier.identifier`.

Não usar o nome do ficheiro HTML da página — o payload útil é **só** a resposta JSON de `casino-categories`.

---

## Deploy Edge

```bash
supabase functions deploy monitor-lobby-cda
```

Secrets: `MONITOR_LOBBY_CDA_INGEST_SECRET` (recomendado), `CDA_LOBBY_CATEGORIES_URL` (opcional).

---

## Tabelas e Status Técnico

- `lobby_monitor_execucao`, `lobby_monitor_posicao` (`operadora_slug = casa_apostas`)
- `sync_logs.integracao_slug = lobby_cda`
- Integração **`lobby_cda`** — ação manual `—` (somente job Telecom)

---

## Arquivos Telecom

- `scripts/monitor-lobby-cda-run.mjs`
- `scripts/env.monitor-telecom-cda.example`
- `scripts/run-monitor-lobby-cda-telecom.ps1` (opcional, Windows)
