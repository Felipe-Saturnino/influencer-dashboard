# Testes automatizados

Esta pasta concentra a suíte **Vitest** + **Testing Library**. Não é necessário ambiente Supabase de staging: testes usam **lógica pura**, **mocks** (`tests/mocks/`) ou **jsdom** para UI isolada.

## Comandos

| Comando | Uso |
|--------|-----|
| `npm test` | Roda toda a suíte uma vez (CI e pré-push). |
| `npm run test:watch` | Reexecuta ao salvar arquivos (desenvolvimento). |
| `npm run test:coverage` | Relatório de cobertura em `coverage/` (opcional). |

## Estrutura sugerida

```
tests/
  README.md          ← este arquivo
  setup.ts           ← jest-dom / config global
  mocks/             ← factories e vi.mock compartilhados
  unit/
    lib/             ← funções sem rede (helpers, paginação, guards)
    components/      ← React com RTL
  integration/       ← (futuro) vários módulos mockados juntos
```

Colocar `*.test.ts(x)` em `src/` também é válido (co-localização); o Vitest inclui ambos os padrões.

## Como garantir que “de tempos em tempos” rode tudo

1. **Todo push / PR** — o workflow `.github/workflows/ci.yml` executa `lint`, `test` e `build`. Falhou = não merge sem corrigir (política do time).

2. **Agendamento (cron)** — o workflow `.github/workflows/quality-periodic.yml` roda **semanalmente** (ajuste o `cron` se quiser) a mesma bateria: dependências instaladas + lint + test + build. Útil para pegar regressões quando o repositório fica quieto. Pode disparar manualmente em **Actions → Quality periodic → Run workflow**.

3. **Localmente antes de commitar** — `npm test` (rápido) ou o mesmo trio do CI.

Nenhum desses fluxos chama o Supabase real: variáveis `VITE_*` no CI são placeholders só para o bundler; os testes atuais não fazem rede.

## Expandindo a suíte (prioridades)

1. **Helpers e lib** (`fmtBRL`, `fetchAllPages`, validadores) — máximo retorno, zero mock.
2. **Hooks** — `renderHook` do RTL + mock de `supabase`.
3. **Páginas grandes** — fatiar: uma função extraída testável por vez, depois componente pequeno.

Quando existir projeto Supabase de **preview/staging**, dá para acrescentar uma job opcional de E2E (Playwright) contra essa URL, sem misturar com produção.
