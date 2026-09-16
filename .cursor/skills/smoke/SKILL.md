---
name: smoke
description: >-
  Smoke em staging do que acabou de ser implantado neste chat (feature, correção
  ou ajuste): pede login ao usuário, percorre os pontos no browser e reporta OK
  ou estranho/errado. Usar com /smoke — não substitui /verificacao nem carga Mesas/Grafana.
disable-model-invocation: true
---

# Smoke pós-implantação

Validação **rápida** do delta deste chat — não auditoria formal da plataforma.

No compositor:

```
/smoke
```

ou

```
/smoke {escopo em uma linha — rotas, modais, filtros}
```

O `/smoke` laranja no campo **é** a invocação.

## Instruções

1. **Escopo** — confirmar o que testar: mensagem do usuário, ou inferir do que foi implementado/corrigido neste chat (ficheiros e fluxo combinado).
2. **Login staging** — parar e **pedir ao usuário** login na plataforma (staging) no browser deste ambiente. Agente **não** usa credenciais/passkey. Esperar confirmação («logado», etc.).
3. **Browser MCP** — navegar e exercitar **todos** os pontos do escopo: abrir rota, filtros principais, ações (criar/editar/arquivar se aplicável), modais, permissão visível, empty state, erro óbvio na UI ou console quando relevante.
4. **Reportar** — **OK** ou lista curta do estranho/errado (copy, layout, dado, fluxo quebrado). **Não** corrigir em silêncio; fix só se o usuário pedir.
5. Commit/push **não**.

## vs `/verificacao`

| | `/smoke` | `/verificacao` |
|---|----------|----------------|
| Objetivo | Validar **o que este chat alterou** | Auditar **um item** fixo da plataforma |
| Lei | MDC da secção só se precisar de rota/permissão | `saude-da-plataforma.mdc` + MDC + tabela P1/P2 |
| Quando | Após «pode implementar» em qualquer chat de código | Campanha QA / varredura formal |

## Fora deste ritual

- Carga Mesas Spin → `/carga-mesas`
- Carga Grafana → `/carga-grafana`
- Auditoria completa com tabela de achados → `/verificacao`

## Exemplos

```
/smoke
Modal de arquivar na Agenda — confirmar + toast + lista atualiza.
```

```
/smoke
Ajuste no filtro de operadora da Overview Spin (aba Posicionamento).
```
