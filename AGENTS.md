# Data Intelligence — índice do agente

Constituição **não** vive aqui. Este ficheiro só aponta a frente. Chat novo + skill no compositor do editor:

```
/carga-mesas Atualizar os dados até D-1.
/nova-feature {o que o usuário vê}
/verificacao {página, aba ou função}
```

O `/skill` **laranja** no input **é** a invocação. Alt+Enter / badge só na Agents Window — neste painel ignore.

| Frente | Skill | Lei (Read quando a frente estiver ativa) |
|--------|--------|------------------------------------------|
| Carga diária Mesas Spin | `/carga-mesas` | `.cursor/rules/mesas-spin-carga.mdc` |
| Página ou fluxo novo | `/nova-feature` | `global.mdc` + `brand-css-variables.mdc` + MDC da secção; `business.mdc` se for estúdio/operadora/mesa |
| Varredura de um item | `/verificacao` | `saude-da-plataforma.mdc` + MDC da secção |

Não misturar frentes no mesmo chat. Bugfix na mesma página: glob da secção basta, sem skill.

## Trilhos duros (sempre)

- **Git:** nunca `commit` / `push` / PR. Só o usuário. (`.cursor/rules/no-agent-git-commit.mdc`)
- **Carga:** nunca o dia corrente incompleto (D-0). `ATE` no Superset é exclusivo.
- **Operadora ≠ estúdio.** Sports Club não é `operadora_slug`. Split EsportivaBet: lei na carga, não agregar tudo em `esportiva_bet`.
- **UI nova:** reusar componentes canónicos; copy PT-BR. Não reinventar filtro/tabela/modal.

## Onde está o resto

- Domínio (estúdio, Dedicada/Network, glossário): `business.mdc`
- UI / permissões / fetch / copy: `global.mdc` + Brand
- Pasta da página: `.cursor/rules/<secao>.mdc` (`lives`, `dashboards`, `rh`, …)
- E-mail: `emails.mdc` · Lobby Telecom: `telecom.mdc`

Commit/push **não**. Alterações locais; o usuário publica.
