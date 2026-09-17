# Data Intelligence — índice do agente

Constituição **não** vive aqui. Este ficheiro só aponta a frente. Chat novo + skill no compositor do editor:

```
/carga-mesas Atualizar os dados até D-1.
/carga-grafana Atualizar até D-1.
/nova-feature {o que o usuário vê}
/verificacao {página, aba ou função}
/smoke Após implantar — login staging + testar o que mudou neste chat.
/atualizar-backlog Antes de fechar — propõe diff do fio deste chat.
```

O `/skill` **laranja** no input **é** a invocação. Alt+Enter / badge só na Agents Window — neste painel ignore.

| Frente | Skill | Lei (Read quando a frente estiver ativa) |
|--------|--------|------------------------------------------|
| Carga diária Mesas Spin | `/carga-mesas` | `.cursor/rules/mesas-spin-carga.mdc` |
| Carga diária Grafana (GP + sinais SM) | `/carga-grafana` | `.cursor/rules/grafana-carga.mdc` |
| Página ou fluxo novo | `/nova-feature` | `global.mdc` + `brand-css-variables.mdc` + MDC da secção; `business.mdc` se for estúdio/operadora/mesa |
| Varredura de um item | `/verificacao` | `saude-da-plataforma.mdc` + MDC da secção |
| Smoke pós-implantação | `/smoke` | Escopo do chat; MDC da secção se precisar rota/permissão |

Não misturar frentes no mesmo chat. Dois chats diários de carga: **Mesas** (`/carga-mesas`) e **Grafana** (`/carga-grafana`) — nunca os dois no mesmo compositor. **1 frente = 1 intenção** (várias páginas ok se for a mesma feature ou secção). Bugfix numa página: glob da secção basta, sem skill.

### Chats fixos (horizontais, sem skill)

Compositores permanentes — nomes no Cursor. Não misturar com carga Mesas/Grafana no mesmo chat.

| Nome do chat | Intenção | Lei (Grep + Read trecho; não Read global inteiro) |
|--------------|----------|---------------------------------------------------|
| **Ajuda** | Tutoriais, máscaras, tudo da secção Ajuda | MDCs da secção (ex. `geral`, conteúdo/ajuda); Brand se UI |
| **Ajustes MDC** | Padrão de plataforma (ex. modal → replicar) | `global.mdc` + Brand; **atualizar MDC antes** do rollout em código |
| **Ajustes Gerais** | Correções pequenas em qualquer área | MDC da secção do alvo + Grep em `global`; Brand se UI |
| **Ideias** | Caixa de entrada: ideias, débitos de UI, features ainda sem chat de implementação | `docs/IDEIAS.md` — gravar direto ao receber; perguntar só se a ideia estiver ambígua; **não** implementar neste compositor |

**Backlog:** no início do chat, Read `docs/BACKLOG.md`. Cargas diárias: secção **Locks** basta. Chat longo ao fechar: `/atualizar-backlog` (skill) — um fio por chat, não reescrever o ficheiro inteiro. **Ideias** (caixa permanente, outro ficheiro): Read `docs/IDEIAS.md` neste compositor; item a implementar aponta o ID noutro chat.

## Trilhos duros (sempre)

- **Git:** nunca `commit` / `push` / PR. Só o usuário. (`.cursor/rules/no-agent-git-commit.mdc`)
- **Código:** não criar nem editar ficheiros de produto até o usuário **pedir expressamente** para implementar (ex.: «pode implementar», «aplica», «pode gravar»). Antes disso: discutir ideia, viabilidade e desenho para ele **aprovar**. Cargas `/carga-mesas` e `/carga-grafana` são exceção operacional — extract e gravação no Supabase seguem o MDC da frente.
- **Carga:** nunca o dia corrente incompleto (D-0). Mesas: `ATE` no Superset é exclusivo. Grafana: `--ate` inclusivo no extract, só até D-1.
- **Operadora ≠ estúdio.** Sports Club não é `operadora_slug`. Split EsportivaBet: lei na carga Mesas. Grafana: estúdio vem do cadastro Spin, não do filtro Studio do painel.
- **Segredo:** nunca colar cookie Pomerium/Grafana no chat ou git.
- **UI nova:** reusar componentes canónicos; copy PT-BR. Não reinventar filtro/tabela/modal.
- **Pós-implantação:** após «pode implementar» em qualquer chat de código, invocar **`/smoke`** — login staging (humano) → testar o que mudou → reportar; não commitar. Auditoria formal → `/verificacao`.

## Onde está o resto

- Domínio (estúdio, Dedicada/Network, glossário): `business.mdc`
- UI / permissões / fetch / copy: `global.mdc` + Brand
- Pasta da página: `.cursor/rules/<secao>.mdc` (`lives`, `dashboards`, `rh`, …)
- Carga Grafana (detalhe): `grafana-carga.mdc` · setup: `docs/SETUP-GP-KPI-GRAFANA.md`
- Fios abertos / pausados: `docs/BACKLOG.md`
- Ideias / débitos / features sem chat: `docs/IDEIAS.md`
- E-mail: `emails.mdc` · Lobby Telecom: `telecom.mdc`

Commit/push **não**. Alterações locais; o usuário publica.
