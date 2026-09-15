---
name: nova-feature
description: >-
  Implementa página ou feature nova na Data Intelligence no contrato Global +
  Brand + MDC da secção (PageKey, menu, Ajuda, filtros e tabelas canónicos).
  Usar com /nova-feature — não em verificação, bugfix pontual nem carga Mesas Spin.
disable-model-invocation: true
---

# Nova feature

Lei: **Read** `.cursor/rules/global.mdc`, `.cursor/rules/brand-css-variables.mdc` e o MDC da secção do alvo **antes** de codar. Não recopiar esses ficheiros aqui. `.cursor/rules/business.mdc` só se o domínio for estúdio, operadora ou mesa.

No **painel do editor**, Custom Mode não liga. Usar **Enter** numa mensagem:

```
/nova-feature {o que construir}
```

O `/nova-feature` laranja no campo **é** a invocação. Badge/Alt+Enter só na Agents Window.

## Instruções

1. Confirmar: **página nova** ou **feature em página existente**. Uma frase do que o usuário vê.
2. Read da lei (acima).
3. **Discutir primeiro** — viabilidade, desenho e impacto. **Não** criar/editar código até o usuário pedir expressamente para implementar.
4. **Só depois da aprovação explícita:** página nova → checklist Global (`PageKey`, `PAGES`, `menu.ts`, `ALL_PAGE_KEYS`, `App.tsx`, rotas se houver aba, permissões **Não** para não-admin, `usePermission`, `PageHeader` + subtítulo = label do menu, Ajuda/glossário, MDC da secção). Feature existente → não recriar a página; reusar filtros/tabela/modal canónicos; atualizar MDC da secção + Ajuda se o fluxo visível mudar.
5. Copy PT-BR. Não reinventar componentes que já existem (`CtaCriarButton`, `FiltroOperadoraSelect`, `useDataTableBlock`, …).
6. Após implementar: verificar o fluxo novo no browser. `typecheck` na superfície tocada.
7. Commit/push **não**. Não virar `/verificacao` neste chat.

## Fora desta frente

- Verificação / varredura → `/verificacao`
- Carga Mesas Spin → `/carga-mesas`
- Carga Grafana → `/carga-grafana`

## Exemplos

```
/nova-feature
Aba Jogadores no Streamers — cadastro TAP já existe; UI e cruzamento.
```

```
/nova-feature
Página nova na secção Estúdio: catálogo X.
```
