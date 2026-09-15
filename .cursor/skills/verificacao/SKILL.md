---
name: verificacao
description: >-
  Verificação de uma página ou função da Data Intelligence: lê o MDC da secção
  e o código (pasta + hooks), faz smoke completo e devolve uma tabela curta de
  achados. Usar quando o usuário disser /verificacao, verificação, varredura
  ou ligar o modo Verificação — não em feature nova nem em carga Mesas Spin.
disable-model-invocation: true
---

# Verificação

Skill de **frente**. A lei está em `.cursor/rules/saude-da-plataforma.mdc` — **Read** nesse chat **antes** de código, smoke ou tabela. Não recopiar o MDC aqui.

Preferir **Custom Mode**: `/verificacao` + Alt+Enter (Windows). Enter sozinho cola o skill só nesta mensagem.

## Instruções

1. Confirmar o **alvo** (uma página, aba, modal, fluxo ou função).
2. Read `.cursor/rules/saude-da-plataforma.mdc`.
3. Read o **MDC da secção** do alvo.
4. Ler o código: **pasta da página + hooks da página** (contrato no MDC). Não abrir `src/lib/**` nem componentes genéricos por default.
5. Smoke **completo** no staging (lista no MDC).
6. Devolver o cabeçalho + **tabela** (Item, Problema, Prioridade, Sugestão, Risco) — ideia geral, uma linha por célula. **Parar.** Não implementar até o usuário escolher.
7. Commit/push **não**.
8. Ciclo da campanha Verificação 2.0 nomeado → Read [historico-verificacao-2.md](historico-verificacao-2.md). Senão, não abrir.

## Fora desta frente

- Feature nova → glob da secção, não este skill.
- Carga Mesas Spin → `/carga-mesas`

## Exemplos

```
/verificacao
Agenda — filtros e calendário no modo Mês.
```

```
/verificacao
Ranking da aba Posicionamento (Overview Spin), operadora Blaze.
```
